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
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { extractApiError, formatDate, normalizeCollection } from '../utils/formatters';
import {
  AccessDenied,
  Badge,
  ErrorAlert,
  Field,
  LoadingState,
  Modal,
  PrimaryButton,
  Select,
  SecondaryButton,
} from '../components/shared/UI';

const statusLabel = {
  planned: 'برنامه‌ریزی شده',
  active: 'فعال',
  done: 'انجام شده',
  canceled: 'لغو شده',
};

const statusTone = {
  planned: 'amber',
  active: 'blue',
  done: 'emerald',
  canceled: 'red',
};

const statusClassName = {
  planned: 'fc-mission-planned',
  active: 'fc-mission-active',
  done: 'fc-mission-done',
  canceled: 'fc-mission-canceled',
};

function formatDateOnly(value) {
  return String(value || '').slice(0, 10);
}

function shiftDate(dateStr, days) {
  const date = new Date(String(dateStr).slice(0, 10));
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function missionDurationDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

export default function MissionCalendar() {
  const { user } = useAuth();
  const calendarRef = useRef(null);
  const canView = hasPermission(user, 'missions.view');
  const canCreate = hasPermission(user, 'missions.create');
  const canUpdate = hasPermission(user, 'missions.update');

  const [missions, setMissions] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [range, setRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMission, setSelectedMission] = useState(null);
  const [vehicleDraft, setVehicleDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [calendarTitle, setCalendarTitle] = useState('');
  const [calendarView, setCalendarView] = useState('dayGridMonth');

  const [copySource, setCopySource] = useState(null);
  const [targetDates, setTargetDates] = useState([]);
  const [isMultiCopyMode, setIsMultiCopyMode] = useState(false);

  const missionMap = useMemo(() => {
    const map = new Map();
    missions.forEach((mission) => map.set(String(mission.id), mission));
    return map;
  }, [missions]);

  const events = useMemo(() => {
    const baseEvents = missions.map((mission) => ({
      id: String(mission.id),
      title: mission.title || `ماموریت #${mission.id}`,
      start: formatDateOnly(mission.startDate),
      end: mission.endDate ? shiftDate(formatDateOnly(mission.endDate), 1) : undefined,
      allDay: true,
      extendedProps: {
        status: mission.status,
        driverName: mission.driverName || 'بدون راننده',
        vehicleModel: mission.vehicleModel || 'بدون خودرو',
        isGhost: false,
      },
    }));

    if (!copySource || targetDates.length === 0) return baseEvents;

    const diffDays = missionDurationDays(copySource.startDate, copySource.endDate);
    const ghostEvents = targetDates.map((target) => ({
      id: target.id,
      title: `پیش‌نویس: ${copySource.title || `ماموریت #${copySource.id}`}`,
      start: target.date,
      end: shiftDate(target.date, diffDays + 1),
      allDay: true,
      extendedProps: {
        status: 'planned',
        driverName: copySource.driverName || 'بدون راننده',
        vehicleModel: copySource.vehicleModel || 'بدون خودرو',
        isGhost: true,
      },
    }));

    return [...baseEvents, ...ghostEvents];
  }, [missions, copySource, targetDates]);

  const loadMissions = async (startDate, endDate) => {
    const response = await missionsAPI.list({
      start_date_from: startDate,
      start_date_to: endDate,
      ordering: 'start_date',
    });
    setMissions(normalizeCollection(response.data));
  };

  useEffect(() => {
    if (!canView) return;
    let mounted = true;
    const loadVehicles = async () => {
      try {
        const response = await vehiclesAPI.list();
        if (mounted) setVehicles(normalizeCollection(response.data));
      } catch {
        if (mounted) setVehicles([]);
      }
    };
    loadVehicles();
    return () => {
      mounted = false;
    };
  }, [canView]);

  useEffect(() => {
    if (!canView || !range.start || !range.end) return;
    let mounted = true;

    const run = async () => {
      try {
        setLoading(true);
        setError('');
        await loadMissions(range.start, range.end);
      } catch (err) {
        if (mounted) setError(extractApiError(err, 'بارگذاری تقویم ماموریت انجام نشد.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [canView, range.start, range.end]);

  const handleDatesSet = (arg) => {
    const start = formatDateOnly(arg.startStr);
    const end = formatDateOnly(arg.endStr);
    setCalendarTitle(arg.view?.title || '');
    setCalendarView(arg.view?.type || 'dayGridMonth');
    setRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  };

  const calendarApi = () => calendarRef.current?.getApi();

  const navigateCalendar = (action) => {
    const api = calendarApi();
    if (!api) return;
    api[action]();
    setCalendarTitle(api.view.title);
    setCalendarView(api.view.type);
  };

  const changeCalendarView = (viewName) => {
    const api = calendarApi();
    if (!api) return;
    api.changeView(viewName);
    setCalendarTitle(api.view.title);
    setCalendarView(api.view.type);
  };

  const handleEventClick = (clickInfo) => {
    if (clickInfo.event.extendedProps.isGhost) {
      const ghostId = clickInfo.event.id;
      setTargetDates((prev) => prev.filter((item) => item.id !== ghostId));
      return;
    }

    const mission = missionMap.get(clickInfo.event.id);
    if (!mission) return;
    setSelectedMission(mission);
    setVehicleDraft(mission.vehicleId ? String(mission.vehicleId) : '');
    setStatusDraft(mission.status || 'planned');
    setStatusError('');
  };

  const handleEventClassNames = (arg) => {
    if (arg.event.extendedProps.isGhost) {
      return ['fc-mission-event', 'fc-mission-ghost'];
    }
    const status = arg.event.extendedProps.status;
    return ['fc-mission-event', statusClassName[status] || 'fc-mission-planned'];
  };

  const handleInitiateCopy = (e, missionId) => {
    e.stopPropagation();
    if (!canCreate) return;
    
    const mission = missionMap.get(String(missionId));
    if (!mission) return;

    if (!mission.vehicleId) {
      setError('برای کپی ماموریت، ابتدا خودرو را برای ماموریت انتخاب کنید.');
      return;
    }

    setCopySource(mission);
    setTargetDates([]);
    setIsMultiCopyMode(false); 
    setError('');
  };

  const renderEventContent = (eventInfo) => {
    const status = eventInfo.event.extendedProps.status;
    const driverName = eventInfo.event.extendedProps.driverName;
    const vehicleModel = eventInfo.event.extendedProps.vehicleModel;
    const isGhost = eventInfo.event.extendedProps.isGhost;

    return (
      <div className="mission-calendar-event-content group relative w-full pr-1">
        <div className="mission-calendar-event-title font-bold text-ellipsis overflow-hidden whitespace-nowrap">
          {eventInfo.event.title}
        </div>
        <div className="mission-calendar-event-meta">
          <span>{driverName}</span>
          <span>{statusLabel[status] || status || '-'}</span>
        </div>
        <div className="mission-calendar-event-vehicle">{vehicleModel}</div>
        
        {/* دکمه با آیکون کپی دوتایی کاملاً استاندارد و انیمیشن هاور جذاب */}
        {canCreate && !isGhost && !copySource && (
          <button
            type="button"
            onClick={(e) => handleInitiateCopy(e, eventInfo.event.id)}
            className="absolute left-1 top-1/2 -translate-y-1/2 rounded-md bg-white border border-slate-200 p-1.5 text-slate-500 opacity-40 shadow-sm transition-all duration-200 hover:scale-110 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 hover:opacity-100 group-hover:opacity-100"
            title="کپی کردن این ماموریت"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376A8.965 8.965 0 0 0 12 12.75c-.497 0-.982.04-1.455.12l-.104.022m.753-1.64h1.455c.621 0 1.125.504 1.125 1.125V15M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </button>
        )}
      </div>
    );
  };

  const handleDateClick = (arg) => {
    if (!copySource) return;

    const clickedDate = formatDateOnly(arg.dateStr || arg.date);
    const newTarget = {
      id: `ghost-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      date: clickedDate
    };

    if (isMultiCopyMode) {
      setTargetDates((prev) => [...prev, newTarget]);
    } else {
      setTargetDates([newTarget]);
    }
  };

  const saveMission = async () => {
    if (!selectedMission || !canUpdate) return;
    try {
      setStatusLoading(true);
      setStatusError('');
      await missionsAPI.update(selectedMission.id, {
        status: statusDraft,
        vehicleId: vehicleDraft ? Number(vehicleDraft) : null,
      });
      if (range.start && range.end) {
        await loadMissions(range.start, range.end);
      }
      setSelectedMission((prev) => (prev ? {
        ...prev,
        status: statusDraft,
        vehicleId: vehicleDraft ? Number(vehicleDraft) : null,
      } : prev));
    } catch (err) {
      setStatusError(extractApiError(err, 'به‌روزرسانی ماموریت انجام نشد.'));
    } finally {
      setStatusLoading(false);
    }
  };

  const buildCopyPayload = (mission, targetDate) => {
    const sourceStart = formatDateOnly(mission.startDate);
    const sourceEnd = formatDateOnly(mission.endDate);
    const diffDays = missionDurationDays(sourceStart, sourceEnd);
    const computedEnd = sourceEnd ? shiftDate(targetDate, diffDays) : null;

    return {
      title: mission.title || `کپی ماموریت #${mission.id}`,
      driverId: mission.driverId || null,
      vehicleId: mission.vehicleId || null,
      vehicleType: mission.vehicleType || 'in_city',
      missionType: mission.missionType || 'single',
      isSpecial: Boolean(mission.isSpecial),
      origin: mission.origin || '',
      destination: mission.destination || '',
      pickupPoints: Array.isArray(mission.pickupPoints) ? mission.pickupPoints : [],
      dropoffPoints: Array.isArray(mission.dropoffPoints) ? mission.dropoffPoints : [],
      peopleCount: Number(mission.peopleCount || 1),
      passengerIds: Array.isArray(mission.passengerIds) ? mission.passengerIds.map(Number) : [],
      startDate: targetDate,
      endDate: computedEnd,
      status: 'planned',
      notes: mission.notes || '',
    };
  };

  const handleFinalizeCopy = async () => {
    if (!copySource || targetDates.length === 0) return;
    try {
      setActionLoading(true);
      setError('');

      const requests = targetDates.map((target) => {
        const payload = buildCopyPayload(copySource, target.date);
        return missionsAPI.create(payload);
      });

      await Promise.all(requests);

      setCopySource(null);
      setTargetDates([]);
      setIsMultiCopyMode(false);
      
      if (range.start && range.end) {
        await loadMissions(range.start, range.end);
      }
    } catch (err) {
      setError(extractApiError(err, 'عملیات کپی چندگانه ماموریت با خطا مواجه شد.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelCopy = () => {
    setCopySource(null);
    setTargetDates([]);
    setIsMultiCopyMode(false);
  };

  const handleEventDrop = async (dropInfo) => {
    const mission = missionMap.get(dropInfo.event.id);
    if (!mission) {
      dropInfo.revert();
      return;
    }

    const targetDate = formatDateOnly(dropInfo.event.startStr || dropInfo.event.start);
    if (!targetDate) {
      dropInfo.revert();
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      const isCopy = Boolean(dropInfo.jsEvent?.ctrlKey || dropInfo.jsEvent?.metaKey);

      if (isCopy) {
        if (!canCreate) {
          dropInfo.revert();
          return;
        }
        if (!mission.vehicleId) {
          dropInfo.revert();
          setError('برای کپی ماموریت، ابتدا خودرو را برای ماموریت انتخاب کنید.');
          return;
        }
        const payload = buildCopyPayload(mission, targetDate);
        await missionsAPI.create(payload);
        dropInfo.revert();
      } else {
        if (!canUpdate) {
          dropInfo.revert();
          return;
        }
        const sourceStart = formatDateOnly(mission.startDate);
        const sourceEnd = formatDateOnly(mission.endDate);
        const diffDays = missionDurationDays(sourceStart, sourceEnd);
        const computedEnd = sourceEnd ? shiftDate(targetDate, diffDays) : null;
        await missionsAPI.update(mission.id, { startDate: targetDate, endDate: computedEnd });
      }

      if (range.start && range.end) {
        await loadMissions(range.start, range.end);
      }
    } catch (err) {
      dropInfo.revert();
      setError(extractApiError(err, 'انجام عملیات روی ماموریت انجام نشد.'));
    } finally {
      setActionLoading(false);
    }
  };

  if (!canView) return <AccessDenied />;

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col bg-white">
      <div className="absolute right-4 top-4 z-20 min-w-[220px] max-w-[min(520px,calc(100vw-2rem))]">
        <ErrorAlert message={error} />
      </div>
      <div className="relative h-full min-h-0 w-full">
        {loading && !events.length ? <LoadingState message="در حال بارگذاری تقویم ماموریت..." /> : null}
        {actionLoading ? <LoadingState message="در حال اعمال تغییرات ماموریت..." /> : null}
        <div className={`mission-calendar-board h-full w-full ${copySource ? 'cursor-crosshair' : ''}`} dir="rtl">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={faLocale}
            direction="rtl"
            firstDay={6}
            height="100%"
            dayMaxEvents={4}
            fixedWeekCount
            editable={!copySource && (canUpdate || canCreate)}
            eventStartEditable={!copySource && (canUpdate || canCreate)}
            datesSet={handleDatesSet}
            eventDrop={handleEventDrop}
            dateClick={handleDateClick}
            events={events}
            eventContent={renderEventContent}
            eventClick={handleEventClick}
            eventClassNames={handleEventClassNames}
            views={{
              dayGridMonth: { dayMaxEvents: 3 },
              timeGridWeek: { dayMaxEvents: 8 },
              timeGridDay: { dayMaxEvents: 12 },
            }}
            headerToolbar={false}
            nowIndicator
          />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex justify-center px-4">
        {copySource ? (
          <div className="pointer-events-auto flex w-full max-w-[720px] flex-col gap-4 rounded-2xl border border-blue-200 bg-white p-4 shadow-2xl md:flex-row md:items-center md:justify-between transition-all duration-300 ring-4 ring-blue-50">
            <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
              <label className="flex items-center gap-3 cursor-pointer select-none rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-2.5 transition hover:bg-blue-50 group shrink-0">
                <div className="relative flex items-center">
                  <input 
                    type="checkbox"
                    checked={isMultiCopyMode}
                    onChange={(e) => setIsMultiCopyMode(e.target.checked)}
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-blue-400 bg-white checked:border-blue-600 checked:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 transition-all"
                  />
                  <svg className="absolute left-1 top-1 h-3 w-3 pointer-events-none stroke-white fill-none text-white opacity-0 peer-checked:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-xs font-extrabold text-blue-900">کپی چندگانه فعال باشد</span>
                  <span className="text-[10px] text-blue-600 mt-0.5">ثبت چندین ماموریت همزمان</span>
                </div>
              </label>

              <div className="text-right min-w-0">
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                  در حال کپی: <span className="text-blue-700 font-extrabold truncate max-w-[180px]">«{copySource.title || `ماموریت #${copySource.id}`}»</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                  {targetDates.length === 0 
                    ? 'روی روزهای تقویم کلیک کنید. (برای حذف هر پیش‌نویس، روی خودش کلیک کنید)' 
                    : `تعداد مقاصد آماده ثبت: ${targetDates.length} مورد`}
                </p>
              </div>
            </div>

            <div className="flex gap-2 shrink-0 justify-end border-t border-slate-100 pt-3 md:border-t-0 md:pt-0">
              <button type="button" onClick={handleCancelCopy} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-800">
                انصراف
              </button>
              <button type="button" onClick={handleFinalizeCopy} disabled={targetDates.length === 0} className="h-10 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none">
                تایید و ذخیره نهایی
              </button>
            </div>
          </div>
        ) : (
          <div className="pointer-events-auto flex w-full max-w-[820px] flex-col gap-3 rounded-[18px] border border-[#D9D9D9] bg-white/90 p-3 shadow-xl backdrop-blur-md md:flex-row md:items-center md:justify-between">
            <div className="flex items-center justify-center gap-2">
              <button type="button" onClick={() => navigateCalendar('prev')} className="h-10 rounded-[10px] border border-[#D9D9D9] bg-white px-3 text-sm font-semibold text-[#222222] transition hover:bg-[#EFEFEF]">
                قبلی
              </button>
              <button type="button" onClick={() => navigateCalendar('today')} className="h-10 rounded-[10px] border border-[#206AB4] bg-[#206AB4] px-4 text-sm font-semibold text-white transition hover:bg-[#15558F]">
                امروز
              </button>
              <button type="button" onClick={() => navigateCalendar('next')} className="h-10 rounded-[10px] border border-[#D9D9D9] bg-white px-3 text-sm font-semibold text-[#222222] transition hover:bg-[#EFEFEF]">
                بعدی
              </button>
            </div>
            <div className="min-w-0 text-center text-base font-bold text-[#222222] md:text-lg">
              {calendarTitle}
            </div>
            <div className="grid grid-cols-3 overflow-hidden rounded-[10px] border border-[#D9D9D9] bg-white">
              {[
                ['dayGridMonth', 'ماه'],
                ['timeGridWeek', 'هفته'],
                ['timeGridDay', 'روز'],
              ].map(([viewName, label]) => (
                <button
                  key={viewName}
                  type="button"
                  onClick={() => changeCalendarView(viewName)}
                  className={`h-10 px-4 text-sm font-semibold transition ${
                    calendarView === viewName
                      ? 'bg-[#206AB4] text-white'
                      : 'text-[#222222] hover:bg-[#EFEFEF]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal open={Boolean(selectedMission)} title="جزئیات ماموریت" onClose={() => setSelectedMission(null)}>
        {selectedMission ? (
          <div className="space-y-4">
            <ErrorAlert message={statusError} />
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                <p className="text-xs text-slate-500">عنوان</p>
                <p className="text-sm font-bold text-slate-900">{selectedMission.title || '-'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                <p className="text-xs text-slate-500">راننده</p>
                <p className="text-sm font-bold text-slate-900">{selectedMission.driverName || 'تعیین نشده'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                <p className="text-xs text-slate-500">تاریخ شروع</p>
                <p className="text-sm font-bold text-slate-900">{formatDate(selectedMission.startDate)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                <p className="text-xs text-slate-500">وضعیت فعلی</p>
                <Badge tone={statusTone[selectedMission.status] || 'slate'}>
                  {statusLabel[selectedMission.status] || selectedMission.status || '-'}
                </Badge>
              </div>
            </div>

            <Field label="خودرو ماموریت">
              <Select value={vehicleDraft} onChange={(event) => setVehicleDraft(event.target.value)}>
                <option value="">انتخاب خودرو</option>
                {vehicles.map((option) => (
                  <option key={option.id} value={String(option.id)}>
                    {option.model || 'خودرو'} - {option.plateNumber || 'بدون پلاک'}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <p className="mb-1 text-xs text-slate-500">مسیر</p>
              <p className="text-sm text-slate-700">{selectedMission.origin || '-'} ← {selectedMission.destination || '-'}</p>
            </div>

            {canUpdate ? (
              <div className="space-y-3">
                <Field label="تغییر وضعیت ماموریت">
                  <Select value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)}>
                    <option value="planned">برنامه‌ریزی شده</option>
                    <option value="active">فعال</option>
                    <option value="done">انجام شده</option>
                    <option value="canceled">لغو شده</option>
                  </Select>
                </Field>
                <div className="flex justify-end gap-2">
                  <SecondaryButton type="button" onClick={() => setSelectedMission(null)}>بستن</SecondaryButton>
                  <PrimaryButton type="button" onClick={saveMission} disabled={statusLoading}>
                    {statusLoading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                  </PrimaryButton>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <SecondaryButton type="button" onClick={() => setSelectedMission(null)}>بستن</SecondaryButton>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <style>{`
        .fc .fc-toolbar-title {
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
        }
        .fc .fc-button {
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #fff;
          color: #334155;
          box-shadow: none;
        }
        .fc .fc-button:hover {
          background: #f8fafc;
          color: #0f172a;
        }
        .fc .fc-button-primary:not(:disabled).fc-button-active,
        .fc .fc-button-primary:not(:disabled):active {
          background: #2563eb;
          border-color: #2563eb;
          color: #fff;
        }
        .fc .fc-daygrid-day-frame {
          min-height: 130px;
        }
        .fc .fc-col-header-cell-cushion {
          color: #5f6368;
          font-weight: 700;
          padding: 8px 0;
         }
        .fc .fc-daygrid-day-number {
          font-weight: 700;
          color: #334155;
        }
        .fc .fc-day-today {
          background: #eff6ff !important;
        }
        .fc .fc-daygrid-event.fc-mission-event,
        .fc .fc-h-event.fc-mission-event {
          border: 1px solid transparent !important;
          border-radius: 8px;
          padding: 2px 6px;
          font-size: 11px;
          line-height: 1.4;
          cursor: pointer;
          color: #111827 !important;
        }
        .fc .fc-daygrid-event.fc-mission-event .fc-event-main,
        .fc .fc-h-event.fc-mission-event .fc-event-main {
          color: inherit !important;
        }
        .fc .fc-daygrid-event.fc-mission-planned,
        .fc .fc-h-event.fc-mission-planned {
          background: #fffbeb !important;
          border-color: #fcd34d !important;
          color: #92400e !important;
        }
        .fc .fc-daygrid-event.fc-mission-active,
        .fc .fc-h-event.fc-mission-active {
          background: #eff6ff !important;
          border-color: #93c5fd !important;
          color: #1d4ed8 !important;
        }
        .fc .fc-daygrid-event.fc-mission-done,
        .fc .fc-h-event.fc-mission-done {
          background: #f0fdf4 !important;
          border-color: #86efac !important;
          color: #047857 !important;
        }
        .fc .fc-daygrid-event.fc-mission-canceled,
        .fc .fc-h-event.fc-mission-canceled {
          background: #fef2f2 !important;
          border-color: #fca5a5 !important;
          color: #b91c1c !important;
        }
        .fc .fc-daygrid-event.fc-mission-ghost,
        .fc .fc-h-event.fc-mission-ghost {
          background: rgba(37, 99, 235, 0.05) !important;
          border: 2px dashed #3b82f6 !important;
          color: #1d4ed8 !important;
          opacity: 0.85;
          pointer-events: auto !important;
          animation: pulseGhost 3s infinite ease-in-out;
        }
        .fc .fc-daygrid-event.fc-mission-ghost:hover {
          background: rgba(239, 68, 68, 0.1) !important;
          border-color: #ef4444 !important;
          color: #b91c1c !important;
        }
        .cursor-crosshair .fc-daygrid-day {
          cursor: crosshair !important;
        }
        @keyframes pulseGhost {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}