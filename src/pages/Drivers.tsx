// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { usersAPI } from '../api/users';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { extractApiError, formatDate, normalizeCollection } from '../utils/formatters';
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
  ToolbarInput,
  ToolbarSelect,
} from '../components/shared/UI';

const emptyForm = {
  userId: '',
  name: '',
  phone: '',
  status: 'active',
  startDate: new Date().toISOString().slice(0, 10),
  score: '0',
};

export default function Drivers() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [driverUsers, setDriverUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canView = hasPermission(user, 'drivers.view');
  const canCreate = hasPermission(user, 'drivers.create');
  const canUpdate = hasPermission(user, 'drivers.update');
  const canDelete = hasPermission(user, 'drivers.delete');

  const loadData = async () => {
    const [driversResponse, usersResponse] = await Promise.all([
      usersAPI.listDrivers(),
      usersAPI.list(),
    ]);
    setRows(normalizeCollection(driversResponse.data));
    setDriverUsers(normalizeCollection(usersResponse.data).filter((row) => !row.isSuperuser));
  };

  useEffect(() => {
    if (!canView) return;

    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        await loadData();
      } catch (err) {
        if (mounted) setError(extractApiError(err, 'بارگذاری رانندگان انجام نشد.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [canView]);

  const filteredRows = useMemo(() => rows.filter((row) => {
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || [row.name, row.phone, row.userName].some((value) => String(value || '').toLowerCase().includes(query));
    const matchesStatus = !statusFilter || row.status === statusFilter;
    return matchesQuery && matchesStatus;
  }), [rows, search, statusFilter]);

  const openCreateModal = () => {
    setFormMode('create');
    setEditingId(null);
    setFormData(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setFormMode('edit');
    setEditingId(row.id);
    setFormData({
      userId: row.userId ? String(row.userId) : '',
      name: row.name || '',
      phone: row.phone || '',
      status: row.status || 'active',
      startDate: row.startDate || '',
      score: String(row.score ?? 0),
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`راننده ${row.name} حذف شود؟`)) return;
    try {
      await usersAPI.deleteDriver(row.id);
      await loadData();
    } catch (err) {
      setError(extractApiError(err, 'حذف راننده انجام نشد.'));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');

    const payload = {
      userId: formData.userId ? Number(formData.userId) : null,
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      status: formData.status,
      startDate: formData.startDate,
      score: Number(formData.score),
    };

    try {
      if (formMode === 'edit') {
        await usersAPI.updateDriver(editingId, payload);
      } else {
        await usersAPI.createDriver(payload);
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(extractApiError(err, 'ذخیره راننده انجام نشد.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!canView) return <AccessDenied />;

  const columns = [
    { key: 'name', title: 'نام راننده' },
    { key: 'userName', title: 'کاربر مرتبط' },
    { key: 'phone', title: 'تلفن' },
    { key: 'startDate', title: 'تاریخ شروع', render: (value) => formatDate(value) },
    { key: 'score', title: 'امتیاز' },
    { key: 'status', title: 'وضعیت', render: (value) => <Badge tone={value === 'active' ? 'emerald' : 'red'}>{value === 'active' ? 'فعال' : 'غیرفعال'}</Badge> },
    {
      key: 'actions',
      title: 'عملیات',
      render: (_, row) => (
        <div className="flex flex-wrap gap-2">
          {canUpdate ? <SecondaryButton type="button" onClick={() => openEditModal(row)}>ویرایش</SecondaryButton> : null}
          {canDelete ? <DangerButton type="button" onClick={() => handleDelete(row)}>حذف</DangerButton> : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="مدیریت رانندگان" description="ثبت رانندگان و اتصال آن ها به کاربران نقش راننده" action={canCreate ? <PrimaryButton type="button" onClick={openCreateModal}>راننده جدید</PrimaryButton> : null} />
      <ErrorAlert message={error} />

      <SectionCard title="فیلترها">
        <div className="grid gap-4 md:grid-cols-2">
          <ToolbarInput placeholder="جستجو بر اساس نام، نام کاربری یا تلفن" value={search} onChange={(event) => setSearch(event.target.value)} />
          <ToolbarSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">همه وضعیت ها</option>
            <option value="active">فعال</option>
            <option value="inactive">غیرفعال</option>
          </ToolbarSelect>
        </div>
      </SectionCard>

      <SectionCard title="فهرست رانندگان">
        {loading ? <p className="text-sm text-slate-500">در حال بارگذاری...</p> : <DataTable columns={columns} rows={filteredRows} emptyTitle="راننده ای برای نمایش وجود ندارد." />}
      </SectionCard>

      <Modal open={modalOpen} title={formMode === 'edit' ? 'ویرایش راننده' : 'ثبت راننده'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <ErrorAlert message={formError} />
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="کاربر راننده">
              <Select value={formData.userId} onChange={(event) => setFormData((prev) => ({ ...prev, userId: event.target.value }))}>
                <option value="">بدون اتصال به کاربر</option>
                {driverUsers.map((option) => <option key={option.id} value={option.id}>{option.fullName || option.userName}</option>)}
              </Select>
            </Field>
            <Field label="نام راننده">
              <Input value={formData.name} onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))} required />
            </Field>
            <Field label="تلفن">
              <Input value={formData.phone} onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))} />
            </Field>
            <Field label="تاریخ شروع">
              <Input type="date" value={formData.startDate} onChange={(event) => setFormData((prev) => ({ ...prev, startDate: event.target.value }))} required />
            </Field>
            <Field label="امتیاز">
              <Input type="number" min="0" max="10" step="0.1" value={formData.score} onChange={(event) => setFormData((prev) => ({ ...prev, score: event.target.value }))} required />
            </Field>
            <Field label="وضعیت">
              <Select value={formData.status} onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))}>
                <option value="active">فعال</option>
                <option value="inactive">غیرفعال</option>
              </Select>
            </Field>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <SecondaryButton type="button" onClick={() => setModalOpen(false)}>انصراف</SecondaryButton>
            <PrimaryButton type="submit" disabled={submitting}>{submitting ? 'در حال ذخیره...' : 'ذخیره'}</PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
