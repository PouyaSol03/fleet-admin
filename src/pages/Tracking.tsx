// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useCallback, useEffect, useState } from 'react';
import { vehiclesAPI } from '../api/vehicles';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { extractApiError, formatDate, formatNumber, normalizeCollection } from '../utils/formatters';
import {
  AccessDenied,
  Badge,
  DataTable,
  ErrorAlert,
  Field,
  Input,
  LoadingState,
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

export default function Tracking() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [config, setConfig] = useState(emptyConfig);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [configOpen, setConfigOpen] = useState(false);

  const canView = hasPermission(user, 'map.view');
  const canSync = hasPermission(user, 'vehicles.update');
  const canConfigure = hasPermission(user, 'system.configure');

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
      setSuccess('همگام‌سازی با Traccar انجام شد.');
    } catch (err) {
      setError(extractApiError(err, 'همگام‌سازی با Traccar انجام نشد.'));
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveConfig = async (event) => {
    event.preventDefault();
    try {
      setSavingConfig(true);
      setSuccess('');
      await vehiclesAPI.updateTraccarConfig(config);
      await loadConfig();
      setConfigOpen(false);
      setError('');
      setSuccess('تنظیمات Traccar ذخیره شد.');
    } catch (err) {
      setError(extractApiError(err, 'ذخیره تنظیمات Traccar انجام نشد.'));
    } finally {
      setSavingConfig(false);
    }
  };

  if (!canView) return <AccessDenied />;
  if (loading) return <LoadingState />;

  const linkedVehicles = rows.filter((row) => row.imei).length;
  const liveVehicles = rows.filter((row) => row.trackingStatus === 'live').length;
  const movingVehicles = rows.filter((row) => row.traccarMotion).length;
  const onlineVehicles = rows.filter((row) => row.traccarOnline).length;

  const columns = [
    { key: 'model', title: 'خودرو' },
    { key: 'plateNumber', title: 'پلاک' },
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
      render: (value) => {
        if (value?.lat == null || value?.lng == null) return '-';
        const href = `https://www.google.com/maps?q=${value.lat},${value.lng}`;
        return (
          <a href={href} target="_blank" rel="noreferrer" className="font-semibold text-blue-600 underline decoration-dotted underline-offset-2">
            {value.lat}, {value.lng}
          </a>
        );
      },
    },
  ];

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <PageHeader
        title="ردیابی خودروها"
        description="تنظیم اتصال Traccar، همگام‌سازی داده‌ها و بررسی وضعیت لحظه‌ای خودروها"
        action={(
          <>
            {canConfigure ? <SecondaryButton type="button" onClick={() => setConfigOpen(true)}>تنظیمات Traccar</SecondaryButton> : null}
            {canSync ? <PrimaryButton type="button" onClick={handleSync} disabled={syncing}>{syncing ? 'در حال همگام‌سازی...' : 'همگام‌سازی'}</PrimaryButton> : null}
          </>
        )}
      />

      <ErrorAlert message={error} />
      <SuccessAlert message={success} onDismiss={() => setSuccess('')} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="خودروهای لینک‌شده" value={formatNumber(linkedVehicles)} tone="blue" />
        <StatCard label="خودروهای دارای داده" value={formatNumber(liveVehicles)} tone="emerald" />
        <StatCard label="خودروهای آنلاین" value={formatNumber(onlineVehicles)} tone="amber" />
        <StatCard label="خودروهای در حرکت" value={formatNumber(movingVehicles)} tone="rose" />
      </div>

      <SectionCard
        title="نمای زنده"
        subtitle="برای هر خودرو، IMEI باید با uniqueId دستگاه در Traccar یکی باشد."
      >
        <DataTable columns={columns} rows={rows} emptyTitle="هیچ خودرویی برای ردیابی در دسترس نیست." />
      </SectionCard>

      <Modal open={configOpen} title="تنظیمات Traccar" onClose={() => setConfigOpen(false)}>
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
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
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
    </div>
  );
}
