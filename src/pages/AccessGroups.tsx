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

const permissionLabels = {
  dashboard: 'داشبورد',
  reports: 'گزارش‌ها',
  system: 'سیستم',
  users: 'کاربران',
  access_groups: 'گروه‌های دسترسی',
  drivers: 'رانندگان',
  vehicles: 'خودروها',
  vehicle_types: 'نوع خودرو',
  vehicle_groups: 'گروه خودرو',
  inspections: 'بازرسی‌ها',
  map: 'نقشه',
  missions: 'ماموریت‌ها',
  mission_requests: 'درخواست خودرو',
};

const actionLabels = {
  view: 'مشاهده',
  create: 'ایجاد',
  update: 'ویرایش',
  delete: 'حذف',
  configure: 'تنظیمات',
  'financial.view': 'گزارش مالی',
  'operational.view': 'گزارش عملکرد',
};

const emptyForm = {
  code: '',
  name: '',
  parentId: '',
  isActive: true,
  permissionCodes: [],
};

function generateAccessGroupCode() {
  return `group_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function getPermissionDomain(code) {
  if (code.startsWith('vehicle_types.')) return 'vehicle_types';
  if (code.startsWith('vehicle_groups.')) return 'vehicle_groups';
  if (code.startsWith('mission_requests.')) return 'mission_requests';
  return code.split('.')[0] || 'other';
}

function getPermissionAction(code) {
  const parts = code.split('.');
  const action = parts.slice(1).join('.') || code;
  return actionLabels[action] || action;
}

function getPermissionDisplayText(code) {
  const domain = getPermissionDomain(code);
  return `${permissionLabels[domain] || domain} ${getPermissionAction(code)}`;
}

function PermissionCheckbox({ code, checked, inherited, onToggle }) {
  return (
    <label className={`flex min-w-0 items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${checked ? 'border-[#206AB4] bg-[#EAF3FC]' : 'border-[#E8E8E8] bg-white hover:border-[#A9C9EA]'} ${inherited ? 'opacity-70' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={inherited}
        onChange={(event) => onToggle(code, event.target.checked)}
        className="h-4 w-4 shrink-0 accent-[#206AB4]"
      />
      <span className="min-w-0 flex-1 text-right text-sm font-semibold text-[#222222]">{getPermissionAction(code)}</span>
      <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs text-[#737373]">{inherited ? 'از گروه مادر' : 'مستقیم'}</span>
    </label>
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

export default function AccessGroups() {
  const { user } = useAuth();

  const [rows, setRows] = useState([]);
  const [permissionCodes, setPermissionCodes] = useState([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [permissionSearch, setPermissionSearch] = useState('');
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
    const blockedIds = new Set([editingId]);
    const collectChildren = (parentId) => {
      rows.forEach((row) => {
        if (String(row.parentId || '') === String(parentId) && !blockedIds.has(row.id)) {
          blockedIds.add(row.id);
          collectChildren(row.id);
        }
      });
    };
    if (editingId) collectChildren(editingId);
    return rows.filter((row) => !blockedIds.has(row.id));
  }, [rows, editingId]);

  const selectedParent = useMemo(
    () => rows.find((row) => String(row.id) === String(formData.parentId)),
    [formData.parentId, rows],
  );

  const inheritedPermissionCodes = useMemo(() => {
    const inherited = new Set();
    const seen = new Set();
    let current = selectedParent;

    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      (current.permissionCodes || []).forEach((code) => inherited.add(code));
      current = rows.find((row) => String(row.id) === String(current.parentId));
    }

    return inherited;
  }, [rows, selectedParent]);

  const effectivePermissionCount = useMemo(() => {
    return new Set([...formData.permissionCodes, ...inheritedPermissionCodes]).size;
  }, [formData.permissionCodes, inheritedPermissionCodes]);

  const groupedPermissionCodes = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();
    return permissionCodes
      .filter((code) => {
        if (!query) return true;
        return code.toLowerCase().includes(query) || getPermissionDisplayText(code).toLowerCase().includes(query);
      })
      .reduce((groups, code) => {
        const domain = getPermissionDomain(code);
        if (!groups[domain]) groups[domain] = [];
        groups[domain].push(code);
        return groups;
      }, {});
  }, [permissionCodes, permissionSearch]);

  const openCreateModal = () => {
    setFormMode('create');
    setWizardStep(1);
    setEditingId(null);
    setFormData({ ...emptyForm, code: generateAccessGroupCode(), permissionCodes: [] });
    setPermissionSearch('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setFormMode('edit');
    setWizardStep(1);
    setEditingId(row.id);
    setFormData({
      code: row.code || '',
      name: row.name || '',
      parentId: row.parentId ? String(row.parentId) : '',
      isActive: row.isActive ?? row.is_active ?? true,
      permissionCodes: Array.isArray(row.permissionCodes) ? row.permissionCodes : [],
    });
    setPermissionSearch('');
    setFormError('');
    setModalOpen(true);
  };

  const handlePermissionToggle = (code, checked) => {
    setFormData((prev) => {
      const selected = new Set(prev.permissionCodes || []);
      if (checked) selected.add(code);
      else selected.delete(code);
      return { ...prev, permissionCodes: Array.from(selected).sort() };
    });
  };

  const setPermissionGroup = (codes, checked) => {
    setFormData((prev) => {
      const selected = new Set(prev.permissionCodes || []);
      codes.forEach((code) => {
        if (inheritedPermissionCodes.has(code) && !selected.has(code)) return;
        if (checked) selected.add(code);
        else selected.delete(code);
      });
      return { ...prev, permissionCodes: Array.from(selected).sort() };
    });
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

  const closeModal = () => {
    setModalOpen(false);
    setWizardStep(1);
    setPermissionSearch('');
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (wizardStep === 1) {
      if (!formData.name.trim()) {
        setFormError('نام گروه را وارد کنید.');
        return;
      }
      setFormError('');
      setWizardStep(2);
      return;
    }

    setSubmitting(true);
    setFormError('');

    const payload = {
      code: (formData.code || generateAccessGroupCode()).trim(),
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
    { key: 'parentName', title: 'گروه مادر' },
    {
      key: 'permissionCodes',
      title: 'دسترسی‌های مستقیم',
      render: (value) => <Badge tone="blue">{Array.isArray(value) ? value.length : 0} دسترسی</Badge>,
    },
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
        description="تعریف گروه‌ها و دسترسی‌هایی که کاربران با آن‌ها کار می‌کنند"
        action={canCreate ? <PrimaryButton type="button" onClick={openCreateModal}>گروه دسترسی جدید</PrimaryButton> : null}
      />

      <ErrorAlert message={error} />

      <SectionCard title="فیلترها">
        <div className="grid gap-4 md:grid-cols-2">
          <ToolbarInput
            placeholder="جستجو بر اساس نام یا گروه مادر"
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
          <LoadingState/>
        ) : (
          <DataTable columns={columns} rows={filteredRows} emptyTitle="گروه دسترسی یافت نشد." />
        )}
      </SectionCard>

      <Modal open={modalOpen} title={formMode === 'edit' ? 'ویرایش گروه دسترسی' : 'ایجاد گروه دسترسی'} onClose={closeModal}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <ErrorAlert message={formError} />

          <div className="grid gap-3 md:grid-cols-2">
            <WizardStep step={1} current={wizardStep} title="نام و گروه مادر" />
            <WizardStep step={2} current={wizardStep} title="انتخاب دسترسی‌ها" />
          </div>

          {wizardStep === 1 ? (
            <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
              <div className="rounded-2xl border border-[#D9D9D9] bg-white p-4">
                <h4 className="text-sm font-bold text-[#222222]">اطلاعات گروه</h4>
                <p className="mt-1 text-sm leading-6 text-[#737373]">
                  نام گروه را وارد کنید و در صورت نیاز یک گروه مادر انتخاب کنید.
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="نام گروه">
                    <Input
                      value={formData.name}
                      onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="مثلا سرپرست کارکنان"
                      required
                    />
                  </Field>
                  <Field label="گروه مادر" hint="اگر انتخاب شود، این گروه دسترسی‌های آن گروه را هم خواهد داشت.">
                    <Select value={formData.parentId} onChange={(event) => setFormData((prev) => ({ ...prev, parentId: event.target.value }))}>
                      <option value="">ندارد</option>
                      {parentOptions.map((option) => (
                        <option key={option.id} value={option.id}>{option.name}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <label className="mt-4 flex min-w-0 items-start gap-3 rounded-xl border border-[#D9D9D9] bg-white p-4 text-right transition hover:border-[#206AB4]">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(event) => setFormData((prev) => ({ ...prev, isActive: event.target.checked }))}
                    className="mt-1 h-4 w-4 shrink-0 accent-[#206AB4]"
                  />
                  <span>
                    <span className="block text-sm font-semibold leading-6 text-[#222222]">این گروه فعال باشد</span>
                    <span className="mt-1 block text-xs leading-5 text-[#737373]">اگر خاموش باشد، کاربران این گروه دسترسی نمی‌گیرند.</span>
                  </span>
                </label>
              </div>

              <aside className="space-y-3">
                <div className="rounded-2xl border border-[#D9D9D9] bg-[#FAFBFC] p-4 text-sm leading-7 text-[#606060]">
                  <div className="font-bold text-[#222222]">گروه مادر یعنی چه؟</div>
                  <p className="mt-2">
                    اگر یک گروه مادر انتخاب کنید، لازم نیست دسترسی‌های تکراری را دوباره انتخاب کنید.
                  </p>
                </div>
                <div className="rounded-2xl border border-[#D9D9D9] bg-white p-4 text-sm leading-7 text-[#606060]">
                  {selectedParent ? (
                    <>این گروه دسترسی‌های <strong className="text-[#222222]">{selectedParent.name}</strong> را هم خواهد داشت.</>
                  ) : (
                    <>برای این گروه، فقط دسترسی‌هایی که در مرحله بعد انتخاب می‌کنید اعمال می‌شود.</>
                  )}
                </div>
              </aside>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
                <div className="rounded-2xl border border-[#D9D9D9] bg-white p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[#222222]">دسترسی‌های این گروه</h4>
                      <p className="mt-1 text-xs leading-5 text-[#737373]">
                        گزینه‌هایی که از گروه مادر آمده‌اند مشخص شده‌اند و نیاز به انتخاب دوباره ندارند.
                      </p>
                    </div>
                    <div className="w-full lg:w-72">
                      <ToolbarInput
                        placeholder="جستجوی دسترسی"
                        value={permissionSearch}
                        onChange={(event) => setPermissionSearch(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mt-4 max-h-[44vh] space-y-4 overflow-y-auto pr-1">
                    {Object.entries(groupedPermissionCodes).map(([domain, codes]) => {
                      const ownCodes = codes.filter((code) => (
                        !inheritedPermissionCodes.has(code) || formData.permissionCodes.includes(code)
                      ));
                      const allOwnSelected = ownCodes.length > 0 && ownCodes.every((code) => formData.permissionCodes.includes(code));

                      return (
                        <section key={domain} className="rounded-xl border border-[#E8E8E8] bg-[#FAFBFC] p-3">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-[#222222]">{permissionLabels[domain] || domain}</span>
                              <Badge tone="slate">{codes.length}</Badge>
                            </div>
                            {ownCodes.length ? (
                              <button
                                type="button"
                                onClick={() => setPermissionGroup(ownCodes, !allOwnSelected)}
                                className="rounded-lg border border-[#D9D9D9] bg-white px-3 py-1.5 text-xs font-semibold text-[#206AB4] transition hover:border-[#206AB4] hover:bg-[#EAF3FC]"
                              >
                                {allOwnSelected ? 'برداشتن این بخش' : 'انتخاب این بخش'}
                              </button>
                            ) : null}
                          </div>
                          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                            {codes.map((code) => (
                              <PermissionCheckbox
                                key={code}
                                code={code}
                                checked={formData.permissionCodes.includes(code) || inheritedPermissionCodes.has(code)}
                                inherited={inheritedPermissionCodes.has(code) && !formData.permissionCodes.includes(code)}
                                onToggle={handlePermissionToggle}
                              />
                            ))}
                          </div>
                        </section>
                      );
                    })}
                    {Object.keys(groupedPermissionCodes).length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[#D9D9D9] px-4 py-8 text-center text-sm text-[#737373]">
                        دسترسی‌ای با این جستجو پیدا نشد.
                      </div>
                    ) : null}
                  </div>
                </div>

                <aside className="space-y-3">
                  <div className="rounded-2xl border border-[#D9D9D9] bg-[#FAFBFC] p-4">
                    <div className="text-sm font-bold text-[#222222]">خلاصه دسترسی‌ها</div>
                    <div className="mt-3 space-y-2 text-sm leading-7 text-[#606060]">
                      <div className="flex items-center justify-between gap-3">
                        <span>انتخاب‌شده</span>
                        <Badge tone="blue">{formData.permissionCodes.length}</Badge>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>از گروه مادر</span>
                        <Badge tone="slate">{inheritedPermissionCodes.size}</Badge>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-[#D9D9D9] pt-2">
                        <span className="font-semibold text-[#222222]">مجموع دسترسی</span>
                        <Badge tone="emerald">{effectivePermissionCount}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#D9D9D9] bg-white p-4 text-sm leading-7 text-[#606060]">
                    نام گروه: <strong className="text-[#222222]">{formData.name || 'بدون نام'}</strong>
                  </div>
                </aside>
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <SecondaryButton type="button" onClick={wizardStep === 1 ? closeModal : () => setWizardStep(1)}>
              {wizardStep === 1 ? 'انصراف' : 'مرحله قبل'}
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={submitting}>
              {wizardStep === 1 ? 'مرحله بعد' : submitting ? 'در حال ذخیره...' : 'ذخیره گروه'}
            </PrimaryButton>
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
