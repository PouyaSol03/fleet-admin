// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { usersAPI } from '../api/users';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { extractApiError, normalizeCollection } from '../utils/formatters';
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
  ToolbarInput,
  ToolbarSelect,
} from '../components/shared/UI';

const emptyForm = {
  code: '',
  name: '',
  parentId: '',
  isActive: true,
  permissionCodes: [],
};

export default function AccessGroups() {
  const { user } = useAuth();

  const [rows, setRows] = useState([]);
  const [permissionCodes, setPermissionCodes] = useState([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const canView = hasPermission(user, 'access_groups.view');
  const canCreate = hasPermission(user, 'access_groups.create');
  const canUpdate = hasPermission(user, 'access_groups.update');
  const canDelete = hasPermission(user, 'access_groups.delete');

  const loadData = async () => {
    const [groupsResponse, codesResponse] = await Promise.all([
      usersAPI.listAccessGroups(),
      usersAPI.permissionCodes(),
    ]);
    setRows(normalizeCollection(groupsResponse.data));
    setPermissionCodes(codesResponse.data?.permissionCodes || []);
  };

  useEffect(() => {
    if (!canView) return;

    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        await loadData();
      } catch (err) {
        if (mounted) setError(extractApiError(err, 'بارگذاری گروه‌های دسترسی انجام نشد.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [canView]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const q = search.trim().toLowerCase();
      const matchesQuery = !q || [row.name, row.code, row.parentName]
        .some((value) => String(value || '').toLowerCase().includes(q));
      const rowActive = row.isActive ?? row.is_active;
      const matchesActive = !activeFilter || String(rowActive) === activeFilter;
      return matchesQuery && matchesActive;
    });
  }, [rows, search, activeFilter]);

  const parentOptions = useMemo(() => {
    return rows.filter((row) => row.id !== editingId);
  }, [rows, editingId]);

  const openCreateModal = () => {
    setFormMode('create');
    setEditingId(null);
    setFormData({ ...emptyForm, permissionCodes: [] });
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setFormMode('edit');
    setEditingId(row.id);
    setFormData({
      code: row.code || '',
      name: row.name || '',
      parentId: row.parentId ? String(row.parentId) : '',
      isActive: row.isActive ?? row.is_active ?? true,
      permissionCodes: Array.isArray(row.permissionCodes) ? row.permissionCodes : [],
    });
    setFormError('');
    setModalOpen(true);
  };

  const handlePermissionCodesChange = (event) => {
    const values = Array.from(event.target.selectedOptions, (option) => option.value);
    setFormData((prev) => ({ ...prev, permissionCodes: values }));
  };

  const handleDelete = (row) => {
    setDeleteTarget(row);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await usersAPI.deleteAccessGroup(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(extractApiError(err, 'حذف گروه دسترسی انجام نشد.'));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');

    const payload = {
      code: formData.code.trim(),
      name: formData.name.trim(),
      parentId: formData.parentId ? Number(formData.parentId) : null,
      isActive: Boolean(formData.isActive),
      permissionCodes: formData.permissionCodes,
    };

    try {
      if (formMode === 'edit') {
        await usersAPI.updateAccessGroup(editingId, payload);
      } else {
        await usersAPI.createAccessGroup(payload);
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(extractApiError(err, 'ذخیره گروه دسترسی انجام نشد.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!canView) return <AccessDenied />;

  const columns = [
    { key: 'name', title: 'نام' },
    { key: 'code', title: 'کد' },
    { key: 'parentName', title: 'والد' },
    { key: 'userCount', title: 'کاربران' },
    {
      key: 'isDefault',
      title: 'پیش‌فرض',
      render: (value) => <Badge tone={value ? 'blue' : 'slate'}>{value ? 'پیش‌فرض' : 'سفارشی'}</Badge>,
    },
    {
      key: 'isActive',
      title: 'وضعیت',
      render: (_, row) => {
        const active = row.isActive ?? row.is_active;
        return <Badge tone={active ? 'emerald' : 'red'}>{active ? 'فعال' : 'غیرفعال'}</Badge>;
      },
    },
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
      <PageHeader
        title="گروه‌های دسترسی"
        description="مدیریت گروه‌های دسترسی و بسته‌های مجوز"
        action={canCreate ? <PrimaryButton type="button" onClick={openCreateModal}>گروه دسترسی جدید</PrimaryButton> : null}
      />

      <ErrorAlert message={error} />

      <SectionCard title="فیلترها">
        <div className="grid gap-4 md:grid-cols-2">
          <ToolbarInput
            placeholder="جستجو بر اساس نام، کد یا والد"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <ToolbarSelect value={activeFilter} onChange={(event) => setActiveFilter(event.target.value)}>
            <option value="">همه وضعیت‌ها</option>
            <option value="true">فعال</option>
            <option value="false">غیرفعال</option>
          </ToolbarSelect>
        </div>
      </SectionCard>

      <SectionCard title="گروه‌های دسترسی" subtitle={`${filteredRows.length} گروه`}>
        {loading ? (
          <p className="text-sm text-slate-500">در حال بارگذاری...</p>
        ) : (
          <DataTable columns={columns} rows={filteredRows} emptyTitle="گروه دسترسی یافت نشد." />
        )}
      </SectionCard>

      <Modal open={modalOpen} title={formMode === 'edit' ? 'ویرایش گروه دسترسی' : 'ایجاد گروه دسترسی'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <ErrorAlert message={formError} />
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="کد">
              <Input value={formData.code} onChange={(event) => setFormData((prev) => ({ ...prev, code: event.target.value }))} required />
            </Field>
            <Field label="نام">
              <Input value={formData.name} onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))} required />
            </Field>
            <Field label="گروه والد">
              <Select value={formData.parentId} onChange={(event) => setFormData((prev) => ({ ...prev, parentId: event.target.value }))}>
                <option value="">بدون والد</option>
                {parentOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </Select>
            </Field>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <input type="checkbox" checked={formData.isActive} onChange={(event) => setFormData((prev) => ({ ...prev, isActive: event.target.checked }))} />
              گروه فعال باشد
            </label>
          </div>

          <Field label="کدهای مجوز" hint="برای انتخاب چندتایی از Ctrl/Cmd استفاده کنید.">
            <select
              multiple
              value={formData.permissionCodes}
              onChange={handlePermissionCodesChange}
              className="h-56 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              {permissionCodes.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </Field>

          <div className="flex flex-wrap justify-end gap-3">
            <SecondaryButton type="button" onClick={() => setModalOpen(false)}>انصراف</SecondaryButton>
            <PrimaryButton type="submit" disabled={submitting}>{submitting ? 'در حال ذخیره...' : 'ذخیره'}</PrimaryButton>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        open={Boolean(deleteTarget)}
        mode="delete"
        message={`آیا از حذف گروه دسترسی ${deleteTarget?.name || ''} اطمینان دارید؟`}
        loading={deleteSubmitting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
