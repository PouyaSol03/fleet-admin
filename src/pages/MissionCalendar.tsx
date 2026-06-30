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
import { HiOutlineDocumentDuplicate, HiOutlineTrash } from 'react-icons/hi2';
import { extractApiError, normalizeCollection } from '../utils/formatters';
import MissionForm from '../components/dashboardlayout/MissionForm';
import {
  AccessDenied,
  ConfirmationModal,
  ErrorAlert,
  LoadingState,
  Modal,
  PrimaryButton,
  SecondaryButton,
} from '../components/shared/UI';

const statusLabel = {
  planned: 'برنامه‌ریزی شده',
  active: 'فعال',
  done: 'انجام شده',
  canceled: 'لغو شده',
};

const statusClassName = {
  planned: 'fc-mission-planned',
  active: 'fc-mission-active',
  done: 'fc-mission-done',
  canceled: 'fc-mission-canceled',
};

const statusColors = {
  planned: '#d97706',
  active: '#2563eb',
  done: '#059669',
  canceled: '#dc2626',
};

const emptyForm = {
  title: '',
  driverId: '',
  vehicleId: '',
  vehicleType: 'in_city',
  missionType: 'single',
  isSpecial: false,
  origin: '',
  destination: '',
  pickupPointsText: '',
  dropoffPointsText: '',
  peopleCount: '1',
  passengerIds: [],
  startDate: '',
  endDate: '',
  status: 'planned',
  firstCost: '0',
  notes: '',
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

function joinStops(values) {
  return Array.isArray(values) ? values.join('\n') : '';
}

function parseStops(value) {
  return String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function MissionCalendar() {
  const { user } = useAuth();
  const calendarRef = useRef(null);
  const canView = hasPermission(user, 'missions.view');
  const canCreate = hasPermission(user, 'missions.create');
  const canUpdate = hasPermission(user, 'missions.update');
  const canDelete = hasPermission(user, 'missions.delete');

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

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

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
        status: copySource.status || 'planned', 
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
    const loadDependencies = async () => {
      try {
        const [vehiclesRes, driversRes, usersRes] = await Promise.all([
          vehiclesAPI.list(),
          usersAPI.listDrivers(),
          usersAPI.list()
        ]);
        if (mounted) {
          setVehicles(normalizeCollection(vehiclesRes.data));
          setDrivers(normalizeCollection(driversRes.data));
          setUsers(normalizeCollection(usersRes.data));
        }
      } catch {
        if (mounted) setVehicles([]);
      }
    };
    loadDependencies();
    return () => { mounted = false; };
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
    return () => { mounted = false; };
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
    setIsCreateMode(false);
    
    setFormData({
      title: mission.title || '',
      driverId: mission.driverId ? String(mission.driverId) : '',
      vehicleId: mission.vehicleId ? String(mission.vehicleId) : '',
      vehicleType: mission.vehicleType || 'in_city',
      missionType: mission.missionType || 'single',
      isSpecial: Boolean(mission.isSpecial),
      origin: mission.origin || '',
      destination: mission.destination || '',
      pickupPointsText: joinStops(mission.pickupPoints),
      dropoffPointsText: joinStops(mission.dropoffPoints),
      peopleCount: String(mission.peopleCount ?? 1),
      passengerIds: Array.isArray(mission.passengerIds) ? mission.passengerIds.map(String) : [],
      startDate: formatDateOnly(mission.startDate),
      endDate: mission.endDate ? formatDateOnly(mission.endDate) : '',
      status: mission.status || 'planned',
      firstCost: String(mission.firstCost ?? 0),
      notes: mission.notes || '',
    });
    setStatusError('');
  };

  const handleDateClick = (arg) => {
    if (copySource) {
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
    } else if (canCreate) {
      setIsCreateMode(true);
      setSelectedMission({ id: 'new' }); 
      setFormData({
        ...emptyForm,
        startDate: formatDateOnly(arg.dateStr || arg.date),
      });
      setStatusError('');
    }
  };

  const handleEventClassNames = (arg) => {
    const status = arg.event.extendedProps.status;
    const baseClass = statusClassName[status] || 'fc-mission-planned';
    
    if (arg.event.extendedProps.isGhost) {
      return ['fc-mission-event', 'fc-mission-copy-preview', baseClass];
    }
    return ['fc-mission-event', baseClass];
  };

  const handleEventDidMount = (info) => {
    if (info.event.extendedProps.isGhost) {
      const status = info.event.extendedProps.status || 'planned';
      const color = statusColors[status] || '#d97706';
      
      info.el.style.setProperty('background-color', 'rgba(255, 255, 255, 0.4)', 'important');
      info.el.style.setProperty('border', `2px dashed ${color}`, 'important');
      info.el.style.setProperty('opacity', '0.55', 'important');
      info.el.style.setProperty('color', color, 'important');
    }
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

  const handleInitiateDelete = (e, missionId) => {
    e.stopPropagation();
    if (!canDelete) return;

    const mission = missionMap.get(String(missionId));
    if (!mission) return;

    setDeleteTarget(mission);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await missionsAPI.delete(deleteTarget.id);
      setDeleteTarget(null);
      if (range.start && range.end) {
        await loadMissions(range.start, range.end);
      }
    } catch (err) {
      setError(extractApiError(err, 'حذف ماموریت انجام نشد.'));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const renderEventContent = (eventInfo) => {
    const status = eventInfo.event.extendedProps.status;
    const driverName = eventInfo.event.extendedProps.driverName;
    const vehicleModel = eventInfo.event.extendedProps.vehicleModel;
    const isGhost = eventInfo.event.extendedProps.isGhost;

    return (
      <div className="mission-calendar-event-content group relative w-full pr-1 pl-14 text-right">
        <div className="mission-calendar-event-title font-bold text-ellipsis overflow-hidden whitespace-nowrap">
          {eventInfo.event.title}
        </div>
        <div className="mission-calendar-event-meta flex flex-wrap gap-x-1 text-[10px]">
          <span>{driverName}</span>
          <span>{statusLabel[status] || status || '-'}</span>
        </div>
        <div className="mission-calendar-event-vehicle text-[10px] opacity-90">{vehicleModel}</div>

        {!isGhost && !copySource && (
          <div className="absolute left-1 bottom-1 flex items-center gap-1 opacity-0 transition-all duration-200 group-hover:opacity-100">
            {canCreate && (
              <button
                type="button"
                onClick={(e) => handleInitiateCopy(e, eventInfo.event.id)}
                className="rounded-md bg-white border border-slate-200 p-1 text-slate-500 shadow-sm hover:scale-105 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 flex items-center justify-center"
                title="کپی کردن این ماموریت"
              >
                <HiOutlineDocumentDuplicate className="h-3.5 w-3.5" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={(e) => handleInitiateDelete(e, eventInfo.event.id)}
                className="rounded-md bg-white border border-slate-200 p-1 text-slate-400 shadow-sm hover:scale-105 hover:bg-red-50 hover:border-red-300 hover:text-red-600 flex items-center justify-center"
                title="حذف ماموریت"
              >
                <HiOutlineTrash className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const saveMission = async (e) => {
    if (e) e.preventDefault();
    if (!isCreateMode && (!selectedMission || !canUpdate)) return;
    if (isCreateMode && !canCreate) return;

    if (!formData.driverId || !formData.vehicleId) {
      setStatusError('انتخاب راننده و خودروی مربوط برای ساخت ماموریت الزامی است.');
      return;
    }
    if (!formData.origin.trim() || !formData.destination.trim() || !formData.startDate) {
      setStatusError('مبدا، مقصد و تاریخ شروع ماموریت را کامل کنید.');
      return;
    }
    if (Number(formData.peopleCount || 0) < 1) {
      setStatusError('تعداد نفرات باید حداقل ۱ باشد.');
      return;
    }
    if (!formData.passengerIds.length) {
      setStatusError('حداقل یک مسافر برای ماموریت انتخاب کنید.');
      return;
    }
    if (Number(formData.firstCost || 0) < 0) {
      setStatusError('هزینه اولیه نمی‌تواند منفی باشد.');
      return;
    }

    const payload = {
      title: formData.title.trim() || (isCreateMode ? 'ماموریت بدون عنوان' : selectedMission.title),
      driverId: formData.driverId ? Number(formData.driverId) : null,
      vehicleId: formData.vehicleId ? Number(formData.vehicleId) : null,
      vehicleType: formData.vehicleType,
      missionType: formData.missionType,
      isSpecial: Boolean(formData.isSpecial),
      origin: formData.origin.trim(),
      destination: formData.destination.trim(),
      pickupPoints: parseStops(formData.pickupPointsText),
      dropoffPoints: parseStops(formData.dropoffPointsText),
      peopleCount: Number(formData.peopleCount),
      passengerIds: formData.passengerIds.map(Number),
      startDate: formData.startDate,
      endDate: formData.endDate || null,
      status: formData.status,
      firstCost: Number(formData.firstCost || 0),
      notes: formData.notes.trim(),
    };

    try {
      setStatusLoading(true);
      setStatusError('');
      
      if (isCreateMode) {
        await missionsAPI.create(payload);
      } else {
        await missionsAPI.update(selectedMission.id, payload);
      }

      if (range.start && range.end) {
        await loadMissions(range.start, range.end);
      }
      setSelectedMission(null);
      setIsCreateMode(false);
    } catch (err) {
      setStatusError(extractApiError(err, 'ذخیره تغییرات ماموریت انجام نشد.'));
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
      firstCost: Number(mission.firstCost || 0),
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
      
      const isCopy = dropInfo.jsEvent?.ctrlKey || dropInfo.jsEvent?.metaKey;

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
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 p-4 md:flex-row md:items-center md:justify-between shrink-0">
        <div className="flex flex-col text-right">
          <h1 className="text-xl font-black text-slate-800">تقویم ماموریت‌ها</h1>
          <p className="text-xs text-slate-500 mt-1">مدیریت، تخصیص خودرو و زمان‌بندی هوشمند ناوگان</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3" dir="rtl">
          <div className="inline-flex rounded-xl bg-white border border-slate-200 p-0.5 shadow-sm">
            <button type="button" onClick={() => changeCalendarView('dayGridMonth')} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${calendarView === 'dayGridMonth' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>ماهانه</button>
            <button type="button" onClick={() => changeCalendarView('timeGridWeek')} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${calendarView === 'timeGridWeek' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>هفتگی</button>
            <button type="button" onClick={() => changeCalendarView('timeGridDay')} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${calendarView === 'timeGridDay' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>روزانه</button>
          </div>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <span className="min-w-[120px] text-center text-sm font-black text-slate-700">{calendarTitle}</span>
          <div className="inline-flex rounded-xl bg-white border border-slate-200 p-0.5 shadow-sm" dir="ltr">
            <button type="button" onClick={() => navigateCalendar('next')} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-50 transition">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button type="button" onClick={() => navigateCalendar('today')} className="rounded-lg px-3 py-1.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50 transition">امروز</button>
            <button type="button" onClick={() => navigateCalendar('prev')} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-50 transition">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="absolute right-4 top-20 z-20 min-w-[220px] max-w-[min(520px,calc(100vw-2rem))]">
        <ErrorAlert message={error} />
      </div>

      <div className="relative h-full min-h-0 w-full">
        {loading && !events.length ? <LoadingState message="در حال بارگذاری تقویم..." /> : null}
        {actionLoading ? <LoadingState message="در حال اعمال تغییرات..." /> : null}
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
            eventDidMount={handleEventDidMount}
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
                  <span className="text-xs font-extrabold text-blue-900">کپی چندگانه فعال شود</span>
                  <span className="text-[10px] text-blue-600">انتخاب چندین روز در تقویم</span>
                </div>
              </label>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800">حالت کپی: {copySource.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {targetDates.length === 0 ? 'روی روزهای موردنظر در تقویم کلیک کنید.' : `آماده کپی در ${targetDates.length} تاریخ انتخاب شده`}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 shrink-0">
              <SecondaryButton type="button" onClick={handleCancelCopy}>انصراف</SecondaryButton>
              <PrimaryButton type="button" disabled={targetDates.length === 0} onClick={handleFinalizeCopy}>تایید کپی نهایی</PrimaryButton>
            </div>
          </div>
        ) : null}
      </div>

      <Modal
        open={Boolean(selectedMission)}
        title={isCreateMode ? 'ایجاد ماموریت جدید' : 'مدیریت و ویرایش ماموریت'}
        onClose={() => { setSelectedMission(null); setIsCreateMode(false); }}
        bodyClassName="flex flex-col overflow-hidden p-0"
        panelClassName="h-[92dvh]"
      >
        <ErrorAlert message={statusError} />
        <MissionForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={saveMission}
          onCancel={() => { setSelectedMission(null); setIsCreateMode(false); }}
          vehicles={vehicles}
          drivers={drivers}
          users={users}
          isCreateMode={isCreateMode}
          submitting={statusLoading}
          displayTitle={selectedMission?.title}
        />
      </Modal>

      <ConfirmationModal
        open={Boolean(deleteTarget)}
        mode="delete"
        message={`آیا از حذف ماموریت ${deleteTarget?.title || ''} اطمینان دارید؟`}
        loading={deleteSubmitting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
