import { useCallback, useState, type FormEvent, type ReactNode } from 'react';
import { vehiclesAPI } from '../api/vehicles';
import { LicensePlate } from '../components/shared/LicensePlate';
import {
  AccessDenied,
  ErrorAlert,
  Field,
  Input,
  PageHeader,
  PrimaryButton,
  SectionCard,
} from '../components/shared/UI';
import { useAuth } from '../context/AuthContext';
import { extractApiError, formatDate, formatNumber } from '../utils/formatters';
import type { PlateData } from '../utils/licensePlate';
import { hasPermission } from '../utils/permissions';

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
};

type SummaryResponse = {
  reportType?: string;
  filters?: unknown;
  results?: SummaryResult[] | string | null;
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

function parseResults(value: SummaryResponse['results']): SummaryResult[] {
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is SummaryResult => Boolean(item) && typeof item === 'object' && !Array.isArray(item),
        );
      }
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return [parsed as SummaryResult];
      }
    } catch {
      return [];
    }
  }

  return [];
}

function formatDecimal(value: unknown, maximumFractionDigits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';

  return new Intl.NumberFormat('fa-IR', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(number);
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

  const hours = raw.match(/(\d+(?:\.\d+)?)\s*h/i)?.[1];
  const minutes = raw.match(/(\d+(?:\.\d+)?)\s*m/i)?.[1];

  if (!hours && !minutes) return raw;

  const parts: string[] = [];
  if (hours) parts.push(`${formatDecimal(hours, 0)} ساعت`);
  if (minutes) parts.push(`${formatDecimal(minutes, 0)} دقیقه`);
  return parts.join(' و ');
}

function ValueCard({
  label,
  value,
  featured = false,
}: {
  label: string;
  value: ReactNode;
  featured?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[94px] min-w-0 flex-col justify-between rounded-2xl border px-4 py-4 transition-colors ${
        featured
          ? 'border-[#BDD7F0] bg-[#F2F7FC]'
          : 'border-[#E5E7EB] bg-white'
      }`}
    >
      <span className="text-xs font-medium leading-5 text-[#737373]">{label}</span>
      <strong className="mt-2 break-words text-base font-bold leading-7 text-[#111827]">{value}</strong>
    </div>
  );
}

function ReportSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#E7EBF0] bg-[#FBFCFD] p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-5 w-1 rounded-full bg-[#206AB4]" aria-hidden="true" />
        <h3 className="text-sm font-bold text-[#222222]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function ReportResultCard({ result }: { result: SummaryResult }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-[#DDE4EB] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-4 border-b border-[#E9EDF2] bg-[#F8FAFC] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#737373]">نام دستگاه</p>
          <p className="mt-1 text-xl font-bold text-[#111827]" dir="ltr">
            {result.deviceName || '-'}
          </p>
        </div>

        <div className="flex w-fit items-center gap-2 rounded-xl border border-[#DDE4EB] bg-white px-4 py-2.5">
          <span className="text-xs text-[#737373]">شناسه دستگاه</span>
          <strong className="text-base text-[#111827]">
            {result.deviceId !== undefined ? formatNumber(result.deviceId) : '-'}
          </strong>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <ReportSection title="خلاصه حرکت">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ValueCard label="مسافت طی‌شده" value={formatWithUnit(result.distance, 'کیلومتر')} featured />
            <ValueCard label="سرعت متوسط" value={formatWithUnit(result.averageSpeed, 'کیلومتر بر ساعت')} />
            <ValueCard label="حداکثر سرعت" value={formatWithUnit(result.maxSpeed, 'کیلومتر بر ساعت')} />
            <ValueCard label="سوخت مصرف‌شده" value={formatWithUnit(result.spentFuel, 'لیتر')} />
          </div>
        </ReportSection>

        <div className="grid gap-4 xl:grid-cols-2">
          <ReportSection title="کیلومترشمار">
            <div className="grid gap-3 sm:grid-cols-2">
              <ValueCard label="کیلومترشمار در شروع" value={formatWithUnit(result.startOdometer, 'کیلومتر')} />
              <ValueCard label="کیلومترشمار در پایان" value={formatWithUnit(result.endOdometer, 'کیلومتر')} />
            </div>
          </ReportSection>

          <ReportSection title="بازه زمانی حرکت">
            <div className="grid gap-3 sm:grid-cols-2">
              <ValueCard label="زمان شروع" value={formatDate(result.startTime, true)} />
              <ValueCard label="زمان پایان" value={formatDate(result.endTime, true)} />
            </div>
          </ReportSection>
        </div>

        <ReportSection title="کارکرد موتور">
          <div className="grid gap-3 md:grid-cols-3">
            <ValueCard label="کارکرد ثبت‌شده در شروع" value={formatEngineDuration(result.startHours)} />
            <ValueCard label="کارکرد ثبت‌شده در پایان" value={formatEngineDuration(result.endHours)} />
            <ValueCard label="مدت کارکرد موتور" value={formatEngineDuration(result.engineHours)} featured />
          </div>
        </ReportSection>
      </div>
    </article>
  );
}

function ReportSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-3xl border border-[#DDE4EB] bg-white" aria-hidden="true">
      <div className="flex items-center justify-between border-b border-[#E9EDF2] bg-[#F8FAFC] px-5 py-5">
        <div>
          <div className="h-3 w-16 rounded-full bg-[#E5E7EB]" />
          <div className="mt-2 h-6 w-28 rounded-full bg-[#E5E7EB]" />
        </div>
        <div className="h-10 w-32 rounded-xl bg-[#E5E7EB]" />
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="rounded-2xl border border-[#E7EBF0] bg-[#FBFCFD] p-5">
          <div className="mb-4 h-4 w-24 rounded-full bg-[#E5E7EB]" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-[94px] rounded-2xl bg-[#E9EDF2]" />
            ))}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 2 }).map((_, sectionIndex) => (
            <div key={sectionIndex} className="rounded-2xl border border-[#E7EBF0] bg-[#FBFCFD] p-5">
              <div className="mb-4 h-4 w-24 rounded-full bg-[#E5E7EB]" />
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="h-[94px] rounded-2xl bg-[#E9EDF2]" />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[#E7EBF0] bg-[#FBFCFD] p-5">
          <div className="mb-4 h-4 w-24 rounded-full bg-[#E5E7EB]" />
          <div className="grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-[94px] rounded-2xl bg-[#E9EDF2]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const emptyPlate: PlateData = {
  part1: '',
  part2: '',
  alphabet: '',
  regionCode: '',
};

export default function VehicleReports() {
  const { user } = useAuth();
  const canView = hasPermission(user, 'reports.operational.view');

  const [plate, setPlate] = useState<PlateData>(emptyPlate);
  const [fromDate, setFromDate] = useState(() => formatDateInput(new Date()));
  const [toDate, setToDate] = useState(() => formatDateInput(new Date()));
  const [report, setReport] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handlePlateChange = useCallback((value: Partial<PlateData>) => {
    setPlate((previous) => ({ ...previous, ...value }));
  }, []);

  const submitReport = async () => {
    const part1 = String(plate.part1 || '').trim();
    const part2 = String(plate.part2 || '').trim();
    const alphabet = String(plate.alphabet || '').trim();
    const regionCode = String(plate.regionCode || '').trim();

    if (part1.length !== 2 || part2.length !== 3 || !alphabet || regionCode.length !== 2) {
      setError('پلاک خودرو را به‌صورت کامل وارد کنید.');
      return;
    }

    if (!fromDate || !toDate) {
      setError('تاریخ شروع و تاریخ پایان را انتخاب کنید.');
      return;
    }

    if (toDate < fromDate) {
      setError('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.');
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);
      setError('');
      setReport(null);

      const response = await vehiclesAPI.getTraccarReportSummary({
        plate_2number: part1,
        plate_3number: part2,
        plate_alphabet: alphabet,
        plate_serial: regionCode,
        from: toApiDateTime(fromDate),
        to: toApiDateTime(toDate, true),
      });

      setReport((response.data || {}) as SummaryResponse);
    } catch (err) {
      setReport(null);
      setError(extractApiError(err, 'دریافت گزارش خودرو انجام نشد.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!loading) void submitReport();
  };

  if (!canView) return <AccessDenied />;

  const results = parseResults(report?.results);

  return (
    <div className="flex w-full flex-col gap-4 pb-4">
      <PageHeader
        title="گزارشات"
        description="گزارش حرکت خودرو بر اساس پلاک و بازه زمانی"
      />

      <SectionCard>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(300px,1.25fr)_minmax(220px,1fr)_minmax(220px,1fr)_auto] xl:items-end">
            <Field label="پلاک خودرو">
              <div className="flex min-h-14 items-center rounded-2xl">
                <LicensePlate
                  part1={plate.part1}
                  part2={plate.part2}
                  alphabet={plate.alphabet}
                  regionCode={plate.regionCode}
                  onChange={handlePlateChange}
                />
              </div>
            </Field>

            <Field label="تاریخ شروع">
              <Input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                placeholder="تاریخ شروع را انتخاب کنید"
              />
            </Field>

            <Field label="تاریخ پایان">
              <Input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                placeholder="تاریخ پایان را انتخاب کنید"
              />
            </Field>

            <PrimaryButton
              type="submit"
              disabled={loading}
              className="h-14 min-w-32 px-6 xl:mb-0"
            >
              {loading ? 'در حال دریافت...' : 'دریافت گزارش'}
            </PrimaryButton>
          </div>

          <ErrorAlert message={error} />
        </form>
      </SectionCard>

      {loading ? <ReportSkeleton /> : null}

      {!loading && hasSearched && !error && results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D9D9D9] bg-white px-6 py-12 text-center">
          <p className="text-sm font-bold text-[#222222]">گزارشی برای این پلاک در بازه انتخاب‌شده پیدا نشد.</p>
          <p className="mt-2 text-xs text-[#737373]">پلاک یا بازه زمانی را تغییر دهید و دوباره جستجو کنید.</p>
        </div>
      ) : null}

      {!loading && results.length > 0 ? (
        <div className="space-y-4">
          {results.map((result, index) => (
            <ReportResultCard key={`${result.deviceId ?? 'device'}-${index}`} result={result} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
