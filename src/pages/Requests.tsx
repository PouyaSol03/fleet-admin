// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { missionsAPI } from '../api/missions';
import { usersAPI } from '../api/users';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { extractApiError, formatDate, normalizeCollection, toBooleanLabel } from '../utils/formatters';
import {
  AccessDenied,
  Badge,
  DangerButton,
  DataTable,
  ErrorAlert,
  Field,
  Input,
  Modal,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  Select,
  SectionCard,
  Textarea,
  ToolbarSelect,
} from '../components/shared/UI';

const emptyForm = {
  title: '',
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
  notes: '',
};

const emptyDecision = {
  driverId: '',
  adminNote: '',
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

export default function Requests() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [users, setUsers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionMode, setDecisionMode] = useState('accept');
  const [decisionTarget, setDecisionTarget] = useState(null);
  const [decisionData, setDecisionData] = useState(emptyDecision);
  const [decisionError, setDecisionError] = useState('');
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);

  const canView = hasPermission(user, 'mission_requests.view');
  const canCreate = hasPermission(user, 'mission_requests.create');
  const canUpdate = hasPermission(user, 'mission_requests.update');
  const canDelete = hasPermission(user, 'mission_requests.delete');
  const canReview = hasPermission(user, 'missions.create') && hasPermission(user, 'mission_requests.update');

  const loadData = async () => {
    const requestsResponse = await missionsAPI.listRequests();
    const usersResponse = await usersAPI.list();
    setRows(normalizeCollection(requestsResponse.data));
    setUsers(normalizeCollection(usersResponse.data));
    if (canReview) {
      const driversResponse = await usersAPI.listDrivers();
      setDrivers(normalizeCollection(driversResponse.data));
    }
  };

  useEffect(() => {
    if (!canView) return;
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        await loadData();
      } catch (err) {
        if (mounted) setError(extractApiError(err, 'بارگذاری درخواست ها انجام نشد.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [canView, canReview]);

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
      notes: row.notes || '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const openDecisionModal = (mode, row) => {
    setDecisionMode(mode);
    setDecisionTarget(row);
    setDecisionData(emptyDecision);
    setDecisionError('');
    setDecisionOpen(true);
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`درخواست ${row.title} حذف شود؟`)) return;
    try {
      await missionsAPI.deleteRequest(row.id);
      await loadData();
    } catch (err) {
      setError(extractApiError(err, 'حذف درخواست انجام نشد.'));
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
      notes: formData.notes.trim(),
    };

    try {
      if (editingId) {
        await missionsAPI.updateRequest(editingId, payload);
      } else {
        await missionsAPI.createRequest(payload);
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(extractApiError(err, 'ذخیره درخواست انجام نشد.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecision = async (event) => {
    event.preventDefault();
    setDecisionSubmitting(true);
    setDecisionError('');

    const payload = {
      adminNote: decisionData.adminNote.trim(),
      driverId: decisionData.driverId ? Number(decisionData.driverId) : null,
    };

    try {
      if (decisionMode === 'accept') {
        await missionsAPI.acceptRequest(decisionTarget.id, payload);
      } else {
        await missionsAPI.rejectRequest(decisionTarget.id, { adminNote: payload.adminNote });
      }
      setDecisionOpen(false);
      await loadData();
    } catch (err) {
      setDecisionError(extractApiError(err, 'ثبت تصمیم انجام نشد.'));
    } finally {
      setDecisionSubmitting(false);
    }
  };

  if (!canView) return <AccessDenied />;

  const statusTone = {
    pending: 'amber',
    approved: 'emerald',
    rejected: 'red',
  };

  const statusLabel = {
    pending: 'در انتظار بررسی',
    approved: 'تایید شده',
    rejected: 'رد شده',
  };

  const columns = [
    { key: 'title', title: 'عنوان' },
    { key: 'requesterName', title: 'درخواست کننده' },
    { key: 'pickupPoints', title: 'مبداها', render: (value) => (value || []).join('، ') || '-' },
    { key: 'dropoffPoints', title: 'مقصدها', render: (value) => (value || []).join('، ') || '-' },
    { key: 'passengerNames', title: 'مسافران', render: (value) => (value || []).join('، ') || '-' },
    { key: 'startDate', title: 'شروع', render: (value) => formatDate(value) },
    { key: 'endDate', title: 'پایان', render: (value) => formatDate(value) },
    { key: 'isSpecial', title: 'ویژه', render: (value) => toBooleanLabel(value) },
    { key: 'status', title: 'وضعیت', render: (value) => <Badge tone={statusTone[value]}>{statusLabel[value] || value}</Badge> },
    {
      key: 'actions',
      title: 'عملیات',
      render: (_, row) => {
        const pending = row.status === 'pending';
        const isOwner = row.requesterId === user?.id;
        return (
          <div className="flex flex-wrap gap-2">
            {pending && isOwner && canUpdate ? <SecondaryButton type="button" onClick={() => openEditModal(row)}>ویرایش</SecondaryButton> : null}
            {pending && isOwner && canDelete ? <DangerButton type="button" onClick={() => handleDelete(row)}>حذف</DangerButton> : null}
            {pending && canReview ? <PrimaryButton type="button" onClick={() => openDecisionModal('accept', row)}>تبدیل به ماموریت</PrimaryButton> : null}
            {pending && canReview ? <DangerButton type="button" onClick={() => openDecisionModal('reject', row)}>رد درخواست</DangerButton> : null}
            {row.missionId ? <Badge tone="blue">ماموریت #{row.missionId}</Badge> : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="درخواست خودرو"
        description={canReview ? 'درخواست های ثبت شده را بررسی کنید و در صورت تایید به ماموریت تبدیل کنید.' : 'برای دریافت خودرو درخواست جدید ثبت کنید و وضعیت آن را پیگیری کنید.'}
        action={canCreate ? <PrimaryButton type="button" onClick={openCreateModal}>درخواست جدید</PrimaryButton> : null}
      />
      <ErrorAlert message={error} />
      <SectionCard title="فیلتر وضعیت">
        <ToolbarSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">همه وضعیت ها</option>
          <option value="pending">در انتظار بررسی</option>
          <option value="approved">تایید شده</option>
          <option value="rejected">رد شده</option>
        </ToolbarSelect>
      </SectionCard>
      <SectionCard title="فهرست درخواست ها">
        {loading ? <p className="text-sm text-slate-500">در حال بارگذاری...</p> : <DataTable columns={columns} rows={filteredRows} emptyTitle="درخواستی ثبت نشده است." />}
      </SectionCard>

      <Modal open={modalOpen} title={editingId ? 'ویرایش درخواست' : 'ثبت درخواست خودرو'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <ErrorAlert message={formError} />
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="عنوان درخواست">
              <Input value={formData.title} onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))} required />
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
            <Field label="تاریخ شروع">
              <Input type="date" value={formData.startDate} onChange={(event) => setFormData((prev) => ({ ...prev, startDate: event.target.value }))} required />
            </Field>
            <Field label="تاریخ پایان">
              <Input type="date" value={formData.endDate} onChange={(event) => setFormData((prev) => ({ ...prev, endDate: event.target.value }))} />
            </Field>
            <Field label="مسافران ماموریت" hint="برای انتخاب چند نفر Ctrl یا Cmd را نگه دارید.">
              <select multiple value={formData.passengerIds} onChange={handlePassengerChange} className="h-40 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100">
                {users.map((option) => <option key={option.id} value={String(option.id)}>{option.fullName || option.userName}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <input type="checkbox" checked={formData.isSpecial} onChange={(event) => setFormData((prev) => ({ ...prev, isSpecial: event.target.checked }))} />
              درخواست ویژه
            </label>
          </div>
          <Field label="توضیحات">
            <Textarea rows="5" value={formData.notes} onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))} />
          </Field>
          <div className="flex justify-end gap-3">
            <SecondaryButton type="button" onClick={() => setModalOpen(false)}>انصراف</SecondaryButton>
            <PrimaryButton type="submit" disabled={submitting}>{submitting ? 'در حال ذخیره...' : 'ذخیره'}</PrimaryButton>
          </div>
        </form>
      </Modal>

      <Modal open={decisionOpen} title={decisionMode === 'accept' ? 'تبدیل درخواست به ماموریت' : 'رد درخواست'} onClose={() => setDecisionOpen(false)}>
        <form onSubmit={handleDecision} className="space-y-5">
          <ErrorAlert message={decisionError} />
          {decisionMode === 'accept' ? (
            <Field label="راننده ماموریت">
              <Select value={decisionData.driverId} onChange={(event) => setDecisionData((prev) => ({ ...prev, driverId: event.target.value }))}>
                <option value="">بعدا تعیین می شود</option>
                {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
              </Select>
            </Field>
          ) : null}
          <Field label="یادداشت مدیر">
            <Textarea rows="5" value={decisionData.adminNote} onChange={(event) => setDecisionData((prev) => ({ ...prev, adminNote: event.target.value }))} />
          </Field>
          <div className="flex justify-end gap-3">
            <SecondaryButton type="button" onClick={() => setDecisionOpen(false)}>انصراف</SecondaryButton>
            <PrimaryButton type="submit" disabled={decisionSubmitting}>
              {decisionSubmitting ? 'در حال ثبت...' : decisionMode === 'accept' ? 'تایید و ساخت ماموریت' : 'ثبت رد درخواست'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
