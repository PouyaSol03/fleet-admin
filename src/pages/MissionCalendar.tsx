// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import faLocale from '@fullcalendar/core/locales/fa';
import { missionsAPI } from '../api/missions';
import { vehiclesAPI } from '../api/vehicles';
import { usersAPI } from '../api/users';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { HiOutlineDocumentDuplicate } from 'react-icons/hi2';
import { extractApiError, normalizeCollection } from '../utils/formatters';
import MissionForm from '../components/dashboardlayout/MissionForm';
import {
  AccessDenied,
  ErrorAlert,
  LoadingState,
  Modal,
  PrimaryButton,
  SecondaryButton,
} from '../components/shared/UI';

const statusLabel = { planned: 'برنامه‌ریزی شده', active: 'فعال', done: 'انجام شده', canceled: 'لغو شده' };
const statusClassName = { planned: 'fc-mission-planned', active: 'fc-mission-active', done: 'fc-mission-done', canceled: 'fc-mission-canceled' };

const emptyForm = {
  title: '', driverId: '', vehicleId: '', vehicleType: 'in_city', missionType: 'single',
  isSpecial: false, origin: '', destination: '', pickupPointsText: '', dropoffPointsText: '',
  peopleCount: '1', passengerIds: [], startDate: '', endDate: '', status: 'planned', notes: '',
};

function formatDateOnly(value) { return String(value || '').slice(0, 10); }
function shiftDate(dateStr, days) {
  const date = new Date(String(dateStr).slice(0, 10));
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
function missionDurationDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate); const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}
function joinStops(values) { return Array.isArray(values) ? values.join('\n') : ''; }
function parseStops(value) { return String(value || '').split('\n').map((i) => i.trim()).filter(Boolean); }

export default function MissionCalendar() {
  const { user } = useAuth();
  const calendarRef = useRef(null);
  const canView = hasPermission(user, 'missions.view');
  const canCreate = hasPermission(user, 'missions.create');
  const canUpdate = hasPermission(user, 'missions.update');

  const [missions, setMissions] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [users, setUsers] = useState([]);
  const [range, setRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedMission, setSelectedMission] = useState(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [calendarTitle, setCalendarTitle] = useState('');
  const [calendarView, setCalendarView] = useState('dayGridMonth');

  const [copySource, setCopySource] = useState(null);
  const [targetDates, setTargetDates] = useState([]);
  const [isMultiCopyMode, setIsMultiCopyMode] = useState(false);

  const missionMap = useMemo(() => {
    const map = new Map();
    missions.forEach((m) => map.set(String(m.id), m));
    return map;
  }, [missions]);

  const events = useMemo(() => {
    const baseEvents = missions.map((m) => ({
      id: String(m.id),
      title: m.title || `ماموریت #${m.id}`,
      start: formatDateOnly(m.startDate),
      end: m.endDate ? shiftDate(formatDateOnly(m.endDate), 1) : undefined,
      allDay: true,
      extendedProps: { status: m.status, driverName: m.driverName || 'بدون راننده', vehicleModel: m.vehicleModel || 'بدون خودرو', isGhost: false },
    }));

    if (!copySource || targetDates.length === 0) return baseEvents;
    const diffDays = missionDurationDays(copySource.startDate, copySource.endDate);
    const ghostEvents = targetDates.map((t) => ({
      id: t.id, title: `پیش‌نویس: ${copySource.title || `ماموریت #${copySource.id}`}`,
      start: t.date, end: shiftDate(t.date, diffDays + 1), allDay: true,
      extendedProps: { status: 'planned', driverName: copySource.driverName || 'بدون راننده', vehicleModel: copySource.vehicleModel || 'بدون خودرو', isGhost: true },
    }));
    return [...baseEvents, ...ghostEvents];
  }, [missions, copySource, targetDates]);

  const loadMissions = async (startDate, endDate) => {
    const response = await missionsAPI.list({ start_date_from: startDate, start_date_to: endDate, ordering: 'start_date' });
    setMissions(normalizeCollection(response.data));
  };

  useEffect(() => {
    if (!canView) return;
    let mounted = true;
    const loadDependencies = async () => {
      try {
        const [vRes, dRes, uRes] = await Promise.all([vehiclesAPI.list(), usersAPI.listDrivers(), usersAPI.list()]);
        if (mounted) { setVehicles(normalizeCollection(vRes.data)); setDrivers(normalizeCollection(dRes.data)); setUsers(normalizeCollection(uRes.data)); }
      } catch { if (mounted) setVehicles([]); }
    };
    loadDependencies();
    return () => { mounted = false; };
  }, [canView]);

  useEffect(() => {
    if (!canView || !range.start || !range.end) return;
    let mounted = true;
    const run = async () => {
      try { setLoading(true); setError(''); await loadMissions(range.start, range.end); }
      catch (err) { if (mounted) setError(extractApiError(err, 'بارگذاری تقویم ماموریت انجام نشد.')); }
      finally { if (mounted) setLoading(false); }
    };
    run();
    return () => { mounted = false; };
  }, [canView, range.start, range.end]);

  const handleDatesSet = (arg) => {
    const start = formatDateOnly(arg.startStr); const end = formatDateOnly(arg.endStr);
    setCalendarTitle(arg.view?.title || ''); setCalendarView(arg.view?.type || 'dayGridMonth');
    setRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  };

  const handleEventClick = (clickInfo) => {
    if (clickInfo.event.extendedProps.isGhost) {
      setTargetDates((prev) => prev.filter((item) => item.id !== clickInfo.event.id));
      return;
    }
    const mission = missionMap.get(clickInfo.event.id);
    if (!mission) return;

    setSelectedMission(mission);
    setIsCreateMode(false);
    setFormData({
      title: mission.title || '', driverId: mission.driverId ? String(mission.driverId) : '',
      vehicleId: mission.vehicleId ? String(mission.vehicleId) : '', vehicleType: mission.vehicleType || 'in_city',
      missionType: mission.missionType || 'single', isSpecial: Boolean(mission.isSpecial), origin: mission.origin || '',
      destination: mission.destination || '', pickupPointsText: joinStops(mission.pickupPoints), dropoffPointsText: joinStops(mission.dropoffPoints),
      peopleCount: String(mission.peopleCount ?? 1), passengerIds: Array.isArray(mission.passengerIds) ? mission.passengerIds.map(String) : [],
      startDate: formatDateOnly(mission.startDate), endDate: mission.endDate ? formatDateOnly(mission.endDate) : '',
      status: mission.status || 'planned', notes: mission.notes || '',
    });
    setStatusError('');
  };

  const handleDateClick = (arg) => {
    if (copySource) {
      const clickedDate = formatDateOnly(arg.dateStr || arg.date);
      const newTarget = { id: `ghost-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, date: clickedDate };
      setTargetDates((prev) => isMultiCopyMode ? [...prev, newTarget] : [newTarget]);
    } else if (canCreate) {
      setIsCreateMode(true);
      setSelectedMission({ id: 'new' });
      setFormData({ ...emptyForm, startDate: formatDateOnly(arg.dateStr || arg.date) });
      setStatusError('');
    }
  };

  const saveMission = async (e) => {
    if (e) e.preventDefault();
    const payload = {
      title: formData.title.trim() || (isCreateMode ? 'ماموریت بدون عنوان' : selectedMission.title),
      driverId: formData.driverId ? Number(formData.driverId) : null,
      vehicleId: formData.vehicleId ? Number(formData.vehicleId) : null,
      vehicleType: formData.vehicleType, missionType: formData.missionType, isSpecial: Boolean(formData.isSpecial),
      origin: formData.origin.trim(), destination: formData.destination.trim(),
      pickupPoints: parseStops(formData.pickupPointsText), dropoffPoints: parseStops(formData.dropoffPointsText),
      peopleCount: Number(formData.peopleCount), passengerIds: formData.passengerIds.map(Number),
      startDate: formData.startDate, endDate: formData.endDate || null, status: formData.status, notes: formData.notes.trim(),
    };

    try {
      setStatusLoading(true); setStatusError('');
      if (isCreateMode) await missionsAPI.create(payload);
      else await missionsAPI.update(selectedMission.id, payload);
      if (range.start && range.end) await loadMissions(range.start, range.end);
      setSelectedMission(null); setIsCreateMode(false);
    } catch (err) { setStatusError(extractApiError(err, 'ذخیره تغییرات ماموریت انجام نشد.')); }
    finally { setStatusLoading(false); }
  };

  const buildCopyPayload = (mission, targetDate) => {
    const sStart = formatDateOnly(mission.startDate); const sEnd = formatDateOnly(mission.endDate);
    return {
      title: mission.title || `کپی ماموریت #${mission.id}`, driverId: mission.driverId || null, vehicleId: mission.vehicleId || null,
      vehicleType: mission.vehicleType || 'in_city', missionType: mission.missionType || 'single', isSpecial: Boolean(mission.isSpecial),
      origin: mission.origin || '', destination: mission.destination || '', pickupPoints: mission.pickupPoints || [], dropoffPoints: mission.dropoffPoints || [],
      peopleCount: Number(mission.peopleCount || 1), passengerIds: (mission.passengerIds || []).map(Number),
      startDate: targetDate, endDate: sEnd ? shiftDate(targetDate, missionDurationDays(sStart, sEnd)) : null, status: 'planned', notes: mission.notes || '',
    };
  };

  const handleFinalizeCopy = async () => {
    try {
      setActionLoading(true); setError('');
      await Promise.all(targetDates.map((t) => missionsAPI.create(buildCopyPayload(copySource, t.date))));
      setCopySource(null); setTargetDates([]); setIsMultiCopyMode(false);
      if (range.start && range.end) await loadMissions(range.start, range.end);
    } catch (err) { setError(extractApiError(err, 'عملیات کپی چندگانه ماموریت با خطا مواجه شد.')); }
    finally { setActionLoading(false); }
  };

  const handleEventDrop = async (dropInfo) => {
    const mission = missionMap.get(dropInfo.event.id);
    const targetDate = formatDateOnly(dropInfo.event.startStr || dropInfo.event.start);
    if (!mission || !targetDate) { dropInfo.revert(); return; }

    try {
      setActionLoading(true); setError('');
      if (Boolean(dropInfo.jsEvent?.ctrlKey || dropInfo.jsEvent?.metaKey)) {
        if (!canCreate || !mission.vehicleId) { dropInfo.revert(); if (!mission.vehicleId) setError('ابتدا خودرو را انتخاب کنید.'); return; }
        await missionsAPI.create(buildCopyPayload(mission, targetDate)); dropInfo.revert();
      } else {
        if (!canUpdate) { dropInfo.revert(); return; }
        const sStart = formatDateOnly(mission.startDate); const sEnd = formatDateOnly(mission.endDate);
        await missionsAPI.update(mission.id, { startDate: targetDate, endDate: sEnd ? shiftDate(targetDate, missionDurationDays(sStart, sEnd)) : null });
      }
      if (range.start && range.end) await loadMissions(range.start, range.end);
    } catch (err) { dropInfo.revert(); setError(extractApiError(err, 'انجام عملیات ناموفق بود.')); }
    finally { setActionLoading(false); }
  };

  if (!canView) return <AccessDenied />;

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col bg-white">
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 p-4 md:flex-row md:items-center md:justify-between shrink-0">
        <div className="flex flex-col text-right">
          <h1 className="text-xl font-black text-slate-800">تقویم ماموریت‌ها</h1>
          <p className="text-xs text-slate-500 mt-1">مدیریت، تخصیص خودرو و زمان‌بندی هوشمند ناوگان</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3" dir="rtl">
          <div className="inline-flex rounded-xl bg-white border border-slate-200 p-0.5 shadow-sm">
            <button type="button" onClick={() => { const api = calendarRef.current?.getApi(); api?.changeView('dayGridMonth'); setCalendarView('dayGridMonth'); }} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${calendarView === 'dayGridMonth' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>ماهانه</button>
            <button type="button" onClick={() => { const api = calendarRef.current?.getApi(); api?.changeView('timeGridWeek'); setCalendarView('timeGridWeek'); }} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${calendarView === 'timeGridWeek' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>هفتگی</button>
            <button type="button" onClick={() => { const api = calendarRef.current?.getApi(); api?.changeView('timeGridDay'); setCalendarView('timeGridDay'); }} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${calendarView === 'timeGridDay' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>روزانه</button>
          </div>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <span className="min-w-[120px] text-center text-sm font-black text-slate-700">{calendarTitle}</span>
          <div className="inline-flex rounded-xl bg-white border border-slate-200 p-0.5 shadow-sm" dir="ltr">
            <button type="button" onClick={() => { const api = calendarRef.current?.getApi(); api?.next(); }} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-50 transition"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg></button>
            <button type="button" onClick={() => { const api = calendarRef.current?.getApi(); api?.today(); }} className="rounded-lg px-3 py-1.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50 transition">امروز</button>
            <button type="button" onClick={() => { const api = calendarRef.current?.getApi(); api?.prev(); }} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-50 transition"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></button>
          </div>
        </div>
      </div>

      <div className="absolute right-4 top-20 z-20 min-w-[220px] max-w-[min(520px,calc(100vw-2rem))]"><ErrorAlert message={error} /></div>

      <div className="relative h-full min-h-0 w-full">
        {loading && !events.length ? <LoadingState message="در حال بارگذاری تقویم..." /> : null}
        {actionLoading ? <LoadingState message="در حال اعمال تغییرات..." /> : null}
        <div className={`mission-calendar-board h-full w-full ${copySource ? 'cursor-crosshair' : ''}`} dir="rtl">
          <FullCalendar
            ref={calendarRef} plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]} initialView="dayGridMonth" locale={faLocale} direction="rtl" firstDay={6} height="100%" dayMaxEvents={4} fixedWeekCount
            editable={!copySource && (canUpdate || canCreate)} eventStartEditable={!copySource && (canUpdate || canCreate)} datesSet={handleDatesSet} eventDrop={handleEventDrop} dateClick={handleDateClick} events={events}
            eventClick={handleEventClick} eventClassNames={(arg) => arg.event.extendedProps.isGhost ? ['fc-mission-event', 'fc-mission-ghost'] : ['fc-mission-event', statusClassName[arg.event.extendedProps.status] || 'fc-mission-planned']}
            headerToolbar={false} nowIndicator
            eventContent={(info) => (
              <div className="mission-calendar-event-content group relative w-full pr-1 pl-7 text-right">
                <div className="mission-calendar-event-title font-bold text-ellipsis overflow-hidden whitespace-nowrap">{info.event.title}</div>
                <div className="mission-calendar-event-meta flex flex-wrap gap-x-1 text-[10px]"><span>{info.event.extendedProps.driverName}</span><span>{statusLabel[info.event.extendedProps.status] || '-'}</span></div>
                {canCreate && !info.event.extendedProps.isGhost && !copySource && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); const m = missionMap.get(info.event.id); if (!m?.vehicleId) { setError('ابتدا خودرو را انتخاب کنید.'); return; } setCopySource(m); setTargetDates([]); setIsMultiCopyMode(false); }} className="absolute left-1 bottom-1 rounded-md bg-white border border-slate-200 p-1 text-slate-500 opacity-0 shadow-sm transition hover:scale-105 hover:bg-blue-50 group-hover:opacity-100 flex items-center justify-center" title="کپی کردن"><HiOutlineDocumentDuplicate className="h-3.5 w-3.5" /></button>
                )}
              </div>
            )}
          />
        </div>
      </div>

      {copySource && (
        <div className="absolute inset-x-0 bottom-5 z-30 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto flex w-full max-w-[720px] flex-col gap-4 rounded-2xl border border-blue-200 bg-white p-4 shadow-2xl md:flex-row md:items-center md:justify-between ring-4 ring-blue-50">
            <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
              <label className="flex items-center gap-3 cursor-pointer select-none rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-2.5 transition hover:bg-blue-50 shrink-0">
                <input type="checkbox" checked={isMultiCopyMode} onChange={(e) => setIsMultiCopyMode(e.target.checked)} className="h-5 w-5 rounded border-blue-400 text-blue-600 focus:ring-blue-500" />
                <div className="flex flex-col text-right"><span className="text-xs font-extrabold text-blue-900">کپی چندگانه فعال شود</span></div>
              </label>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800">حالت کپی: {copySource.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{targetDates.length === 0 ? 'روی روزهای موردنظر در تقویم کلیک کنید.' : `${targetDates.length} تاریخ انتخاب شده`}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 shrink-0">
              <SecondaryButton type="button" onClick={() => { setCopySource(null); setTargetDates([]); }}>انصراف</SecondaryButton>
              <PrimaryButton type="button" disabled={targetDates.length === 0} onClick={handleFinalizeCopy}>تایید کپی نهایی</PrimaryButton>
            </div>
          </div>
        </div>
      )}

      <Modal open={Boolean(selectedMission)} title={isCreateMode ? 'ایجاد ماموریت جدید' : 'مدیریت و ویرایش ماموریت'} onClose={() => { setSelectedMission(null); setIsCreateMode(false); }}>
        <ErrorAlert message={statusError} />
        <MissionForm
          formData={formData} setFormData={setFormData} onSubmit={saveMission} onCancel={() => { setSelectedMission(null); setIsCreateMode(false); }}
          vehicles={vehicles} drivers={drivers} users={users} isCreateMode={isCreateMode} submitting={statusLoading} displayTitle={selectedMission?.title}
        />
      </Modal>
    </div>
  );
}