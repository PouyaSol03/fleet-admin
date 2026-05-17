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
  Input,
  Modal,
  PageHeader,
  PrimaryButton,
  RowActionMenu,
  SecondaryButton,
  Select,
  SectionCard,
  Textarea,
  ToolbarSelect,
  LoadingState,
} from '../components/shared/UI';

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
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  status: 'planned',
  notes: '',
};

function joinStops(values) {
  return Array.isArray(values) ? values.join('\n') : '';
}

function parseStops(value) {
  return String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

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
    const [missionsResponse, driversResponse, usersResponse, vehiclesResponse] = await Promise.all([
      missionsAPI.list(),
      usersAPI.listDrivers(),
      usersAPI.list(),
      vehiclesAPI.list(),
    ]);
    setRows(normalizeCollection(missionsResponse.data));
    setDrivers(normalizeCollection(driversResponse.data));
    setUsers(normalizeCollection(usersResponse.data));
    setVehicles(normalizeCollection(vehiclesResponse.data));
  };

  useEffect(() => {
    if (!canView) return;
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        await loadData();
      } catch (err) {
        if (mounted) setError(extractApiError(err, 'بارگذاری ماموریت ها انجام نشد.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [canView]);

  const filteredRows = useMemo(() => rows.filter((row) => !statusFilter || row.status === statusFilter), [rows, statusFilter]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingId(row.id);
    setFormData({
      title: row.title || '',
      driverId: row.driverId ? String(row.driverId) : '',
      vehicleId: row.vehicleId ? String(row.vehicleId) : '',
      vehicleType: row.vehicleType || 'in_city',
      missionType: row.missionType || 'single',
      isSpecial: Boolean(row.isSpecial),
      origin: row.origin || '',
      destination: row.destination || '',
      pickupPointsText: joinStops(row.pickupPoints),
      dropoffPointsText: joinStops(row.dropoffPoints),
      peopleCount: String(row.peopleCount ?? 1),
      passengerIds: Array.isArray(row.passengerIds) ? row.passengerIds.map(String) : [],
      startDate: row.startDate || '',
      endDate: row.endDate || '',
      status: row.status || 'planned',
      notes: row.notes || '',
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
      await missionsAPI.delete(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(extractApiError(err, 'حذف ماموریت انجام نشد.'));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handlePassengerChange = (event) => {
    const values = Array.from(event.target.selectedOptions, (option) => option.value);
    setFormData((prev) => ({ ...prev, passengerIds: values }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');

    const payload = {
      title: formData.title.trim(),
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
      notes: formData.notes.trim(),
    };

    try {
      if (editingId) {
        await missionsAPI.update(editingId, payload);
      } else {
        await missionsAPI.create(payload);
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(extractApiError(err, 'ذخیره ماموریت انجام نشد.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!canView) return <AccessDenied />;

  const statusTone = {
    planned: 'amber',
    active: 'blue',
    done: 'emerald',
    canceled: 'red',
  };

  const statusLabel = {
    planned: 'برنامه ریزی شده',
    active: 'فعال',
    done: 'انجام شده',
    canceled: 'لغو شده',
  };

  const columns = [
    { key: 'title', title: 'عنوان' },
    { key: 'driverName', title: 'راننده' },
    { key: 'pickupPoints', title: 'مبداها', render: (value) => (value || []).join('، ') || '-' },
    { key: 'dropoffPoints', title: 'مقصدها', render: (value) => (value || []).join('، ') || '-' },
    { key: 'passengerNames', title: 'مسافران', render: (value) => (value || []).join('، ') || '-' },
    { key: 'startDate', title: 'شروع', render: (value) => formatDate(value) },
    { key: 'endDate', title: 'پایان', render: (value) => formatDate(value) },
    { key: 'isSpecial', title: 'ویژه', render: (value) => toBooleanLabel(value) },
    { key: 'status', title: 'وضعیت', render: (value) => <Badge tone={statusTone[value]}>{statusLabel[value] || value}</Badge> },
    {
      key: 'actions',
      title: 'اقدام',
      render: (_, row) => (
        <RowActionMenu
          items={[
            canUpdate && { label: 'ویرایش', tone: 'edit', onClick: () => openEditModal(row) },
            canDelete && { label: 'حذف', tone: 'delete', onClick: () => handleDelete(row) },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <PageHeader title="ماموریت ها" description="مدیریت ماموریت ها با چند مبدا، چند مقصد و مسافران تخصیص یافته" action={canCreate ? <PrimaryButton type="button" onClick={openCreateModal}>ماموریت جدید</PrimaryButton> : null} />
      <ErrorAlert message={error} />
      <SectionCard title="فیلتر وضعیت">
        <ToolbarSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">همه وضعیت ها</option>
          <option value="planned">برنامه ریزی شده</option>
          <option value="active">فعال</option>
          <option value="done">انجام شده</option>
          <option value="canceled">لغو شده</option>
        </ToolbarSelect>
      </SectionCard>
      <SectionCard title="فهرست ماموریت ها">
        {loading ? <LoadingState/> : <DataTable columns={columns} rows={filteredRows} emptyTitle="ماموریتی ثبت نشده است." />}
      </SectionCard>
      <Modal open={modalOpen} title={editingId ? 'ویرایش ماموریت' : 'ایجاد ماموریت'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <ErrorAlert message={formError} />
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="عنوان ماموریت">
              <Input value={formData.title} onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))} required />
            </Field>
            <Field label="راننده">
              <Select value={formData.driverId} onChange={(event) => setFormData((prev) => ({ ...prev, driverId: event.target.value }))}>
                <option value="">انتخاب نشده</option>
                {drivers.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
              </Select>
            </Field>
            <Field label="خودرو">
              <Select value={formData.vehicleId} onChange={(event) => setFormData((prev) => ({ ...prev, vehicleId: event.target.value }))}>
                <option value="">انتخاب نشده</option>
                {vehicles.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.model || 'خودرو'} - {option.plateNumber || 'بدون پلاک'}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="نوع مسیر">
              <Select value={formData.vehicleType} onChange={(event) => setFormData((prev) => ({ ...prev, vehicleType: event.target.value }))}>
                <option value="in_city">داخل شهری</option>
                <option value="out_of_city">برون شهری</option>
              </Select>
            </Field>
            <Field label="نوع ماموریت">
              <Select value={formData.missionType} onChange={(event) => setFormData((prev) => ({ ...prev, missionType: event.target.value }))}>
                <option value="single">تکی</option>
                <option value="periodic">دوره ای</option>
              </Select>
            </Field>
            <Field label="ظرفیت یا تعداد نفرات">
              <Input type="number" min="1" value={formData.peopleCount} onChange={(event) => setFormData((prev) => ({ ...prev, peopleCount: event.target.value }))} required />
            </Field>
            <Field label="اولین مبدا">
              <Input value={formData.origin} onChange={(event) => setFormData((prev) => ({ ...prev, origin: event.target.value }))} required />
            </Field>
            <Field label="آخرین مقصد">
              <Input value={formData.destination} onChange={(event) => setFormData((prev) => ({ ...prev, destination: event.target.value }))} required />
            </Field>
            <Field label="مبداهای چندگانه" hint="هر خط یک مبدا">
              <Textarea rows="4" value={formData.pickupPointsText} onChange={(event) => setFormData((prev) => ({ ...prev, pickupPointsText: event.target.value }))} />
            </Field>
            <Field label="مقصدهای چندگانه" hint="هر خط یک مقصد">
              <Textarea rows="4" value={formData.dropoffPointsText} onChange={(event) => setFormData((prev) => ({ ...prev, dropoffPointsText: event.target.value }))} />
            </Field>
            <Field label="مسافران ماموریت" hint="برای انتخاب چند نفر Ctrl یا Cmd را نگه دارید.">
              <select multiple value={formData.passengerIds} onChange={handlePassengerChange} className="h-40 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100">
                {users.map((option) => <option key={option.id} value={String(option.id)}>{option.fullName || option.userName}</option>)}
              </select>
            </Field>
            <Field label="تاریخ شروع">
              <Input type="date" value={formData.startDate} onChange={(event) => setFormData((prev) => ({ ...prev, startDate: event.target.value }))} required />
            </Field>
            <Field label="تاریخ پایان">
              <Input type="date" value={formData.endDate} onChange={(event) => setFormData((prev) => ({ ...prev, endDate: event.target.value }))} />
            </Field>
            <Field label="وضعیت">
              <Select value={formData.status} onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))}>
                <option value="planned">برنامه ریزی شده</option>
                <option value="active">فعال</option>
                <option value="done">انجام شده</option>
                <option value="canceled">لغو شده</option>
              </Select>
            </Field>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <input type="checkbox" checked={formData.isSpecial} onChange={(event) => setFormData((prev) => ({ ...prev, isSpecial: event.target.checked }))} />
              ماموریت ویژه
            </label>
          </div>
          <Field label="یادداشت ها">
            <Textarea rows="5" value={formData.notes} onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))} />
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
        message={`آیا از حذف ماموریت ${deleteTarget?.title || ''} اطمینان دارید؟`}
        loading={deleteSubmitting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
