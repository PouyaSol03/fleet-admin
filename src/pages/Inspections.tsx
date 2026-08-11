// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { vehiclesAPI } from '../api/vehicles';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { extractApiError, formatDate, normalizeCollection } from '../utils/formatters';
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
} from '../components/shared/UI';

function InspectionsTableSkeleton() {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-[#E6E6E6] bg-white" aria-hidden="true">
      <div className="min-w-[54rem] animate-pulse">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_.9fr_.55fr] gap-4 border-b border-[#EFEFEF] bg-[#F8FAFC] px-4 py-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-3 w-4/5 rounded-full bg-[#E5E7EB]" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_.9fr_.55fr] items-center gap-4 border-b border-[#F1F5F9] px-4 py-4 last:border-b-0">
            {Array.from({ length: 6 }).map((_, cellIndex) => (
              <div
                key={cellIndex}
                className={`${cellIndex === 4 ? 'h-7 w-20 rounded-lg' : cellIndex === 5 ? 'h-8 w-9 rounded-lg' : 'h-4 w-4/5 rounded-full'} bg-[#EEF2F7] ${cellIndex === 5 ? 'justify-self-center' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const emptyForm = {
  vehicleId: '',
  inspectionDate: new Date().toISOString().slice(0, 10),
  status: 'passed',
  inspectorName: '',
  inspectionReport: '',
  nextInspectionDate: '',
};

export default function Inspections() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [vehicles, setVehicles] = useState([]);
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

  const canView = hasPermission(user, 'inspections.view');
  const canCreate = hasPermission(user, 'inspections.create');
  const canUpdate = hasPermission(user, 'inspections.update');
  const canDelete = hasPermission(user, 'inspections.delete');

  const inspectionListParams = useMemo(() => {
    const params = {};

    if (statusFilter) params.status = statusFilter;

    return params;
  }, [statusFilter]);

  const loadData = async (params = inspectionListParams) => {
    const [inspectionsResponse, vehiclesResponse] = await Promise.all([
      vehiclesAPI.listInspections(params),
      vehiclesAPI.list(),
    ]);
    setRows(normalizeCollection(inspectionsResponse.data));
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
        if (mounted) setError(extractApiError(err, 'بارگذاری بازرسی ها انجام نشد.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [canView, inspectionListParams]);

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
      vehicleId: row.vehicleId ? String(row.vehicleId) : '',
      inspectionDate: row.inspectionDate || '',
      status: row.status || 'passed',
      inspectorName: row.inspectorName || '',
      inspectionReport: row.inspectionReport || '',
      nextInspectionDate: row.nextInspectionDate || '',
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
      await vehiclesAPI.deleteInspection(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(extractApiError(err, 'حذف بازرسی انجام نشد.'));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');

    const payload = {
      vehicleId: Number(formData.vehicleId),
      inspectionDate: formData.inspectionDate,
      status: formData.status,
      inspectorName: formData.inspectorName.trim(),
      inspectionReport: formData.inspectionReport.trim(),
      nextInspectionDate: formData.nextInspectionDate || null,
    };

    try {
      if (editingId) {
        await vehiclesAPI.updateInspection(editingId, payload);
      } else {
        await vehiclesAPI.createInspection(payload);
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(extractApiError(err, 'ذخیره بازرسی انجام نشد.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!canView) return <AccessDenied />;

  const statusTone = {
    passed: 'emerald',
    needs_repair: 'amber',
    failed: 'red',
  };

  const statusLabel = {
    passed: 'تایید شده',
    needs_repair: 'نیاز به تعمیر',
    failed: 'رد شده',
  };

  const columns = [
    { key: 'vehicleModel', title: 'خودرو' },
    { key: 'inspectionDate', title: 'تاریخ بازرسی', render: (value) => formatDate(value) },
    { key: 'inspectorName', title: 'بازرس' },
    { key: 'nextInspectionDate', title: 'بازرسی بعدی', render: (value) => formatDate(value) },
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
      <PageHeader title="بازرسی خودروها" description="ثبت نتیجه بازرسی و برنامه ریزی زمان بررسی بعدی" action={canCreate ? <PrimaryButton type="button" onClick={openCreateModal}>بازرسی جدید</PrimaryButton> : null} />
      <ErrorAlert message={error} />
      <SectionCard title="فیلتر وضعیت">
        <ToolbarSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">همه وضعیت ها</option>
          <option value="passed">تایید شده</option>
          <option value="needs_repair">نیاز به تعمیر</option>
          <option value="failed">رد شده</option>
        </ToolbarSelect>
      </SectionCard>
      <SectionCard title="فهرست بازرسی ها">
        {loading ? <InspectionsTableSkeleton /> : <DataTable columns={columns} rows={filteredRows} emptyTitle="بازرسی ثبت نشده است." />}
      </SectionCard>
      <Modal open={modalOpen} title={editingId ? 'ویرایش بازرسی' : 'ثبت بازرسی'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <ErrorAlert message={formError} />
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="خودرو">
              <Select value={formData.vehicleId} onChange={(event) => setFormData((prev) => ({ ...prev, vehicleId: event.target.value }))} required>
                <option value="">انتخاب کنید</option>
                {vehicles.map((option) => <option key={option.id} value={option.id}>{option.model}</option>)}
              </Select>
            </Field>
            <Field label="نام بازرس">
              <Input value={formData.inspectorName} onChange={(event) => setFormData((prev) => ({ ...prev, inspectorName: event.target.value }))} required />
            </Field>
            <Field label="تاریخ بازرسی">
              <Input type="date" value={formData.inspectionDate} onChange={(event) => setFormData((prev) => ({ ...prev, inspectionDate: event.target.value }))} required />
            </Field>
            <Field label="وضعیت">
              <Select value={formData.status} onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))}>
                <option value="passed">تایید شده</option>
                <option value="needs_repair">نیاز به تعمیر</option>
                <option value="failed">رد شده</option>
              </Select>
            </Field>
            <Field label="تاریخ بازرسی بعدی">
              <Input type="date" value={formData.nextInspectionDate} onChange={(event) => setFormData((prev) => ({ ...prev, nextInspectionDate: event.target.value }))} />
            </Field>
          </div>
          <Field label="گزارش بازرسی">
            <Textarea rows="5" value={formData.inspectionReport} onChange={(event) => setFormData((prev) => ({ ...prev, inspectionReport: event.target.value }))} />
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
        message={`آیا از حذف بازرسی خودرو ${deleteTarget?.vehicleModel || ''} اطمینان دارید؟`}
        loading={deleteSubmitting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
