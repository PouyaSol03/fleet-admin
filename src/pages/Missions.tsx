// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { missionsAPI } from '../api/missions';
import { usersAPI } from '../api/users';
import { vehiclesAPI } from '../api/vehicles';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { extractApiError, formatDate, normalizeCollection, toBooleanLabel } from '../utils/formatters';
import {
  AccessDenied,
  Badge,
  ConfirmationModal,
  DataTable,
  ErrorAlert,
  Field,
  Modal,
  PageHeader,
  PrimaryButton,
  RowActionMenu,
  SectionCard,
  SecondaryButton,
  Textarea,
  ToolbarSelect,
  LoadingState,
  DataTableExportButton,
} from '../components/shared/UI';
import MissionForm from '../components/dashboardlayout/MissionForm';

const emptyForm = {
  title: '', driverId: '', vehicleId: '', vehicleType: 'in_city', missionType: 'single',
  isSpecial: false, origin: '', destination: '', pickupPointsText: '', dropoffPointsText: '',
  hasFreight: false, freightDescription: '',
  peopleCount: '1', passengerIds: [], startDate: new Date().toISOString().slice(0, 10), endDate: '', status: 'planned', firstCost: '0', notes: '',
};
const emptyReportForm = { note: '' };

function joinStops(values) { return Array.isArray(values) ? values.join('\n') : ''; }
function parseStops(value) { return String(value || '').split('\n').map((i) => i.trim()).filter(Boolean); }
function formatRial(value) { return `${Number(value || 0).toLocaleString('fa-IR')} ریال`; }
function formatKm(value) { return value === null || value === undefined || value === '' ? '-' : `${Number(value).toLocaleString('fa-IR')} کیلومتر`; }
function reportActionLabel(action) { return action === 'canceled' ? 'لغو ماموریت' : 'پایان ماموریت'; }

export default function Missions() {
    const { user } = useAuth();
    const [rows, setRows] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [users, setUsers] = useState([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(emptyForm);
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteSubmitting, setDeleteSubmitting] = useState(false);
    const [reportTarget, setReportTarget] = useState(null);
    const [reportForm, setReportForm] = useState(emptyReportForm);
    const [reportError, setReportError] = useState('');
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const canView = hasPermission(user, 'missions.view');
    const canCreate = hasPermission(user, 'missions.create');
    const canUpdate = hasPermission(user, 'missions.update');
    const canDelete = hasPermission(user, 'missions.delete');

    const missionListParams = useMemo(() => {
      const params = {};

      if (statusFilter) params.status = statusFilter;

      return params;
    }, [statusFilter]);

    const loadData = async (params = missionListParams) => {
      const [mRes, dRes, uRes, vRes] = await Promise.all([missionsAPI.list(params), usersAPI.listDrivers(), usersAPI.list(), vehiclesAPI.list()]);
      setRows(normalizeCollection(mRes.data)); setDrivers(normalizeCollection(dRes.data)); setUsers(normalizeCollection(uRes.data)); setVehicles(normalizeCollection(vRes.data));
    };

    useEffect(() => {
      if (!canView) return;
      let mounted = true;
      const load = async () => {
        try { setLoading(true); await loadData(); }
        catch (err) { if (mounted) setError(extractApiError(err, 'بارگذاری ماموریت‌ها انجام نشد.')); }
        finally { if (mounted) setLoading(false); }
      };
      load();
      return () => { mounted = false; };
    }, [canView, missionListParams]);

    const handleDownload = async () => {
      try {
        setDownloading(true);
        const response = await missionsAPI.downloadMissions(missionListParams);
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'missions_export.xlsx';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        setError(extractApiError(err, 'دریافت فایل خروجی انجام نشد.'));
      } finally {
        setDownloading(false);
      }
    };

    const filteredRows = useMemo(() => rows.filter((row) => !statusFilter || row.status === statusFilter), [rows, statusFilter]);

    const openEditModal = (row) => {
      setEditingId(row.id);
      setFormData({
        title: row.title || '', driverId: row.driverId ? String(row.driverId) : '',
        vehicleId: row.vehicleId ? String(row.vehicleId) : '', vehicleType: row.vehicleType || 'in_city',
        missionType: row.missionType || 'single', isSpecial: Boolean(row.isSpecial), origin: row.origin || '',
        destination: row.destination || '', pickupPointsText: joinStops(row.pickupPoints), dropoffPointsText: joinStops(row.dropoffPoints),
        hasFreight: Boolean(row.hasFreight), freightDescription: row.freightDescription || '',
        peopleCount: String(row.peopleCount ?? 1), passengerIds: Array.isArray(row.passengerIds) ? row.passengerIds.map(String) : [],
        startDate: row.startDate || '', endDate: row.endDate || '', status: row.status || 'planned', firstCost: String(row.firstCost ?? 0), notes: row.notes || '',
      });
      setFormError(''); setModalOpen(true);
    };

    const handleSubmit = async (event) => {
      if (event) event.preventDefault();
      setSubmitting(true); setFormError('');

      if (!formData.title.trim()) {
        setFormError('عنوان ماموریت را وارد کنید.');
        setSubmitting(false);
        return;
      }
      if (!formData.driverId || !formData.vehicleId) {
        setFormError('انتخاب راننده و خودروی مربوط برای ساخت ماموریت الزامی است.');
        setSubmitting(false);
        return;
      }
      if (!formData.origin.trim() || !formData.destination.trim() || !formData.startDate) {
        setFormError('مبدا، مقصد و تاریخ شروع ماموریت را کامل کنید.');
        setSubmitting(false);
        return;
      }
      if (formData.hasFreight && !formData.freightDescription.trim()) {
        setFormError('شرح بار الزامی است.');
        setSubmitting(false);
        return;
      }
      if (Number(formData.peopleCount || 0) < 1) {
        setFormError('تعداد نفرات باید حداقل ۱ باشد.');
        setSubmitting(false);
        return;
      }
      if (!formData.passengerIds.length) {
        setFormError('حداقل یک مسافر برای ماموریت انتخاب کنید.');
        setSubmitting(false);
        return;
      }
      if (Number(formData.firstCost || 0) < 0) {
        setFormError('هزینه اولیه نمی‌تواند منفی باشد.');
        setSubmitting(false);
        return;
      }

      const payload = {
        title: formData.title.trim(), driverId: formData.driverId ? Number(formData.driverId) : null,
        vehicleId: formData.vehicleId ? Number(formData.vehicleId) : null, vehicleType: formData.vehicleType,
        missionType: formData.missionType, isSpecial: Boolean(formData.isSpecial), origin: formData.origin.trim(), destination: formData.destination.trim(),
        pickupPoints: parseStops(formData.pickupPointsText), dropoffPoints: parseStops(formData.dropoffPointsText),
        hasFreight: Boolean(formData.hasFreight), freightDescription: formData.hasFreight ? formData.freightDescription.trim() : '',
        peopleCount: Number(formData.peopleCount), passengerIds: formData.passengerIds.map(Number),
        startDate: formData.startDate, endDate: formData.endDate || null, status: formData.status, firstCost: Number(formData.firstCost || 0), notes: formData.notes.trim(),
      };

      try {
        if (editingId) await missionsAPI.update(editingId, payload);
        else await missionsAPI.create(payload);
        setModalOpen(false); await loadData();
      } catch (err) { setFormError(extractApiError(err, 'ذخیره ماموریت انجام نشد.')); }
      finally { setSubmitting(false); }
    };

    const confirmDelete = async () => {
      if (!deleteTarget) return;
      setDeleteSubmitting(true);
      try { await missionsAPI.delete(deleteTarget.id); setDeleteTarget(null); await loadData(); }
      catch (err) { setError(extractApiError(err, 'حذف ماموریت انجام نشد.')); }
      finally { setDeleteSubmitting(false); }
    };

    const openReportModal = (row) => {
      setReportTarget(row);
      setReportForm({
        note: row.managerReport?.note || '',
      });
      setReportError('');
    };

    const submitManagerReport = async (event) => {
      if (event) event.preventDefault();
      if (!reportTarget) return;

      if (!reportForm.note.trim()) {
        setReportError('یادداشت گزارش را وارد کنید.');
        return;
      }
      const payload = { note: reportForm.note.trim() };

      try {
        setReportSubmitting(true);
        await missionsAPI.submitManagerReport(reportTarget.id, payload);
        setReportTarget(null);
        await loadData();
      } catch (err) {
        setReportError(extractApiError(err, 'ثبت گزارش مدیر انجام نشد.'));
      } finally {
        setReportSubmitting(false);
      }
    };

    if (!canView) return <AccessDenied />;

    const statusTone = { planned: 'amber', active: 'blue', done: 'emerald', canceled: 'red' };
    const statusLabel = { planned: 'برنامه ریزی شده', active: 'فعال', done: 'انجام شده', canceled: 'لغو شده' };

    const columns = [
      { key: 'title', title: 'عنوان' }, { key: 'driverName', title: 'راننده' },
      { key: 'pickupPoints', title: 'مبداها', render: (v) => (v || []).join('، ') || '-' },
      { key: 'dropoffPoints', title: 'مقصدها', render: (v) => (v || []).join('، ') || '-' },
      { key: 'passengerNames', title: 'مسافران', render: (v) => (v || []).join('، ') || '-' },
      { key: 'startDate', title: 'شروع', render: (v) => formatDate(v) }, { key: 'endDate', title: 'پایان', render: (v) => formatDate(v) },
      { key: 'firstCost', title: 'هزینه اولیه', render: (v) => formatRial(v) },
      { key: 'driverReport', title: 'گزارش راننده', render: (v) => v ? <Badge tone="emerald">{reportActionLabel(v.action)}</Badge> : <Badge tone="slate">ثبت نشده</Badge> },
      { key: 'managerReport', title: 'گزارش مدیر', render: (v) => v ? <Badge tone="blue">ثبت شده</Badge> : <Badge tone="amber">در انتظار</Badge> },
      { key: 'isSpecial', title: 'ویژه', render: (v) => toBooleanLabel(v) },
      { key: 'status', title: 'وضعیت', render: (v) => <Badge tone={statusTone[v]}>{statusLabel[v] || v}</Badge> },
      {
        key: 'actions', title: 'اقدام', render: (_, r) => (
          <RowActionMenu items={[
            canUpdate && { label: 'ویرایش', tone: 'edit', onClick: () => openEditModal(r) },
            canUpdate && r.driverReport && { label: r.managerReport ? 'مشاهده گزارش' : 'ثبت گزارش مدیر', tone: 'blue', onClick: () => openReportModal(r) },
            canDelete && { label: 'حذف', tone: 'delete', onClick: () => setDeleteTarget(r) },
          ]} />
        )
      },
    ];

    return (
      <div className="flex w-full flex-col items-center gap-2">
        <PageHeader
          title="ماموریت ها"
          description="مدیریت ماموریت ها با چند مبدا، چند مقصد و مسافران تخصیص یافته"
          action={
            <div className="flex items-center justify-end gap-2">
              <DataTableExportButton onClick={handleDownload} disabled={downloading} />
              {canCreate ? (
                <PrimaryButton type="button" onClick={() => { setEditingId(null); setFormData(emptyForm); setFormError(''); setModalOpen(true); }}>
                  ماموریت جدید
                </PrimaryButton>
              ) : null}
            </div>
          }
        />
        <ErrorAlert message={error} />
        <SectionCard title="فیلتر وضعیت">
          <ToolbarSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">همه وضعیت ها</option>
            {Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </ToolbarSelect>
        </SectionCard>
        <SectionCard title="فهرست ماموریت ها">
          {loading ? <LoadingState /> : <DataTable columns={columns} rows={filteredRows} emptyTitle="ماموریتی ثبت نشده است." />}
        </SectionCard>

        <Modal
          open={modalOpen}
          title={editingId ? 'ویرایش ماموریت' : 'ایجاد ماموریت'}
          onClose={() => setModalOpen(false)}
          bodyClassName="flex flex-col overflow-hidden p-0"
          panelClassName="h-[92dvh]"
        >
          <ErrorAlert message={formError} />
          <MissionForm
            formData={formData} setFormData={setFormData} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)}
            vehicles={vehicles} drivers={drivers} users={users} isCreateMode={!editingId} submitting={submitting} displayTitle={formData.title}
          />
        </Modal>

        <ConfirmationModal open={Boolean(deleteTarget)} mode="delete" message={`آیا از حذف ماموریت ${deleteTarget?.title || ''} اطمینان دارید؟`} loading={deleteSubmitting} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />

        <Modal open={Boolean(reportTarget)} title="گزارش پایان ماموریت" onClose={() => setReportTarget(null)}>
          <ErrorAlert message={reportError} />
          {reportTarget ? (
            <form onSubmit={submitManagerReport} className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-black text-slate-800">گزارش راننده</h3>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600">
                    <div className="flex justify-between gap-3"><span>نوع گزارش</span><strong>{reportActionLabel(reportTarget.driverReport?.action)}</strong></div>
                    <div className="flex justify-between gap-3"><span>کیلومتر شروع</span><strong>{formatKm(reportTarget.driverReport?.startKilometers)}</strong></div>
                    <div className="flex justify-between gap-3"><span>کیلومتر پایان</span><strong>{formatKm(reportTarget.driverReport?.endKilometers)}</strong></div>
                    <div className="rounded-xl bg-white px-3 py-2 leading-6">
                      {reportTarget.driverReport?.note || '-'}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-black text-slate-800">گزارش مدیر</h3>
                  <div className="mt-3">
                    <Field label="یادداشت بررسی مدیر">
                      <Textarea rows="5" value={reportForm.note} onChange={(event) => setReportForm((prev) => ({ ...prev, note: event.target.value }))} />
                    </Field>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <SecondaryButton type="button" onClick={() => setReportTarget(null)}>انصراف</SecondaryButton>
                <PrimaryButton type="submit" disabled={reportSubmitting}>
                  {reportSubmitting ? 'در حال ثبت...' : reportTarget.managerReport ? 'به‌روزرسانی گزارش مدیر' : 'ثبت گزارش مدیر'}
                </PrimaryButton>
              </div>
            </form>
          ) : null}
        </Modal>
      </div>
    );
  }

