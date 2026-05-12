// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { vehiclesAPI } from '../api/vehicles';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { extractApiError, normalizeCollection } from '../utils/formatters';
import {
  AccessDenied,
  DangerButton,
  DataTable,
  ErrorAlert,
  Field,
  Input,
  Modal,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  Textarea,
  ToolbarInput,
} from '../components/shared/UI';

const emptyForm = { name: '', description: '' };

export default function VehicleGroups() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canView = hasPermission(user, 'vehicle_groups.view');
  const canCreate = hasPermission(user, 'vehicle_groups.create');
  const canUpdate = hasPermission(user, 'vehicle_groups.update');
  const canDelete = hasPermission(user, 'vehicle_groups.delete');

  const loadData = async () => {
    const response = await vehiclesAPI.listGroups();
    setRows(normalizeCollection(response.data));
  };

  useEffect(() => {
    if (!canView) return;
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        await loadData();
      } catch (err) {
        if (mounted) setError(extractApiError(err, 'بارگذاری گروه خودرو انجام نشد.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [canView]);

  const filteredRows = useMemo(() => rows.filter((row) => [row.name, row.description].some((value) => String(value || '').toLowerCase().includes(search.toLowerCase()))), [rows, search]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingId(row.id);
    setFormData({ name: row.name || '', description: row.description || '' });
    setFormError('');
    setModalOpen(true);
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`گروه ${row.name} حذف شود؟`)) return;
    try {
      await vehiclesAPI.deleteGroup(row.id);
      await loadData();
    } catch (err) {
      setError(extractApiError(err, 'حذف گروه انجام نشد.'));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      if (editingId) {
        await vehiclesAPI.updateGroup(editingId, formData);
      } else {
        await vehiclesAPI.createGroup(formData);
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(extractApiError(err, 'ذخیره گروه انجام نشد.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!canView) return <AccessDenied />;

  const columns = [
    { key: 'name', title: 'نام گروه' },
    { key: 'description', title: 'توضیحات' },
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
      <PageHeader title="گروه های خودرو" description="ساخت دسته بندی برای تقسیم خودروها بین واحدها یا ماموریت ها" action={canCreate ? <PrimaryButton type="button" onClick={openCreateModal}>گروه جدید</PrimaryButton> : null} />
      <ErrorAlert message={error} />
      <SectionCard title="جستجو">
        <ToolbarInput placeholder="جستجو بر اساس نام یا توضیحات" value={search} onChange={(event) => setSearch(event.target.value)} />
      </SectionCard>
      <SectionCard title="فهرست گروه ها">
        {loading ? <p className="text-sm text-slate-500">در حال بارگذاری...</p> : <DataTable columns={columns} rows={filteredRows} emptyTitle="گروهی برای نمایش وجود ندارد." />}
      </SectionCard>
      <Modal open={modalOpen} title={editingId ? 'ویرایش گروه' : 'ایجاد گروه'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <ErrorAlert message={formError} />
          <Field label="نام گروه">
            <Input value={formData.name} onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))} required />
          </Field>
          <Field label="توضیحات">
            <Textarea rows="5" value={formData.description} onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))} />
          </Field>
          <div className="flex justify-end gap-3">
            <SecondaryButton type="button" onClick={() => setModalOpen(false)}>انصراف</SecondaryButton>
            <PrimaryButton type="submit" disabled={submitting}>{submitting ? 'در حال ذخیره...' : 'ذخیره'}</PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
