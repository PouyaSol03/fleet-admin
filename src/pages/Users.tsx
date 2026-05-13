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
  DataTableExportButton,
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
  userName: '',
  firstName: '',
  lastName: '',
  phone: '',
  nationalCode: '',
  password: '',
  parentId: '',
  accessGroupId: '',
  isSuperuser: false,
  isActive: true,
};

export default function Users() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [accessGroups, setAccessGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [superadminFilter, setSuperadminFilter] = useState('');
  const [accessGroupFilter, setAccessGroupFilter] = useState('');
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

  const canView = hasPermission(user, 'users.view');
  const canCreate = hasPermission(user, 'users.create');
  const canUpdate = hasPermission(user, 'users.update');
  const canDelete = hasPermission(user, 'users.delete');
  const canAssignSuperuser = Boolean(user?.isSuperuser);

  const loadUsersAndMeta = async () => {
    const usersResponse = await usersAPI.list();
    setRows(normalizeCollection(usersResponse.data).filter((row) => !row.isDriver));

    try {
      const accessGroupsResponse = await usersAPI.listAccessGroups({ isActive: true });
      setAccessGroups(normalizeCollection(accessGroupsResponse.data));
    } catch {
      setAccessGroups([]);
    }
  };

  useEffect(() => {
    if (!canView) return;

    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        await loadUsersAndMeta();
      } catch (err) {
        if (mounted) setError(extractApiError(err, 'بارگذاری کاربران انجام نشد.'));
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
    const matchesQuery = !query || [row.userName, row.fullName, row.phone, row.nationalCode]
      .some((value) => String(value || '').toLowerCase().includes(query));
    const matchesAccessGroup = !accessGroupFilter || String(row.accessGroupId || '') === accessGroupFilter;
    const rowActive = row.isActive ?? row.is_active;
    const matchesStatus = !statusFilter || String(rowActive) === statusFilter;
    const matchesSuperadmin = !superadminFilter || String(Boolean(row.isSuperuser)) === superadminFilter;
    return matchesQuery && matchesAccessGroup && matchesStatus && matchesSuperadmin;
  }), [rows, search, accessGroupFilter, statusFilter, superadminFilter]);

  const parentOptions = useMemo(
    () => rows.filter((row) => row.id !== editingId && !row.isDriver),
    [rows, editingId],
  );

  const openCreateModal = () => {
    setFormMode('create');
    setEditingId(null);
    setFormData({
      ...emptyForm,
      parentId: user?.id ? String(user.id) : '',
      isSuperuser: false,
      isActive: true,
    });
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setFormMode('edit');
    setEditingId(row.id);
    setFormData({
      userName: row.userName || '',
      firstName: row.firstName || '',
      lastName: row.lastName || '',
      phone: row.phone || '',
      nationalCode: row.nationalCode || '',
      password: '',
      parentId: row.parentId ? String(row.parentId) : '',
      accessGroupId: row.accessGroupId ? String(row.accessGroupId) : '',
      isSuperuser: Boolean(row.isSuperuser),
      isActive: row.isActive ?? row.is_active ?? true,
    });
    setFormError('');
    setModalOpen(true);
  };

  const refreshUsers = async () => {
    const response = await usersAPI.list();
    setRows(normalizeCollection(response.data).filter((row) => !row.isDriver));
  };

  const handleDelete = (row) => {
    setDeleteTarget(row);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await usersAPI.delete(deleteTarget.id);
      setDeleteTarget(null);
      await refreshUsers();
    } catch (err) {
      setError(extractApiError(err, 'حذف کاربر انجام نشد.'));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');

    const payload = {
      userName: formData.userName.trim(),
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      phone: formData.phone.trim(),
      nationalCode: formData.nationalCode.trim(),
      parentId: formData.parentId ? Number(formData.parentId) : null,
      accessGroupId: formData.isSuperuser ? null : (formData.accessGroupId ? Number(formData.accessGroupId) : null),
      isSuperuser: canAssignSuperuser ? Boolean(formData.isSuperuser) : false,
      isActive: Boolean(formData.isActive),
    };

    if (formData.password.trim()) {
      payload.password = formData.password.trim();
    }

    try {
      if (formMode === 'edit') {
        await usersAPI.update(editingId, payload);
      } else {
        await usersAPI.create(payload);
      }
      setModalOpen(false);
      await refreshUsers();
    } catch (err) {
      setFormError(extractApiError(err, 'ذخیره کاربر انجام نشد.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!canView) return <AccessDenied />;

  const columns = [
    { key: 'fullName', title: 'نام' },
    { key: 'userName', title: 'نام کاربری' },
    {
      key: 'userTypeLabel',
      title: 'نوع کاربر',
      render: (_, row) => (
        <div className="flex flex-wrap items-center gap-2">
          <span>{row.userTypeLabel || row.roleLabel || '-'}</span>
          {row.isSuperuser ? <Badge tone="red">سوپر ادمین</Badge> : null}
        </div>
      ),
    },
    { key: 'accessGroupName', title: 'گروه دسترسی' },
    { key: 'parentName', title: 'والد' },
    { key: 'phone', title: 'تلفن' },
    {
      key: 'isActive',
      title: 'وضعیت',
      render: (_, row) => (
        <Badge tone={(row.isActive ?? row.is_active) ? 'emerald' : 'red'}>
          {(row.isActive ?? row.is_active) ? 'فعال' : 'غیرفعال'}
        </Badge>
      ),
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
        title="کاربران"
        description="ایجاد، ویرایش و مدیریت کاربران سازمان"
        action={canCreate ? <PrimaryButton type="button" onClick={openCreateModal}>کاربر جدید</PrimaryButton> : null}
      />

      <ErrorAlert message={error} />

      <SectionCard title="فیلترها">
        <div className="grid gap-4 md:grid-cols-4">
          <ToolbarInput
            placeholder="جستجو بر اساس نام، نام کاربری یا تلفن"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <ToolbarSelect value={accessGroupFilter} onChange={(event) => setAccessGroupFilter(event.target.value)}>
            <option value="">همه گروه های دسترسی</option>
            {accessGroups.map((group) => <option key={group.id} value={String(group.id)}>{group.name}</option>)}
          </ToolbarSelect>
          <ToolbarSelect value={superadminFilter} onChange={(event) => setSuperadminFilter(event.target.value)}>
            <option value="">همه سطوح</option>
            <option value="true">سوپر ادمین</option>
            <option value="false">کاربر عادی</option>
          </ToolbarSelect>
          <ToolbarSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">همه وضعیت ها</option>
            <option value="true">فعال</option>
            <option value="false">غیرفعال</option>
          </ToolbarSelect>
        </div>
      </SectionCard>

      <SectionCard title="کاربران" subtitle={`${filteredRows.length} کاربر`} actions={<DataTableExportButton />}>
        {loading ? (
          <p className="text-sm text-slate-500">در حال بارگذاری...</p>
        ) : (
          <DataTable columns={columns} rows={filteredRows} emptyTitle="کاربری یافت نشد." />
        )}
      </SectionCard>

      <Modal open={modalOpen} title={formMode === 'edit' ? 'ویرایش کاربر' : 'ایجاد کاربر'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <ErrorAlert message={formError} />
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="نام کاربری">
              <Input value={formData.userName} onChange={(event) => setFormData((prev) => ({ ...prev, userName: event.target.value }))} required />
            </Field>
            <Field label="نام">
              <Input value={formData.firstName} onChange={(event) => setFormData((prev) => ({ ...prev, firstName: event.target.value }))} />
            </Field>
            <Field label="نام خانوادگی">
              <Input value={formData.lastName} onChange={(event) => setFormData((prev) => ({ ...prev, lastName: event.target.value }))} />
            </Field>
            <Field label="تلفن">
              <Input value={formData.phone} onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))} />
            </Field>
            <Field label="کد ملی">
              <Input value={formData.nationalCode} onChange={(event) => setFormData((prev) => ({ ...prev, nationalCode: event.target.value }))} />
            </Field>
            <Field label="کاربر والد">
              <Select value={formData.parentId} onChange={(event) => setFormData((prev) => ({ ...prev, parentId: event.target.value }))}>
                <option value="">بدون والد</option>
                {parentOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.fullName || option.userName}</option>
                ))}
              </Select>
            </Field>
            <Field
              label="گروه دسترسی"
              hint={formData.isSuperuser ? 'برای سوپرادمین گروه دسترسی استفاده نمی شود.' : ''}
            >
              <Select
                value={formData.accessGroupId}
                onChange={(event) => setFormData((prev) => ({ ...prev, accessGroupId: event.target.value }))}
                disabled={formData.isSuperuser}
              >
                <option value="">بدون گروه</option>
                {accessGroups.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </Select>
            </Field>
            <Field label={formMode === 'edit' ? 'رمز عبور جدید' : 'رمز عبور'} hint={formMode === 'edit' ? 'برای حفظ رمز فعلی، این فیلد را خالی بگذارید.' : ''}>
              <Input type="password" value={formData.password} onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))} required={formMode === 'create'} />
            </Field>
            {canAssignSuperuser ? (
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.isSuperuser}
                  onChange={(event) => setFormData((prev) => ({
                    ...prev,
                    isSuperuser: event.target.checked,
                    accessGroupId: event.target.checked ? '' : prev.accessGroupId,
                  }))}
                />
                کاربر سوپر ادمین باشد
              </label>
            ) : null}
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <input type="checkbox" checked={formData.isActive} onChange={(event) => setFormData((prev) => ({ ...prev, isActive: event.target.checked }))} />
              کاربر فعال باشد
            </label>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <SecondaryButton type="button" onClick={() => setModalOpen(false)}>انصراف</SecondaryButton>
            <PrimaryButton type="submit" disabled={submitting}>{submitting ? 'در حال ذخیره...' : 'ذخیره'}</PrimaryButton>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        open={Boolean(deleteTarget)}
        mode="delete"
        message={`آیا از حذف کاربر ${deleteTarget?.fullName || deleteTarget?.userName || ''} اطمینان دارید؟`}
        loading={deleteSubmitting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
