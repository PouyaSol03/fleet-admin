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
  Modal,
  PageHeader,
  PrimaryButton,
  RowActionMenu,
  SectionCard,
  ToolbarSelect,
  LoadingState,
} from '../components/shared/UI';
import MissionForm from '../components/dashboardlayout/MissionForm';

const emptyForm = {
  title: '', driverId: '', vehicleId: '', vehicleType: 'in_city', missionType: 'single',
  isSpecial: false, origin: '', destination: '', pickupPointsText: '', dropoffPointsText: '',
  peopleCount: '1', passengerIds: [], startDate: new Date().toISOString().slice(0, 10), endDate: '', status: 'planned', notes: '',
};

function joinStops(values) { return Array.isArray(values) ? values.join('\n') : ''; }
function parseStops(value) { return String(value || '').split('\n').map((i) => i.trim()).filter(Boolean); }

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

  const canView = hasPermission(user, 'missions.view');
  const canCreate = hasPermission(user, 'missions.create');
  const canUpdate = hasPermission(user, 'missions.update');
  const canDelete = hasPermission(user, 'missions.delete');

  const loadData = async () => {
    const [mRes, dRes, uRes, vRes] = await Promise.all([missionsAPI.list(), usersAPI.listDrivers(), usersAPI.list(), vehiclesAPI.list()]);
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
  }, [canView]);

  const filteredRows = useMemo(() => rows.filter((row) => !statusFilter || row.status === statusFilter), [rows, statusFilter]);

  const openEditModal = (row) => {
    setEditingId(row.id);
    setFormData({
      title: row.title || '', driverId: row.driverId ? String(row.driverId) : '',
      vehicleId: row.vehicleId ? String(row.vehicleId) : '', vehicleType: row.vehicleType || 'in_city',
      missionType: row.missionType || 'single', isSpecial: Boolean(row.isSpecial), origin: row.origin || '',
      destination: row.destination || '', pickupPointsText: joinStops(row.pickupPoints), dropoffPointsText: joinStops(row.dropoffPoints),
      peopleCount: String(row.peopleCount ?? 1), passengerIds: Array.isArray(row.passengerIds) ? row.passengerIds.map(String) : [],
      startDate: row.startDate || '', endDate: row.endDate || '', status: row.status || 'planned', notes: row.notes || '',
    });
    setFormError(''); setModalOpen(true);
  };

  const handleSubmit = async (event) => {
    if (event) event.preventDefault();
    setSubmitting(true); setFormError('');

    const payload = {
      title: formData.title.trim(), driverId: formData.driverId ? Number(formData.driverId) : null,
      vehicleId: formData.vehicleId ? Number(formData.vehicleId) : null, vehicleType: formData.vehicleType,
      missionType: formData.missionType, isSpecial: Boolean(formData.isSpecial), origin: formData.origin.trim(), destination: formData.destination.trim(),
      pickupPoints: parseStops(formData.pickupPointsText), dropoffPoints: parseStops(formData.dropoffPointsText),
      peopleCount: Number(formData.peopleCount), passengerIds: formData.passengerIds.map(Number),
      startDate: formData.startDate, endDate: formData.endDate || null, status: formData.status, notes: formData.notes.trim(),
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

  if (!canView) return <AccessDenied />;

  const statusTone = { planned: 'amber', active: 'blue', done: 'emerald', canceled: 'red' };
  const statusLabel = { planned: 'برنامه ریزی شده', active: 'فعال', done: 'انجام شده', canceled: 'لغو شده' };

  const columns = [
    { key: 'title', title: 'عنوان' }, { key: 'driverName', title: 'راننده' },
    { key: 'pickupPoints', title: 'مبداها', render: (v) => (v || []).join('، ') || '-' },
    { key: 'dropoffPoints', title: 'مقصدها', render: (v) => (v || []).join('، ') || '-' },
    { key: 'passengerNames', title: 'مسافران', render: (v) => (v || []).join('، ') || '-' },
    { key: 'startDate', title: 'شروع', render: (v) => formatDate(v) }, { key: 'endDate', title: 'پایان', render: (v) => formatDate(v) },
    { key: 'isSpecial', title: 'ویژه', render: (v) => toBooleanLabel(v) },
    { key: 'status', title: 'وضعیت', render: (v) => <Badge tone={statusTone[v]}>{statusLabel[v] || v}</Badge> },
    {
      key: 'actions', title: 'اقدام', render: (_, r) => (
        <RowActionMenu items={[
          canUpdate && { label: 'ویرایش', tone: 'edit', onClick: () => openEditModal(r) },
          canDelete && { label: 'حذف', tone: 'delete', onClick: () => setDeleteTarget(r) },
        ]} />
      )
    },
  ];

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <PageHeader title="ماموریت ها" description="مدیریت ماموریت ها با چند مبدا، چند مقصد و مسافران تخصیص یافته" action={canCreate ? <PrimaryButton type="button" onClick={() => { setEditingId(null); setFormData(emptyForm); setFormError(''); setModalOpen(true); }}>ماموریت جدید</PrimaryButton> : null} />
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

      <Modal open={modalOpen} title={editingId ? 'ویرایش ماموریت' : 'ایجاد ماموریت'} onClose={() => setModalOpen(false)}>
        <ErrorAlert message={formError} />
        <MissionForm
          formData={formData} setFormData={setFormData} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)}
          vehicles={vehicles} drivers={drivers} users={users} isCreateMode={!editingId} submitting={submitting} displayTitle={formData.title}
        />
      </Modal>

      <ConfirmationModal open={Boolean(deleteTarget)} mode="delete" message={`آیا از حذف ماموریت ${deleteTarget?.title || ''} اطمینان دارید؟`} loading={deleteSubmitting} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
    </div>
  );
}