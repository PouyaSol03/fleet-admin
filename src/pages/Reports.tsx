// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { missionsAPI } from '../api/missions';
import { reportsAPI } from '../api/reports';
import { usersAPI } from '../api/users';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { extractApiError, formatDate, formatNumber, normalizeCollection } from '../utils/formatters';
import {
  AccessDenied,
  Badge,
  ConfirmationModal,
  DataTable,
  ErrorAlert,
  Field,
  Input,
  Modal,
  PageHeader,
  PrimaryButton,
  RowActionMenu,
  SecondaryButton,
  SectionCard,
  Select,
  StatCard,
  Textarea,
  ToolbarSelect,
} from '../components/shared/UI';

const emptyForm = {
  driverId: '',
  missionId: '',
  offenseType: 'other',
  severity: 'medium',
  distance_km: '0',
  latitude: '',
  longitude: '',
  offenseTime: new Date().toISOString().slice(0, 16),
  description: '',
};

function RiskDriverCard({ row }) {
  return (
    <div
      className="relative flex min-h-[100px] items-center justify-between overflow-hidden rounded-[15px] border border-[#D9D9D9] bg-white px-4 py-2"
      style={{ boxShadow: '2px 2px 7px 0px rgba(0, 0, 0, 0.08)' }}
    >
      <div className="absolute -left-3 -top-4 h-[50px] w-[50px] rounded-full bg-[#A3000033] blur-[18px]" />
      <div className="relative min-w-0 text-right">
        <p className="text-2xl font-medium text-[#222222]">{row.driver__name || 'راننده'}</p>
        <p className="mt-3 text-xs font-medium text-[#7D7D7D]">
          {formatNumber(row.total_distance)} کیلومتر تخلف
        </p>
      </div>
      <div className="relative text-left">
        <p className="text-4xl font-normal text-black">{formatNumber(row.offense_count)}</p>
        <p className="text-xs font-medium text-[#A30000]">تخلف</p>
      </div>
    </div>
  );
}

export default function Reports() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [missions, setMissions] = useState([]);
  const [filters, setFilters] = useState({ driverId: '', missionId: '', offenseType: '', severity: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const canView = hasPermission(user, 'reports.operational.view');

  const queryParams = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, value]) => value)), [filters]);

  const loadData = async () => {
    const [reportResponse, driversResponse, missionsResponse] = await Promise.all([
      reportsAPI.getOperational(queryParams),
      usersAPI.listDrivers(),
      missionsAPI.list(),
    ]);
    setData(reportResponse.data);
    setDrivers(normalizeCollection(driversResponse.data));
    setMissions(normalizeCollection(missionsResponse.data));
  };

  useEffect(() => {
    if (!canView) return;
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        await loadData();
      } catch (err) {
        if (mounted) setError(extractApiError(err, 'بارگذاری گزارش انجام نشد.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [canView, queryParams.driverId, queryParams.missionId, queryParams.offenseType, queryParams.severity]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    const offenseTime = row.offenseTime ? new Date(row.offenseTime).toISOString().slice(0, 16) : '';
    setEditingId(row.id);
    setFormData({
      driverId: row.driverId ? String(row.driverId) : '',
      missionId: row.missionId ? String(row.missionId) : '',
      offenseType: row.offenseType || 'other',
      severity: row.severity || 'medium',
      distance_km: String(row.distance_km ?? 0),
      latitude: row.latitude != null ? String(row.latitude) : '',
      longitude: row.longitude != null ? String(row.longitude) : '',
      offenseTime,
      description: row.description || '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleDelete = (row) => {
    setDeleteTarget(row);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await reportsAPI.deleteOffense(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(extractApiError(err, 'حذف تخلف انجام نشد.'));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');

    const payload = {
      driverId: formData.driverId ? Number(formData.driverId) : null,
      missionId: formData.missionId ? Number(formData.missionId) : null,
      offenseType: formData.offenseType,
      severity: formData.severity,
      distance_km: Number(formData.distance_km),
      latitude: formData.latitude ? Number(formData.latitude) : null,
      longitude: formData.longitude ? Number(formData.longitude) : null,
      offenseTime: formData.offenseTime ? new Date(formData.offenseTime).toISOString() : undefined,
      description: formData.description.trim(),
    };

    try {
      if (editingId) {
        await reportsAPI.updateOffense(editingId, payload);
      } else {
        await reportsAPI.createOffense(payload);
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(extractApiError(err, 'ذخیره تخلف انجام نشد.'));
    } finally {
      setSubmitting(false);
    }
  };


  const handleDownload = async () => {
    try {
      setDownloading(true);
      const response = await reportsAPI.downloadOperational(queryParams);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'operational_report.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(extractApiError(err, 'دریافت فایل گزارش انجام نشد.'));
    } finally {
      setDownloading(false);
    }
  };

  if (!canView) return <AccessDenied />;

  const summary = data?.summary;
  const offenses = data?.offenses || [];
  const topDrivers = data?.topDrivers || [];
  const missionRows = data?.missions || [];

  const severityTone = {
    low: 'emerald',
    medium: 'amber',
    high: 'red',
    critical: 'purple',
  };

  const columns = [
    { key: 'driverName', title: 'راننده' },
    { key: 'missionTitle', title: 'ماموریت' },
    { key: 'offenseType', title: 'نوع تخلف' },
    { key: 'severity', title: 'شدت', render: (value) => <Badge tone={severityTone[value]}>{value}</Badge> },
    { key: 'distance_km', title: 'مسافت', render: (value) => `${formatNumber(value)} کیلومتر` },
    { key: 'offenseTime', title: 'زمان', render: (value) => formatDate(value, true) },
    {
      key: 'actions',
      title: 'اقدام',
      render: (_, row) => (
        <RowActionMenu
          items={[
            { label: 'ویرایش', tone: 'edit', onClick: () => openEditModal(row) },
            { label: 'حذف', tone: 'delete', onClick: () => handleDelete(row) },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <PageHeader
        title="گزارش عملکرد و تخلف"
        description="نمای تحلیلی از تخلفات رانندگی، ماموریت ها و عملکرد ناوگان"
        action={
          <>
            <SecondaryButton type="button" onClick={handleDownload} disabled={downloading}>
              {downloading ? 'در حال آماده سازی...' : 'خروجی اکسل'}
            </SecondaryButton>
            <PrimaryButton type="button" onClick={openCreateModal}>ثبت تخلف</PrimaryButton>
          </>
        }
      />
      <ErrorAlert message={error} />

      <SectionCard title="فیلتر گزارش">
        <div className="grid gap-4 md:grid-cols-4">
          <ToolbarSelect value={filters.driverId} onChange={(event) => setFilters((prev) => ({ ...prev, driverId: event.target.value }))}>
            <option value="">همه رانندگان</option>
            {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
          </ToolbarSelect>
          <ToolbarSelect value={filters.missionId} onChange={(event) => setFilters((prev) => ({ ...prev, missionId: event.target.value }))}>
            <option value="">همه ماموریت ها</option>
            {missions.map((mission) => <option key={mission.id} value={mission.id}>{mission.title}</option>)}
          </ToolbarSelect>
          <ToolbarSelect value={filters.offenseType} onChange={(event) => setFilters((prev) => ({ ...prev, offenseType: event.target.value }))}>
            <option value="">همه انواع تخلف</option>
            <option value="speeding">سرعت غیرمجاز</option>
            <option value="route_deviation">انحراف از مسیر</option>
            <option value="unauthorized_stop">توقف غیرمجاز</option>
            <option value="fuel_anomaly">ناهنجاری سوخت</option>
            <option value="other">سایر</option>
          </ToolbarSelect>
          <ToolbarSelect value={filters.severity} onChange={(event) => setFilters((prev) => ({ ...prev, severity: event.target.value }))}>
            <option value="">همه شدت ها</option>
            <option value="low">کم</option>
            <option value="medium">متوسط</option>
            <option value="high">زیاد</option>
            <option value="critical">بحرانی</option>
          </ToolbarSelect>
        </div>
      </SectionCard>

      {loading ? <p className="text-sm text-slate-500">در حال بارگذاری...</p> : (
        <>
          <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="کل ماموریت ها" value={formatNumber(summary?.totalMissions)} tone="blue" helper="در بازه گزارش" />
            <StatCard label="کل تخلفات" value={formatNumber(summary?.totalOffenses)} tone="rose" helper="ثبت شده" />
            <StatCard label="مسافت تخلف" value={formatNumber(summary?.totalDistanceKm)} tone="amber" helper="کیلومتر" />
            <StatCard label="رانندگان درگیر" value={formatNumber(summary?.uniqueDrivers)} tone="emerald" helper="راننده" />
          </div>

          <div className="grid w-full gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="w-full">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold text-[#222222]">رانندگان پرریسک</h2>
                <Badge tone="red">{formatNumber(topDrivers.length)} مورد</Badge>
              </div>
              {topDrivers.length ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                  {topDrivers.map((row) => <RiskDriverCard key={row.driver_id} row={row} />)}
                </div>
              ) : (
                <div className="rounded-[15px] border border-dashed border-[#D9D9D9] bg-white px-4 py-8 text-center text-sm text-[#7D7D7D]">
                  موردی برای نمایش وجود ندارد.
                </div>
              )}
            </section>

            <section className="w-full">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold text-[#222222]">شدت تخلفات</h2>
                <span className="text-xs font-medium text-[#7D7D7D]">بر اساس سطح ریسک</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard label="کم" value={formatNumber(summary?.severity?.low)} tone="emerald" helper="کم خطر" />
                <StatCard label="متوسط" value={formatNumber(summary?.severity?.medium)} tone="amber" helper="نیازمند بررسی" />
                <StatCard label="زیاد" value={formatNumber(summary?.severity?.high)} tone="rose" helper="پرخطر" />
                <StatCard label="بحرانی" value={formatNumber(summary?.severity?.critical)} tone="purple" helper="فوری" />
              </div>
            </section>
          </div>

          <SectionCard title="جمع بندی ماموریت ها">
            <DataTable
              columns={[
                { key: 'title', title: 'عنوان', render: (_, row) => row.title },
                { key: 'driver__name', title: 'راننده' },
                { key: 'start_date', title: 'شروع', render: (value) => formatDate(value) },
                { key: 'status', title: 'وضعیت' },
                { key: 'offense_count', title: 'تعداد تخلف' },
                { key: 'offense_distance', title: 'مسافت تخلف', render: (value) => `${formatNumber(value)} کیلومتر` },
              ]}
              rows={missionRows}
              keyField="id"
              emptyTitle="داده ای برای ماموریت ها وجود ندارد."
            />
          </SectionCard>

          <SectionCard title="لیست تخلفات ثبت شده">
            <DataTable columns={columns} rows={offenses} emptyTitle="تخلفی برای نمایش وجود ندارد." />
          </SectionCard>
        </>
      )}

      <Modal open={modalOpen} title={editingId ? 'ویرایش تخلف' : 'ثبت تخلف'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <ErrorAlert message={formError} />
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="راننده">
              <Select value={formData.driverId} onChange={(event) => setFormData((prev) => ({ ...prev, driverId: event.target.value }))}>
                <option value="">انتخاب کنید</option>
                {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
              </Select>
            </Field>
            <Field label="ماموریت">
              <Select value={formData.missionId} onChange={(event) => setFormData((prev) => ({ ...prev, missionId: event.target.value }))}>
                <option value="">انتخاب کنید</option>
                {missions.map((mission) => <option key={mission.id} value={mission.id}>{mission.title}</option>)}
              </Select>
            </Field>
            <Field label="نوع تخلف">
              <Select value={formData.offenseType} onChange={(event) => setFormData((prev) => ({ ...prev, offenseType: event.target.value }))}>
                <option value="speeding">سرعت غیرمجاز</option>
                <option value="route_deviation">انحراف از مسیر</option>
                <option value="unauthorized_stop">توقف غیرمجاز</option>
                <option value="fuel_anomaly">ناهنجاری سوخت</option>
                <option value="other">سایر</option>
              </Select>
            </Field>
            <Field label="شدت">
              <Select value={formData.severity} onChange={(event) => setFormData((prev) => ({ ...prev, severity: event.target.value }))}>
                <option value="low">کم</option>
                <option value="medium">متوسط</option>
                <option value="high">زیاد</option>
                <option value="critical">بحرانی</option>
              </Select>
            </Field>
            <Field label="مسافت تخلف (کیلومتر)">
              <Input type="number" min="0" step="0.01" value={formData.distance_km} onChange={(event) => setFormData((prev) => ({ ...prev, distance_km: event.target.value }))} />
            </Field>
            <Field label="زمان تخلف">
              <Input type="datetime-local" value={formData.offenseTime} onChange={(event) => setFormData((prev) => ({ ...prev, offenseTime: event.target.value }))} />
            </Field>
            <Field label="عرض جغرافیایی">
              <Input type="number" step="0.000001" value={formData.latitude} onChange={(event) => setFormData((prev) => ({ ...prev, latitude: event.target.value }))} />
            </Field>
            <Field label="طول جغرافیایی">
              <Input type="number" step="0.000001" value={formData.longitude} onChange={(event) => setFormData((prev) => ({ ...prev, longitude: event.target.value }))} />
            </Field>
          </div>
          <Field label="شرح تخلف">
            <Textarea rows="5" value={formData.description} onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))} />
          </Field>
          <div className="flex justify-end gap-3">
            <SecondaryButton type="button" onClick={() => setModalOpen(false)}>انصراف</SecondaryButton>
            <PrimaryButton type="submit" disabled={submitting}>{submitting ? 'در حال ذخیره...' : 'ذخیره'}</PrimaryButton>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        open={Boolean(deleteTarget)}
        mode="delete"
        message={`آیا از حذف تخلف ${deleteTarget?.missionTitle || deleteTarget?.id || ''} اطمینان دارید؟`}
        loading={deleteSubmitting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
