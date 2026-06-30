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
  LoadingState,
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

function ToggleField({ checked, onChange, label, hint, disabled = false }) {
  return (
    <label className={`flex min-w-0 items-start gap-3 rounded-xl border border-[#D9D9D9] bg-white p-4 text-right transition ${disabled ? 'opacity-60' : 'hover:border-[#206AB4]'}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-[#206AB4]"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-6 text-[#222222]">{label}</span>
        {hint ? <span className="mt-1 block text-xs leading-5 text-[#737373]">{hint}</span> : null}
      </span>
    </label>
  );
}

function InfoPanel({ title, children }) {
  return (
    <div className="rounded-xl border border-[#D9D9D9] bg-[#FAFBFC] p-4">
      <div className="text-sm font-bold text-[#222222]">{title}</div>
      <div className="mt-2 text-sm leading-7 text-[#606060]">{children}</div>
    </div>
  );
}

function WizardStep({ step, current, title }) {
  const active = step === current;
  const done = step < current;

  return (
    <div className={`flex min-w-0 items-center gap-3 rounded-xl border px-4 py-3 ${active ? 'border-[#206AB4] bg-[#EAF3FC]' : done ? 'border-[#BFE3CA] bg-[#E8F7EF]' : 'border-[#D9D9D9] bg-white'}`}>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${active ? 'bg-[#206AB4] text-white' : done ? 'bg-[#16803C] text-white' : 'bg-[#EFEFEF] text-[#606060]'}`}>
        {step}
      </span>
      <span className="truncate text-sm font-semibold text-[#222222]">{title}</span>
    </div>
  );
}

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
  const [wizardStep, setWizardStep] = useState(1);
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
  const selectedParent = useMemo(
    () => parentOptions.find((option) => String(option.id) === String(formData.parentId)),
    [formData.parentId, parentOptions],
  );
  const selectedAccessGroup = useMemo(
    () => accessGroups.find((group) => String(group.id) === String(formData.accessGroupId)),
    [accessGroups, formData.accessGroupId],
  );

  const updateFormField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const openCreateModal = () => {
    setFormMode('create');
    setWizardStep(1);
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
    setWizardStep(1);
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

  const closeModal = () => {
    setModalOpen(false);
    setWizardStep(1);
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (wizardStep === 1) {
      if (!formData.userName.trim()) {
        setFormError('نام کاربری را وارد کنید.');
        return;
      }
      if (formMode === 'create' && !formData.password.trim()) {
        setFormError('رمز عبور را وارد کنید.');
        return;
      }
      setFormError('');
      setWizardStep(2);
      return;
    }

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
      key: 'access',
      title: 'دسترسی',
      render: (_, row) => (
        <div className="flex flex-wrap items-center gap-2">
          {row.isSuperuser ? <Badge tone="red">سوپر ادمین</Badge> : null}
          {row.accessGroupName ? <Badge tone="blue">{row.accessGroupName}</Badge> : <Badge tone="slate">بدون گروه</Badge>}
          {row.isDriver ? <Badge tone="purple">راننده</Badge> : null}
        </div>
      ),
    },
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
          <LoadingState/>
        ) : (
          <DataTable columns={columns} rows={filteredRows} emptyTitle="کاربری یافت نشد." />
        )}
      </SectionCard>

      <Modal open={modalOpen} title={formMode === 'edit' ? 'ویرایش کاربر' : 'ایجاد کاربر'} onClose={closeModal}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <ErrorAlert message={formError} />

          <div className="grid gap-3 md:grid-cols-2">
            <WizardStep step={1} current={wizardStep} title="اطلاعات ورود و مشخصات" />
            <WizardStep step={2} current={wizardStep} title="دسترسی و سرپرست" />
          </div>

          {wizardStep === 1 ? (
            <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
              <div className="rounded-2xl border border-[#D9D9D9] bg-white p-4">
                <h4 className="text-sm font-bold text-[#222222]">اطلاعات کاربر</h4>
                <p className="mt-1 text-sm leading-6 text-[#737373]">
                  اطلاعات ورود و مشخصات فرد را وارد کنید. نام کاربری می‌تواند شماره موبایل یا یک نام دلخواه باشد.
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="نام کاربری برای ورود">
                    <Input
                      autoComplete="username"
                      value={formData.userName}
                      onChange={(event) => updateFormField('userName', event.target.value)}
                      placeholder="مثلا 09123456789"
                      required
                    />
                  </Field>
                  <Field label={formMode === 'edit' ? 'رمز عبور جدید' : 'رمز عبور'} hint={formMode === 'edit' ? 'اگر نمی‌خواهید رمز تغییر کند، این قسمت را خالی بگذارید.' : ''}>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={(event) => updateFormField('password', event.target.value)}
                      required={formMode === 'create'}
                    />
                  </Field>
                  <Field label="نام">
                    <Input value={formData.firstName} onChange={(event) => updateFormField('firstName', event.target.value)} />
                  </Field>
                  <Field label="نام خانوادگی">
                    <Input value={formData.lastName} onChange={(event) => updateFormField('lastName', event.target.value)} />
                  </Field>
                  <Field label="شماره موبایل">
                    <Input
                      type="tel"
                      inputMode="tel"
                      dir="ltr"
                      value={formData.phone}
                      onChange={(event) => updateFormField('phone', event.target.value)}
                      placeholder="09123456789"
                    />
                  </Field>
                  <Field label="کد ملی">
                    <Input
                      inputMode="numeric"
                      dir="ltr"
                      maxLength={10}
                      value={formData.nationalCode}
                      onChange={(event) => updateFormField('nationalCode', event.target.value)}
                      placeholder="0012345678"
                    />
                  </Field>
                </div>
              </div>

              <aside className="space-y-4">
                <InfoPanel title="راهنما">
                  نام کاربری همان چیزی است که کاربر برای ورود به سامانه وارد می‌کند.
                </InfoPanel>
                <InfoPanel title="وضعیت حساب">
                  در مرحله بعد مشخص می‌کنید کاربر زیرمجموعه چه کسی باشد و چه گروه دسترسی داشته باشد.
                </InfoPanel>
              </aside>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
              <div className="rounded-2xl border border-[#D9D9D9] bg-white p-4">
                <h4 className="text-sm font-bold text-[#222222]">دسترسی کاربر</h4>
                <p className="mt-1 text-sm leading-6 text-[#737373]">
                  سرپرست مشخص می‌کند کاربر زیرمجموعه چه کسی است. گروه دسترسی مشخص می‌کند کاربر چه بخش‌هایی را می‌بیند.
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="سرپرست">
                    <Select value={formData.parentId} onChange={(event) => updateFormField('parentId', event.target.value)}>
                      <option value="">ندارد</option>
                      {parentOptions.map((option) => (
                        <option key={option.id} value={option.id}>{option.fullName || option.userName}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label="گروه دسترسی"
                    hint={formData.isSuperuser ? 'برای مدیر کل سامانه نیازی به انتخاب گروه نیست.' : ''}
                  >
                    <Select
                      value={formData.accessGroupId}
                      onChange={(event) => updateFormField('accessGroupId', event.target.value)}
                      disabled={formData.isSuperuser}
                    >
                      <option value="">بدون گروه</option>
                      {accessGroups.map((group) => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {canAssignSuperuser ? (
                    <ToggleField
                      checked={formData.isSuperuser}
                      onChange={(checked) => setFormData((prev) => ({
                        ...prev,
                        isSuperuser: checked,
                        accessGroupId: checked ? '' : prev.accessGroupId,
                      }))}
                      label="مدیر کل سامانه"
                      hint="به همه بخش‌ها و همه اطلاعات دسترسی دارد."
                    />
                  ) : null}
                  <ToggleField
                    checked={formData.isActive}
                    onChange={(checked) => updateFormField('isActive', checked)}
                    label="حساب فعال باشد"
                    hint="اگر خاموش باشد، کاربر امکان استفاده از پنل را ندارد."
                  />
                </div>
              </div>

              <aside className="space-y-4">
                <InfoPanel title="زیرمجموعه">
                  {selectedParent ? (
                    <>این کاربر زیرمجموعه <strong className="text-[#222222]">{selectedParent.fullName || selectedParent.userName}</strong> خواهد بود.</>
                  ) : (
                    <>برای این کاربر سرپرست انتخاب نشده است.</>
                  )}
                </InfoPanel>
                <InfoPanel title="گروه دسترسی">
                  {formData.isSuperuser ? (
                    <>این کاربر مدیر کل سامانه است و به گروه دسترسی نیاز ندارد.</>
                  ) : selectedAccessGroup ? (
                    <>گروه <strong className="text-[#222222]">{selectedAccessGroup.name}</strong> انتخاب شده است.</>
                  ) : (
                    <>بدون گروه دسترسی، کاربر بعد از ورود منویی در پنل نمی‌بیند.</>
                  )}
                </InfoPanel>
              </aside>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <SecondaryButton type="button" onClick={wizardStep === 1 ? closeModal : () => setWizardStep(1)}>
              {wizardStep === 1 ? 'انصراف' : 'مرحله قبل'}
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={submitting}>
              {wizardStep === 1 ? 'مرحله بعد' : submitting ? 'در حال ذخیره...' : 'ذخیره کاربر'}
            </PrimaryButton>
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
