import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { vehiclesAPI } from '../api/vehicles';
import LicensePlateWithData from '../components/shared/LicensePlate';
import {
  AccessDenied,
  Badge,
  DataTable,
  ErrorAlert,
  Field,
  Input,
  Modal,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  ToolbarInput,
} from '../components/shared/UI';
import { useAuth } from '../context/AuthContext';
import { extractApiError, formatDate, formatNumber, normalizeCollection } from '../utils/formatters';
import { hasPermission } from '../utils/permissions';

type VehicleRow = {
  id: number;
  typeName?: string;
  groupName?: string;
  driverName?: string;
  model?: string;
  plateNumber?: string;
  status?: string;
  imei?: string;
  traccarDeviceId?: number | null;
};

type SummaryResponse = {
  reportType?: unknown;
  results?: unknown;
};

const statusTone: Record<string, 'emerald' | 'red' | 'amber' | 'blue' | 'slate'> = {
  active: 'emerald',
  inactive: 'red',
  maintenance: 'amber',
  on_mission: 'blue',
};

const statusLabel: Record<string, string> = {
  active: 'فعال',
  inactive: 'غیرفعال',
  maintenance: 'در تعمیر',
  on_mission: 'در ماموریت',
};

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toApiDateTime(date: string, endOfDay = false) {
  const time = endOfDay ? '23:59:59.999' : '00:00:00.000';
  return new Date(`${date}T${time}+03:30`).toISOString();
}

function parseReportValue(value: unknown): unknown {
  let current = value;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (typeof current !== 'string') return current;

    const trimmed = current.trim();
    if (!trimmed) return '';

    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return current;
    }

    try {
      current = JSON.parse(trimmed) as unknown;
    } catch {
      return current;
    }
  }

  return current;
}

type SummaryResult = {
  deviceId?: number;
  deviceName?: string;
  distance?: number;
  averageSpeed?: number;
  maxSpeed?: number;
  spentFuel?: number;
  startOdometer?: number;
  endOdometer?: number;
  startTime?: string;
  endTime?: string;
  startHours?: string | number;
  endHours?: string | number;
  engineHours?: string | number;
  [key: string]: unknown;
};

const reportTypeLabels: Record<string, string> = {
  summary: 'گزارش خلاصه',
};

function formatDecimal(value: unknown, maximumFractionDigits = 2) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '-';

  return new Intl.NumberFormat('fa-IR', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(numericValue);
}

function formatWithUnit(value: unknown, unit: string, maximumFractionDigits = 2) {
  const formatted = formatDecimal(value, maximumFractionDigits);
  return formatted === '-' ? '-' : `${formatted} ${unit}`;
}

function formatEngineDuration(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';

  if (typeof value === 'number') {
    return formatDecimal(value);
  }

  const raw = String(value).trim();
  if (!raw) return '-';

  const hoursMatch = raw.match(/(\d+(?:\.\d+)?)\s*h/i);
  const minutesMatch = raw.match(/(\d+(?:\.\d+)?)\s*m/i);

  if (!hoursMatch && !minutesMatch) return raw;

  const parts: string[] = [];
  if (hoursMatch) parts.push(`${formatDecimal(hoursMatch[1], 0)} ساعت`);
  if (minutesMatch) parts.push(`${formatDecimal(minutesMatch[1], 0)} دقیقه`);
  return parts.join(' و ');
}

function ReportMetric({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: ReactNode;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl border px-4 py-3 ${
        emphasized
          ? 'border-[#CFE2F6] bg-[#F3F8FD]'
          : 'border-[#E5E7EB] bg-[#F8FAFC]'
      }`}
    >
      <p className="text-xs font-medium text-[#737373]">{label}</p>
      <div className="mt-1.5 break-words text-base font-bold text-[#1F2937]">{value}</div>
    </div>
  );
}

function SummaryResultCards({ value }: { value: unknown }) {
  const parsed = parseReportValue(value);
  const results = Array.isArray(parsed)
    ? parsed.filter(
        (item): item is SummaryResult => Boolean(item) && typeof item === 'object' && !Array.isArray(item),
      )
    : parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? [parsed as SummaryResult]
      : [];

  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#D9D9D9] bg-[#F8FAFC] px-4 py-8 text-center text-sm text-[#737373]">
        داده‌ای برای این بازه زمانی وجود ندارد.
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {results.map((result, index) => (
        <article
          key={`${result.deviceId ?? 'device'}-${index}`}
          className="w-full overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF2F7] bg-[#FBFCFE] px-5 py-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#737373]">نام دستگاه</p>
              <h4 className="mt-1 truncate text-lg font-bold text-[#111827]" dir="ltr">
                {result.deviceName || '-'}
              </h4>
            </div>
            <div className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#475569]">
              <span className="text-xs text-[#737373]">شناسه دستگاه: </span>
              <strong>{result.deviceId !== undefined ? formatNumber(result.deviceId) : '-'}</strong>
            </div>
          </div>

          <div className="space-y-5 p-5">
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h5 className="text-sm font-bold text-[#111827]">خلاصه حرکت</h5>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ReportMetric
                  label="مسافت طی‌شده"
                  value={formatWithUnit(result.distance, 'کیلومتر')}
                  emphasized
                />
                <ReportMetric
                  label="سرعت متوسط"
                  value={formatWithUnit(result.averageSpeed, 'کیلومتر بر ساعت')}
                />
                <ReportMetric
                  label="حداکثر سرعت"
                  value={formatWithUnit(result.maxSpeed, 'کیلومتر بر ساعت')}
                />
                <ReportMetric
                  label="سوخت مصرف‌شده"
                  value={formatWithUnit(result.spentFuel, 'لیتر')}
                />
              </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-2">
              <section className="rounded-xl border border-[#E8EDF3] p-4">
                <h5 className="mb-3 text-sm font-bold text-[#111827]">کیلومترشمار</h5>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ReportMetric
                    label="کیلومترشمار در شروع"
                    value={formatWithUnit(result.startOdometer, 'کیلومتر')}
                  />
                  <ReportMetric
                    label="کیلومترشمار در پایان"
                    value={formatWithUnit(result.endOdometer, 'کیلومتر')}
                  />
                </div>
              </section>

              <section className="rounded-xl border border-[#E8EDF3] p-4">
                <h5 className="mb-3 text-sm font-bold text-[#111827]">بازه زمانی حرکت</h5>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ReportMetric label="زمان شروع" value={formatDate(result.startTime, true)} />
                  <ReportMetric label="زمان پایان" value={formatDate(result.endTime, true)} />
                </div>
              </section>
            </div>

            <section className="rounded-xl border border-[#E8EDF3] p-4">
              <h5 className="mb-3 text-sm font-bold text-[#111827]">کارکرد موتور</h5>
              <div className="grid gap-3 md:grid-cols-3">
                <ReportMetric
                  label="کارکرد ثبت‌شده در شروع"
                  value={formatEngineDuration(result.startHours)}
                />
                <ReportMetric
                  label="کارکرد ثبت‌شده در پایان"
                  value={formatEngineDuration(result.endHours)}
                />
                <ReportMetric
                  label="مدت کارکرد موتور"
                  value={formatEngineDuration(result.engineHours)}
                  emphasized
                />
              </div>
            </section>
          </div>
        </article>
      ))}
    </div>
  );
}

function VehiclesReportTableSkeleton() {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-[#E6E6E6] bg-white" aria-hidden="true">
      <div className="min-w-[72rem] animate-pulse">
        <div className="grid grid-cols-9 gap-4 border-b border-[#EFEFEF] bg-[#F8FAFC] px-4 py-4">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="h-3 w-4/5 rounded-full bg-[#E5E7EB]" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-9 items-center gap-4 border-b border-[#F1F5F9] px-4 py-4 last:border-b-0">
            {Array.from({ length: 9 }).map((_, cellIndex) => (
              <div key={cellIndex} className={`h-4 rounded-full bg-[#EEF2F7] ${cellIndex === 8 ? 'h-8 w-20 rounded-lg' : 'w-4/5'}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportModalSkeleton() {
  return (
    <div className="w-full animate-pulse" aria-hidden="true">
      <div className="w-full overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-[#EEF2F7] bg-[#FBFCFE] px-5 py-4">
          <div>
            <div className="h-3 w-16 rounded-full bg-[#E5E7EB]" />
            <div className="mt-2 h-5 w-28 rounded-full bg-[#E5E7EB]" />
          </div>
          <div className="h-9 w-32 rounded-lg bg-[#E5E7EB]" />
        </div>

        <div className="space-y-5 p-5">
          <div>
            <div className="mb-3 h-4 w-24 rounded-full bg-[#E5E7EB]" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-20 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC]" />
              ))}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 2 }).map((_, sectionIndex) => (
              <div key={sectionIndex} className="rounded-xl border border-[#E8EDF3] p-4">
                <div className="mb-3 h-4 w-24 rounded-full bg-[#E5E7EB]" />
                <div className="grid gap-3 sm:grid-cols-2">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="h-20 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC]" />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[#E8EDF3] p-4">
            <div className="mb-3 h-4 w-24 rounded-full bg-[#E5E7EB]" />
            <div className="grid gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-20 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VehicleReports() {
  const { user } = useAuth();
  const canView = hasPermission(user, 'reports.operational.view');
  const [rows, setRows] = useState<VehicleRow[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleRow | null>(null);
  const [fromDate, setFromDate] = useState(() => formatDateInput(new Date()));
  const [toDate, setToDate] = useState(() => formatDateInput(new Date()));
  const [report, setReport] = useState<SummaryResponse | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search), 400);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    if (!canView) return;

    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await vehiclesAPI.list(
          debouncedSearch.trim() ? { search: debouncedSearch.trim() } : undefined,
        );
        if (mounted) setRows(normalizeCollection<VehicleRow>(response.data));
      } catch (err) {
        if (mounted) setError(extractApiError(err, 'بارگذاری فهرست دستگاه‌ها انجام نشد.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [canView, debouncedSearch]);

  const fetchSummary = useCallback(async (vehicle: VehicleRow, from: string, to: string) => {
    if (!from || !to) {
      setReportError('بازه زمانی گزارش را انتخاب کنید.');
      return;
    }

    if (to < from) {
      setReportError('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.');
      return;
    }

    try {
      setReportLoading(true);
      setReportError('');
      const response = await vehiclesAPI.getTraccarReportSummary({
        vehicleId: vehicle.id,
        from: toApiDateTime(from),
        to: toApiDateTime(to, true),
      });
      setReport((response.data || {}) as SummaryResponse);
    } catch (err) {
      setReport(null);
      setReportError(extractApiError(err, 'دریافت گزارش دستگاه انجام نشد.'));
    } finally {
      setReportLoading(false);
    }
  }, []);

  const openReportModal = (vehicle: VehicleRow) => {
    const today = formatDateInput(new Date());
    setSelectedVehicle(vehicle);
    setFromDate(today);
    setToDate(today);
    setReport(null);
    setReportError('');
    setModalOpen(true);
    void fetchSummary(vehicle, today, today);
  };

  const handleReportSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedVehicle) return;
    void fetchSummary(selectedVehicle, fromDate, toDate);
  };

  const columns = useMemo(
    () => [
      { key: 'model', title: 'مدل' },
      {
        key: 'plateNumber',
        title: 'پلاک',
        render: (value: unknown) => <LicensePlateWithData numberplate={String(value || '')} readOnly />,
      },
      { key: 'imei', title: 'شناسه سخت‌افزاری' },
      {
        key: 'traccarDeviceId',
        title: 'شناسه ردیاب',
        render: (value: unknown) => (value ? formatNumber(value) : '-'),
      },
      { key: 'typeName', title: 'نوع خودرو' },
      { key: 'groupName', title: 'گروه' },
      { key: 'driverName', title: 'راننده' },
      {
        key: 'status',
        title: 'وضعیت',
        render: (value: unknown) => {
          const key = String(value || '');
          return <Badge tone={statusTone[key] || 'slate'}>{statusLabel[key] || key || '-'}</Badge>;
        },
      },
      {
        key: 'actions',
        title: 'گزارش',
        render: (_value: unknown, row: Record<string, unknown>) => (
          <PrimaryButton type="button" className="h-9 whitespace-nowrap" onClick={() => openReportModal(row as VehicleRow)}>
            مشاهده گزارش
          </PrimaryButton>
        ),
      },
    ],
    [],
  );

  if (!canView) return <AccessDenied />;

  const tableLoading = loading || search.trim() !== debouncedSearch.trim();

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <PageHeader
        title="گزارشات"
        description="انتخاب دستگاه یا خودرو و مشاهده گزارش ردیابی در بازه زمانی دلخواه"
      />

      <ErrorAlert message={error} />

      <SectionCard title="جستجو">
        <ToolbarInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="جستجو در مدل، پلاک، شناسه دستگاه یا راننده"
        />
      </SectionCard>

      <SectionCard title="فهرست دستگاه‌ها">
        {tableLoading ? (
          <VehiclesReportTableSkeleton />
        ) : (
          <DataTable
            columns={columns}
            rows={rows as unknown as Record<string, unknown>[]}
            emptyTitle="دستگاهی برای نمایش وجود ندارد."
          />
        )}
      </SectionCard>

      <Modal
        open={modalOpen}
        title={selectedVehicle ? `گزارش ${selectedVehicle.model || 'خودرو'}` : 'گزارش دستگاه'}
        onClose={() => setModalOpen(false)}
        panelClassName="max-w-6xl"
      >
        {selectedVehicle ? (
          <form onSubmit={handleReportSubmit} className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3">
                  <p className="text-xs font-bold text-[#737373]">مدل خودرو</p>
                  <p className="mt-2 text-sm font-semibold text-[#222222]">{selectedVehicle.model || '-'}</p>
                </div>
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3">
                  <p className="text-xs font-bold text-[#737373]">شناسه سخت‌افزاری</p>
                  <p className="mt-2 text-sm font-semibold text-[#222222]" dir="ltr">{selectedVehicle.imei || '-'}</p>
                </div>
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3">
                  <p className="text-xs font-bold text-[#737373]">شناسه ردیاب</p>
                  <p className="mt-2 text-sm font-semibold text-[#222222]">{selectedVehicle.traccarDeviceId ? formatNumber(selectedVehicle.traccarDeviceId) : '-'}</p>
                </div>
              </div>
              <LicensePlateWithData numberplate={selectedVehicle.plateNumber} readOnly />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="از تاریخ">
                <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
              </Field>
              <Field label="تا تاریخ">
                <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
              </Field>
            </div>

            <ErrorAlert message={reportError} />

            <div className="flex flex-wrap justify-end gap-3 border-b border-[#EFEFEF] pb-5">
              <SecondaryButton type="button" onClick={() => setModalOpen(false)} disabled={reportLoading}>
                بستن
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={reportLoading}>
                {reportLoading ? 'در حال دریافت...' : 'دریافت گزارش'}
              </PrimaryButton>
            </div>

            {reportLoading ? (
              <ReportModalSkeleton />
            ) : report ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-bold text-[#222222]">نتیجه گزارش</h4>
                  <Badge tone="blue">
                    {reportTypeLabels[String(parseReportValue(report.reportType) || '')] || 'گزارش'}
                  </Badge>
                </div>
                <SummaryResultCards value={report.results} />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#D9D9D9] bg-[#F8FAFC] px-4 py-8 text-center text-sm text-[#737373]">
                برای مشاهده اطلاعات، بازه زمانی را انتخاب و گزارش را دریافت کنید.
              </div>
            )}
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
