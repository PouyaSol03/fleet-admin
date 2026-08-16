// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { vehiclesAPI } from '../api/vehicles';
import { useAuth } from '../context/AuthContext';
import { isSuperAdmin } from '../utils/permissions';
import { extractApiError, formatDate, formatNumber, normalizeCollection } from '../utils/formatters';
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
  StatCard,
  SuccessAlert,
} from '../components/shared/UI';

const emptyConfig = {
  api_url: '',
  username: '',
  password: '',
  is_active: false,
};

function booleanLabel(value) {
  if (value == null) return '-';
  return value ? 'بله' : 'خیر';
}

function trackingBadge(row) {
  if (!row.imei) return <Badge tone="slate">بدون IMEI</Badge>;
  if (row.trackingStatus === 'live') return <Badge tone="emerald">متصل</Badge>;
  if (row.trackingStatus === 'not_available') return <Badge tone="amber">بدون داده</Badge>;
  return <Badge tone="red">نیاز به بررسی</Badge>;
}


function TrackingStatsSkeleton() {
  return (
    <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="min-h-[100px] animate-pulse rounded-[15px] border border-[#D9D9D9] bg-white px-4 py-4 shadow-[2px_2px_7px_rgba(0,0,0,0.08)]"
        >
          <div className="flex h-full items-center justify-between gap-6">
            <div className="flex flex-1 flex-col gap-4">
              <div className="h-5 w-28 rounded-full bg-[#E5E7EB]" />
              <div className="h-3 w-20 rounded-full bg-[#F1F5F9]" />
            </div>
            <div className="h-9 w-12 rounded-lg bg-[#EEF2F7]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrackingTableSkeleton() {
  return (
    <div
      className="w-full overflow-hidden rounded-xl border border-[#E6E6E6] bg-white"
      aria-hidden="true"
    >
      <div className="min-w-[82rem] animate-pulse">
        <div className="grid grid-cols-[1.1fr_1.4fr_1fr_1.1fr_1fr_.8fr_.9fr_.65fr_.65fr_1.15fr_1.25fr] gap-4 border-b border-[#EFEFEF] bg-[#F8FAFC] px-4 py-4">
          {Array.from({ length: 11 }).map((_, index) => (
            <div key={index} className="h-3 w-4/5 rounded-full bg-[#E5E7EB]" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid grid-cols-[1.1fr_1.4fr_1fr_1.1fr_1fr_.8fr_.9fr_.65fr_.65fr_1.15fr_1.25fr] items-center gap-4 border-b border-[#F1F5F9] px-4 py-4 last:border-b-0"
          >
            {Array.from({ length: 11 }).map((_, cellIndex) => (
              <div
                key={cellIndex}
                className={`${cellIndex === 1 ? 'h-10 rounded-md' : 'h-4 rounded-full'} bg-[#EEF2F7] ${cellIndex === 1 ? 'w-full' : cellIndex === 10 ? 'w-5/6' : 'w-4/5'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TrackingPageSkeleton() {
  return (
    <div className="flex w-full flex-col gap-4" aria-hidden="true">
      <div className="flex w-full animate-pulse items-center justify-between rounded-[15px] border border-[#E6E6E6] bg-white px-5 py-5">
        <div className="space-y-3">
          <div className="h-6 w-36 rounded-full bg-[#E5E7EB]" />
          <div className="h-3 w-64 max-w-[55vw] rounded-full bg-[#EEF2F7]" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-20 rounded-xl bg-[#EEF2F7]" />
          <div className="h-10 w-24 rounded-xl bg-[#E5E7EB]" />
        </div>
      </div>
      <TrackingStatsSkeleton />
      <div className="w-full rounded-[15px] border border-[#E6E6E6] bg-white p-4">
        <div className="mb-5 animate-pulse space-y-2">
          <div className="h-5 w-24 rounded-full bg-[#E5E7EB]" />
          <div className="h-3 w-80 max-w-[70vw] rounded-full bg-[#EEF2F7]" />
        </div>
        <TrackingTableSkeleton />
      </div>
    </div>
  );
}

export default function Tracking() {
  const { user, profileLoading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [config, setConfig] = useState(emptyConfig);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [configOpen, setConfigOpen] = useState(false);

  const canView = Boolean(user);
  const canSync = canView;
  const canConfigure = isSuperAdmin(user);

  const loadLive = useCallback(async () => {
    const response = await vehiclesAPI.listLive();
    setRows(normalizeCollection(response.data));
  }, []);

  const loadConfig = useCallback(async () => {
    if (!canConfigure) return;
    const response = await vehiclesAPI.getTraccarConfig();
    setConfig({
      api_url: response.data.api_url || '',
      username: response.data.username || '',
      password: response.data.password || '',
      is_active: Boolean(response.data.is_active),
    });
  }, [canConfigure]);

  useEffect(() => {
    if (!canView) return;

    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        await Promise.all([loadLive(), loadConfig()]);
        if (mounted) setError('');
      } catch (err) {
        if (mounted) setError(extractApiError(err, 'بارگذاری اطلاعات ردیابی انجام نشد.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [canView, loadConfig, loadLive]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSuccess('');
      await vehiclesAPI.syncTraccar();
      await loadLive();
      setError('');
      setSuccess('همگام‌سازی انجام شد.');
    } catch (err) {
      setError(extractApiError(err, 'همگام‌سازی انجام نشد.'));
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveConfig = async (event) => {
    event.preventDefault();
    if (!canConfigure) return;

    try {
      setSavingConfig(true);
      setSuccess('');
      await vehiclesAPI.updateTraccarConfig(config);
      await loadConfig();
      setConfigOpen(false);
      setError('');
      setSuccess('تنظیمات ذخیره شد.');
    } catch (err) {
      setError(extractApiError(err, 'ذخیره تنظیمات انجام نشد.'));
    } finally {
      setSavingConfig(false);
    }
  };

  if (profileLoading) return <TrackingPageSkeleton />;
  if (!canView) {
    return (
      <div className="w-full">
        <AccessDenied
          title="شما نمیتوانید این صفحه رو ببینید"
          description=""
        />
      </div>
    );
  }
  const linkedVehicles = rows.filter((row) => row.imei).length;
  const liveVehicles = rows.filter((row) => row.trackingStatus === 'live').length;
  const movingVehicles = rows.filter((row) => row.traccarMotion).length;
  const onlineVehicles = rows.filter((row) => row.traccarOnline).length;

  const columns = [
    { key: 'model', title: 'خودرو' },
    { key: 'plateNumber', title: 'پلاک', render: (value) => <LicensePlateWithData numberplate={value} readOnly /> },
    { key: 'imei', title: 'IMEI' },
    { key: 'driverName', title: 'راننده' },
    { key: 'trackingStatus', title: 'وضعیت ردیابی', render: (_, row) => trackingBadge(row) },
    { key: 'traccarSpeedKmh', title: 'سرعت', render: (value) => `${formatNumber(value)} km/h` },
    { key: 'currentKilometer', title: 'کارکرد', render: (value) => `${formatNumber(value)} کیلومتر` },
    { key: 'traccarMotion', title: 'حرکت', render: (value) => booleanLabel(value) },
    { key: 'traccarIgnition', title: 'ایگنیشن', render: (value) => booleanLabel(value) },
    { key: 'lastReportedAt', title: 'آخرین گزارش', render: (value) => formatDate(value, true) },
    {
      key: 'location',
      title: 'موقعیت',
      render: (value, row) => {
        if (value?.lat == null || value?.lng == null) return '-';
        return (
          <button
            type="button"
            onClick={() => navigate(`/vehicle-map?vehicleId=${encodeURIComponent(String(row.id))}`)}
            className="font-semibold text-blue-600 underline decoration-dotted underline-offset-2"
          >
            {value.lat}, {value.lng}
          </button>
        );
      },
    },
  ];

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <PageHeader
        title="ردیابی خودروها"
        description="تنظیم اتصال، همگام‌سازی داده‌ها و بررسی وضعیت لحظه‌ای خودروها"
        action={(
          <>
            {canConfigure ? <SecondaryButton type="button" onClick={() => setConfigOpen(true)}>تنظیمات</SecondaryButton> : null}
            {canSync ? <PrimaryButton type="button" onClick={handleSync} disabled={syncing}>{syncing ? 'در حال همگام‌سازی...' : 'همگام‌سازی'}</PrimaryButton> : null}
          </>
        )}
      />

      <ErrorAlert message={error} />
      <SuccessAlert message={success} onDismiss={() => setSuccess('')} />

      {loading ? (
        <TrackingStatsSkeleton />
      ) : (
        <div className="grid gap-4 w-full md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="خودروهای لینک‌شده" value={formatNumber(linkedVehicles)} tone="blue" />
          <StatCard label="خودروهای دارای داده" value={formatNumber(liveVehicles)} tone="emerald" />
          <StatCard label="خودروهای آنلاین" value={formatNumber(onlineVehicles)} tone="amber" />
          <StatCard label="خودروهای در حرکت" value={formatNumber(movingVehicles)} tone="rose" />
        </div>
      )}

      <SectionCard
        title="نمای زنده"
        subtitle="برای هر خودرو، IMEI باید با uniqueId دستگاه در یکی باشد."
      >
        {loading ? (
          <TrackingTableSkeleton />
        ) : (
          <DataTable columns={columns} rows={rows} emptyTitle="هیچ خودرویی برای ردیابی در دسترس نیست." />
        )}
      </SectionCard>

      {canConfigure ? (
        <Modal open={configOpen} title="تنظیمات" onClose={() => setConfigOpen(false)}>
          <form onSubmit={handleSaveConfig} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="API URL">
                <Input value={config.api_url} onChange={(event) => setConfig((prev) => ({ ...prev, api_url: event.target.value }))} placeholder="https://traccar.example.com" />
              </Field>
              <Field label="نام کاربری">
                <Input value={config.username} onChange={(event) => setConfig((prev) => ({ ...prev, username: event.target.value }))} />
              </Field>
              <Field label="رمز عبور">
                <Input type="password" value={config.password} onChange={(event) => setConfig((prev) => ({ ...prev, password: event.target.value }))} />
              </Field>
              <label className="fleet-check-field text-sm font-medium">
                <input
                  type="checkbox"
                  checked={config.is_active}
                  onChange={(event) => setConfig((prev) => ({ ...prev, is_active: event.target.checked }))}
                />
                فعال بودن اتصال
              </label>
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <SecondaryButton type="button" onClick={() => setConfigOpen(false)}>انصراف</SecondaryButton>
              <PrimaryButton type="submit" disabled={savingConfig}>{savingConfig ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}</PrimaryButton>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
