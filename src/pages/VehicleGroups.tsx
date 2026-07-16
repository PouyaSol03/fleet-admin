// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { vehiclesAPI } from '../api/vehicles';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { extractApiError, normalizeCollection } from '../utils/formatters';
import {
  AccessDenied,
  ConfirmationModal,
  DataTable,
  ErrorAlert,
  Field,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  PrimaryButton,
  RowActionMenu,
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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const canView = hasPermission(user, 'vehicle_groups.view');
  const canCreate = hasPermission(user, 'vehicle_groups.create');
  const canUpdate = hasPermission(user, 'vehicle_groups.update');
  const canDelete = hasPermission(user, 'vehicle_groups.delete');

  const groupListParams = useMemo(() => {
    const params = {};
    const query = debouncedSearch.trim();

    if (query) params.search = query;

    return params;
  }, [debouncedSearch]);

  const loadData = async (params = groupListParams) => {
    const response = await vehiclesAPI.listGroups(params);
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
  }, [canView, groupListParams]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

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

  const handleDelete = (row) => {
    setDeleteTarget(row);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await vehiclesAPI.deleteGroup(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(extractApiError(err, 'حذف گروه انجام نشد.'));
    } finally {
      setDeleteSubmitting(false);
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
      <PageHeader title="گروه های خودرو" description="ساخت دسته بندی برای تقسیم خودروها بین واحدها یا ماموریت ها" action={canCreate ? <PrimaryButton type="button" onClick={openCreateModal}>گروه جدید</PrimaryButton> : null} />
      <ErrorAlert message={error} />
      <SectionCard title="جستجو">
        <ToolbarInput placeholder="جستجو بر اساس نام یا توضیحات" value={search} onChange={(event) => setSearch(event.target.value)} />
      </SectionCard>
      <SectionCard title="فهرست گروه ها">
        {loading || search.trim() !== debouncedSearch.trim() ? <LoadingState/> : <DataTable columns={columns} rows={filteredRows} emptyTitle="گروهی برای نمایش وجود ندارد." />}
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

      <ConfirmationModal
        open={Boolean(deleteTarget)}
        mode="delete"
        message={`آیا از حذف گروه ${deleteTarget?.name || ''} اطمینان دارید؟`}
        loading={deleteSubmitting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
