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


function VehicleTypesTableSkeleton() {
  return (
    <div
      className="w-full overflow-hidden rounded-xl border border-[#E6E6E6] bg-white"
      aria-hidden="true"
    >
      <div className="min-w-[42rem] animate-pulse">
        <div className="grid grid-cols-[1fr_2fr_.55fr] gap-4 border-b border-[#EFEFEF] bg-[#F8FAFC] px-4 py-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-3 w-4/5 rounded-full bg-[#E5E7EB]" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid grid-cols-[1fr_2fr_.55fr] items-center gap-4 border-b border-[#F1F5F9] px-4 py-4 last:border-b-0"
          >
            <div className="h-4 w-3/4 rounded-full bg-[#EEF2F7]" />
            <div className="h-4 w-5/6 rounded-full bg-[#EEF2F7]" />
            <div className="h-8 w-9 justify-self-center rounded-lg bg-[#EEF2F7]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VehicleTypes() {
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

  const canView = hasPermission(user, 'vehicle_types.view');
  const canCreate = hasPermission(user, 'vehicle_types.create');
  const canUpdate = hasPermission(user, 'vehicle_types.update');
  const canDelete = hasPermission(user, 'vehicle_types.delete');

  const typeListParams = useMemo(() => {
    const params = {};
    const query = debouncedSearch.trim();

    if (query) params.search = query;

    return params;
  }, [debouncedSearch]);

  const loadData = async (params = typeListParams) => {
    const response = await vehiclesAPI.listTypes(params);
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
        if (mounted) setError(extractApiError(err, 'بارگذاری نوع خودرو انجام نشد.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [canView, typeListParams]);

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
      await vehiclesAPI.deleteType(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(extractApiError(err, 'حذف نوع خودرو انجام نشد.'));
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
        await vehiclesAPI.updateType(editingId, formData);
      } else {
        await vehiclesAPI.createType(formData);
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(extractApiError(err, 'ذخیره نوع خودرو انجام نشد.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!canView) return <AccessDenied />;

  const columns = [
    { key: 'name', title: 'نام نوع خودرو' },
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
      <PageHeader title="انواع خودرو" description="تعریف مدل دسته ای برای خودروهای سازمان" action={canCreate ? <PrimaryButton type="button" onClick={openCreateModal}>نوع جدید</PrimaryButton> : null} />
      <ErrorAlert message={error} />
      <SectionCard title="جستجو">
        <ToolbarInput placeholder="جستجو بر اساس نام یا توضیحات" value={search} onChange={(event) => setSearch(event.target.value)} />
      </SectionCard>
      <SectionCard title="فهرست انواع خودرو">
        {loading || search.trim() !== debouncedSearch.trim() ? <VehicleTypesTableSkeleton /> : <DataTable columns={columns} rows={filteredRows} emptyTitle="نوعی برای نمایش وجود ندارد." />}
      </SectionCard>
      <Modal open={modalOpen} title={editingId ? 'ویرایش نوع خودرو' : 'ایجاد نوع خودرو'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <ErrorAlert message={formError} />
          <Field label="نام نوع خودرو">
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
        message={`آیا از حذف نوع خودرو ${deleteTarget?.name || ''} اطمینان دارید؟`}
        loading={deleteSubmitting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
