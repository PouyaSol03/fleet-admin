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

  const canView = hasPermission(user, 'inspections.view');
  const canCreate = hasPermission(user, 'inspections.create');
  const canUpdate = hasPermission(user, 'inspections.update');
  const canDelete = hasPermission(user, 'inspections.delete');

  const loadData = async () => {
    const [inspectionsResponse, vehiclesResponse] = await Promise.all([
      vehiclesAPI.listInspections(),
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
  }, [canView]);

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

  const handleDelete = async (row) => {
    if (!window.confirm(`بازرسی خودرو ${row.vehicleModel} حذف شود؟`)) return;
    try {
      await vehiclesAPI.deleteInspection(row.id);
      await loadData();
    } catch (err) {
      setError(extractApiError(err, 'حذف بازرسی انجام نشد.'));
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
        {loading ? <p className="text-sm text-slate-500">در حال بارگذاری...</p> : <DataTable columns={columns} rows={filteredRows} emptyTitle="بازرسی ثبت نشده است." />}
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
    </div>
  );
}
