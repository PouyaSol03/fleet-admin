// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from 'react';
import { missionsAPI } from '../api/missions';
import { reportsAPI } from '../api/reports';
import { usersAPI } from '../api/users';
import { vehiclesAPI } from '../api/vehicles';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { extractApiError, formatDate, normalizeCollection, toBooleanLabel } from '../utils/formatters';
import { formatPlateForDisplay } from '../utils/iranPlate';
import {
  AccessDenied,
  Badge,
  ConfirmationModal,
  DataTable,
  ErrorAlert,
  Field,
  Input,
  Modal,
  ModalForm,
  PageHeader,
  PrimaryButton,
  RowActionMenu,
  SecondaryButton,
  Select,
  SectionCard,
  Textarea,
  ToolbarSelect,
  LoadingState,
} from '../components/shared/UI';

const emptyForm = {
  title: '',
  vehicleType: 'in_city',
  missionType: 'single',
  isSpecial: false,
  suggestedDriverId: '',
  vehicleId: '',
  origin: '',
  destination: '',
  pickupPointsText: '',
  dropoffPointsText: '',
  hasFreight: false,
  freightDescription: '',
  peopleCount: '1',
  passengerIds: [],
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  notes: '',
};

const emptyDecision = {
  driverId: '',
  vehicleId: '',
  firstCost: '0',
  adminNote: '',
};

const emptyViolationForm = {
  violationType: 'other',
  severity: 'medium',
  occurredAt: new Date().toISOString().slice(0, 16),
  description: '',
};

const offenseTypeLabel = {
  overspeed: 'سرعت بیش از حد',
  harsh_driving: 'رانندگی خشن',
  dangerous_cornering: 'پیچ خطرناک',
  speeding: 'سرعت غیرمجاز',
  route_deviation: 'انحراف از مسیر',
  unauthorized_stop: 'توقف غیرمجاز',
  fuel_anomaly: 'ناهنجاری سوخت',
  other: 'سایر',
};

const severityLabel = {
  low: 'کم',
  medium: 'متوسط',
  high: 'زیاد',
  critical: 'بحرانی',
};

function joinStops(values) {
  return Array.isArray(values) ? values.join('\n') : '';
}

function parseStops(value) {
  return String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatRial(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '۰ ریال';
  return `${new Intl.NumberFormat('fa-IR').format(amount)} ریال`;
}

import { RequestForm } from '../features/requests/components/RequestForm';
import { MissionDecisionWizard } from '../features/requests/components/MissionDecisionWizard';
import { getPrimaryVehicleForDriver } from '../features/requests/utils';

export default function Requests() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionMode, setDecisionMode] = useState('accept');
  const [decisionTarget, setDecisionTarget] = useState(null);
  const [decisionData, setDecisionData] = useState(emptyDecision);
  const [decisionError, setDecisionError] = useState('');
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [violationTarget, setViolationTarget] = useState(null);
  const [violationForm, setViolationForm] = useState(emptyViolationForm);
  const [violationError, setViolationError] = useState('');
  const [violationSubmitting, setViolationSubmitting] = useState(false);

  const canView = hasPermission(user, 'mission_requests.view');
  const canCreate = hasPermission(user, 'mission_requests.create');
  const canUpdate = hasPermission(user, 'mission_requests.update');
  const canReview =
    Boolean(user?.isSuperuser) ||
    (hasPermission(user, 'missions.create') && hasPermission(user, 'mission_requests.update'));
  const canLoadDrivers = canReview || Boolean(user?.isSuperuser) || hasPermission(user, 'drivers.view');
  const canLoadVehicles = canReview || Boolean(user?.isSuperuser) || hasPermission(user, 'vehicles.view');

  const loadData = useCallback(async () => {
    const requestsResponse = await missionsAPI.listRequests();
    const usersResponse = await usersAPI.list();
    setRows(normalizeCollection(requestsResponse.data));
    setUsers(normalizeCollection(usersResponse.data));
    const [driversResponse, vehiclesResponse] = await Promise.all([
      canLoadDrivers ? usersAPI.listDrivers() : Promise.resolve({ data: [] }),
      canLoadVehicles ? vehiclesAPI.list() : Promise.resolve({ data: [] }),
    ]);
    setDrivers(normalizeCollection(driversResponse.data));
    setVehicles(normalizeCollection(vehiclesResponse.data));
  }, [canLoadDrivers, canLoadVehicles]);

  useEffect(() => {
    if (!canView) return;
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        await loadData();
      } catch (err) {
        if (mounted) setError(extractApiError(err, 'بارگذاری درخواست ها انجام نشد.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [canView, canReview, loadData]);

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
      title: row.title || '',
      vehicleType: row.vehicleType || 'in_city',
      missionType: row.missionType || 'single',
      isSpecial: Boolean(row.isSpecial),
      suggestedDriverId: row.suggestedDriverId ? String(row.suggestedDriverId) : '',
      vehicleId: row.vehicleId ? String(row.vehicleId) : '',
      origin: row.origin || '',
      destination: row.destination || '',
      pickupPointsText: joinStops(row.pickupPoints),
      dropoffPointsText: joinStops(row.dropoffPoints),
      hasFreight: Boolean(row.hasFreight),
      freightDescription: row.freightDescription || '',
      peopleCount: String(row.peopleCount ?? 1),
      passengerIds: Array.isArray(row.passengerIds) ? row.passengerIds.map(String) : [],
      startDate: row.startDate || '',
      endDate: row.endDate || '',
      notes: row.notes || '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const openDecisionModal = (mode, row) => {
    const suggestedDriverId = row.suggestedDriverId ? String(row.suggestedDriverId) : '';
    const suggestedVehicle = row.vehicleId
      ? vehicles.find((vehicle) => String(vehicle.id) === String(row.vehicleId))
      : getPrimaryVehicleForDriver(vehicles, suggestedDriverId);
    setDecisionMode(mode);
    setDecisionTarget(row);
    setDecisionData({
      ...emptyDecision,
      driverId: suggestedDriverId,
      vehicleId: suggestedVehicle ? String(suggestedVehicle.id) : '',
      firstCost: String(row.firstCost ?? 0),
    });
    setDecisionError('');
    setDecisionOpen(true);
  };

  const openViolationModal = (row) => {
    setViolationTarget(row);
    setViolationForm(emptyViolationForm);
    setViolationError('');
  };

  const handleDelete = (row) => {
    setDeleteTarget(row);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await missionsAPI.deleteRequest(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(extractApiError(err, 'حذف درخواست انجام نشد.'));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleViolationSubmit = async (event) => {
    event.preventDefault();
    if (!violationTarget?.missionId) return;
    setViolationSubmitting(true);
    setViolationError('');

    if (!violationForm.description.trim()) {
      setViolationError('شرح تخلف الزامی است.');
      setViolationSubmitting(false);
      return;
    }

    const payload = {
      missionId: violationTarget.missionId,
      violationType: violationForm.violationType,
      severity: violationForm.severity,
      occurredAt: violationForm.occurredAt ? new Date(violationForm.occurredAt).toISOString() : undefined,
      description: violationForm.description.trim(),
    };

    try {
      await reportsAPI.createMissionViolation(payload);
      setViolationTarget(null);
    } catch (err) {
      setViolationError(extractApiError(err, 'ثبت گزارش تخلف انجام نشد. ماموریت باید پایان یافته یا لغو شده باشد.'));
    } finally {
      setViolationSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');

    if (!formData.title.trim() || !formData.origin.trim() || !formData.destination.trim() || !formData.startDate) {
      setFormError('عنوان، مبدا، مقصد و تاریخ شروع الزامی است.');
      setSubmitting(false);
      return;
    }

    if (!Number.isFinite(Number(formData.peopleCount)) || Number(formData.peopleCount) < 1) {
      setFormError('تعداد نفرات باید عددی بزرگتر از صفر باشد.');
      setSubmitting(false);
      return;
    }

    if (formData.hasFreight && !formData.freightDescription.trim()) {
      setFormError('شرح بار الزامی است.');
      setSubmitting(false);
      return;
    }

    const payload = {
      title: formData.title.trim(),
      vehicleType: formData.vehicleType,
      missionType: formData.missionType,
      isSpecial: Boolean(formData.isSpecial),
      suggestedDriverId: formData.suggestedDriverId ? Number(formData.suggestedDriverId) : null,
      vehicleId: formData.vehicleId ? Number(formData.vehicleId) : null,
      origin: formData.origin.trim(),
      destination: formData.destination.trim(),
      pickupPoints: parseStops(formData.pickupPointsText),
      dropoffPoints: parseStops(formData.dropoffPointsText),
      hasFreight: Boolean(formData.hasFreight),
      freightDescription: formData.hasFreight ? formData.freightDescription.trim() : '',
      peopleCount: Number(formData.peopleCount),
      passengerIds: formData.passengerIds.map(Number),
      startDate: formData.startDate,
      endDate: formData.endDate || null,
      notes: formData.notes.trim(),
    };

    try {
      if (editingId) {
        await missionsAPI.updateRequest(editingId, payload);
      } else {
        await missionsAPI.createRequest(payload);
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(extractApiError(err, 'ذخیره درخواست انجام نشد.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecision = async (event) => {
    event.preventDefault();
    setDecisionSubmitting(true);
    setDecisionError('');

    if (decisionMode === 'accept') {
      if (!decisionData.driverId || !decisionData.vehicleId) {
        setDecisionError('انتخاب راننده و خودرو الزامی است.');
        setDecisionSubmitting(false);
        return;
      }
      if (!Number.isFinite(Number(decisionData.firstCost)) || Number(decisionData.firstCost) < 0) {
        setDecisionError('هزینه اولیه باید عددی صفر یا بزرگتر باشد.');
        setDecisionSubmitting(false);
        return;
      }
    }

    const payload = {
      adminNote: decisionData.adminNote.trim(),
      driverId: decisionData.driverId ? Number(decisionData.driverId) : null,
      vehicleId: decisionData.vehicleId ? Number(decisionData.vehicleId) : null,
      firstCost: Number(decisionData.firstCost || 0),
    };

    try {
      if (decisionMode === 'accept') {
        await missionsAPI.acceptRequest(decisionTarget.id, payload);
      } else {
        await missionsAPI.rejectRequest(decisionTarget.id, { adminNote: payload.adminNote });
      }
      setDecisionOpen(false);
      await loadData();
    } catch (err) {
      setDecisionError(extractApiError(err, 'ثبت تصمیم انجام نشد.'));
    } finally {
      setDecisionSubmitting(false);
    }
  };

  if (!canView) return <AccessDenied />;

  const statusTone = {
    pending: 'amber',
    approved: 'emerald',
    rejected: 'red',
  };

  const statusLabel = {
    pending: 'در انتظار بررسی',
    approved: 'تایید شده',
    rejected: 'رد شده',
  };

  const columns = [
    { key: 'title', title: 'عنوان' },
    { key: 'requesterName', title: 'درخواست کننده' },
    { key: 'pickupPoints', title: 'مبداها', render: (value) => (value || []).join('، ') || '-' },
    { key: 'dropoffPoints', title: 'مقصدها', render: (value) => (value || []).join('، ') || '-' },
    { key: 'passengerNames', title: 'مسافران', render: (value) => (value || []).join('، ') || '-' },
    { key: 'suggestedDriverName', title: 'راننده پیشنهادی', render: (value) => value || '-' },
    { key: 'vehicleModel', title: 'خودروی پیشنهادی', render: (value) => value || '-' },
    { key: 'startDate', title: 'شروع', render: (value) => formatDate(value) },
    { key: 'endDate', title: 'پایان', render: (value) => formatDate(value) },
    { key: 'firstCost', title: 'هزینه اولیه', render: (value, row) => formatRial(row.missionFirstCost ?? value ?? 0) },
    { key: 'isSpecial', title: 'ویژه', render: (value) => toBooleanLabel(value) },
    { key: 'status', title: 'وضعیت', render: (value) => <Badge tone={statusTone[value]}>{statusLabel[value] || value}</Badge> },
    {
      key: 'actions',
      title: 'اقدام',
      render: (_, row) => {
        const pending = row.status === 'pending';
        const isOwner = row.requesterId === user?.id;
        const canEditOwnPending = pending && isOwner && canUpdate;
        const canDeletePending = pending && (isOwner || canReview);
        const passengerIds = (row.passengerIds || []).map(String);
        const canReportViolation = Boolean(row.missionId) && (isOwner || passengerIds.includes(String(user?.id)));
        return (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <RowActionMenu
              items={[
                canEditOwnPending && { label: 'ویرایش', tone: 'edit', onClick: () => openEditModal(row) },
                canDeletePending && { label: 'حذف', tone: 'delete', onClick: () => handleDelete(row) },
                pending && canReview && { label: 'تبدیل به ماموریت', tone: 'blue', onClick: () => openDecisionModal('accept', row) },
                pending && canReview && { label: 'رد درخواست', tone: 'delete', onClick: () => openDecisionModal('reject', row) },
                canReportViolation && { label: 'ثبت تخلف', tone: 'blue', onClick: () => openViolationModal(row) },
              ]}
            />
            {row.missionId ? <Badge tone="blue">ماموریت #{row.missionId}</Badge> : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <PageHeader
        title="درخواست خودرو"
        description={canReview ? 'درخواست های ثبت شده را بررسی کنید و در صورت تایید به ماموریت تبدیل کنید.' : 'برای دریافت خودرو درخواست جدید ثبت کنید و وضعیت آن را پیگیری کنید.'}
        action={canCreate ? <PrimaryButton type="button" onClick={openCreateModal}>درخواست جدید</PrimaryButton> : null}
      />
      <ErrorAlert message={error} />
      <SectionCard title="فیلتر وضعیت">
        <ToolbarSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">همه وضعیت ها</option>
          <option value="pending">در انتظار بررسی</option>
          <option value="approved">تایید شده</option>
          <option value="rejected">رد شده</option>
        </ToolbarSelect>
      </SectionCard>
      <SectionCard title="فهرست درخواست ها">
        {loading ? <LoadingState/> : <DataTable columns={columns} rows={filteredRows} emptyTitle="درخواستی ثبت نشده است." />}
      </SectionCard>

      <ModalForm
        open={modalOpen}
        title={editingId ? 'ویرایش درخواست' : 'ثبت درخواست خودرو'}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="ذخیره"
      >
        <RequestForm
          formData={formData}
          setFormData={setFormData}
          users={users}
          drivers={drivers}
          vehicles={vehicles}
          formError={formError}
        />
      </ModalForm>

      <Modal open={decisionOpen} title={decisionMode === 'accept' ? 'تبدیل درخواست به ماموریت' : 'رد درخواست'} onClose={() => setDecisionOpen(false)}>
        {decisionMode === 'accept' ? (
          <MissionDecisionWizard
            requestRow={decisionTarget}
            drivers={drivers}
            vehicles={vehicles}
            decisionData={decisionData}
            setDecisionData={setDecisionData}
            decisionError={decisionError}
            decisionSubmitting={decisionSubmitting}
            onSubmit={handleDecision}
            onCancel={() => setDecisionOpen(false)}
          />
        ) : (
          <form onSubmit={handleDecision} className="space-y-5">
            <ErrorAlert message={decisionError} />
            <Field label="یادداشت مدیر">
              <Textarea rows="5" value={decisionData.adminNote} onChange={(event) => setDecisionData((prev) => ({ ...prev, adminNote: event.target.value }))} />
            </Field>
            <div className="flex justify-end gap-3">
              <SecondaryButton type="button" onClick={() => setDecisionOpen(false)}>انصراف</SecondaryButton>
              <PrimaryButton type="submit" disabled={decisionSubmitting}>
                {decisionSubmitting ? 'در حال ثبت...' : 'ثبت رد درخواست'}
              </PrimaryButton>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmationModal
        open={Boolean(deleteTarget)}
        mode="delete"
        message={`آیا از حذف درخواست ${deleteTarget?.title || ''} اطمینان دارید؟`}
        loading={deleteSubmitting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <Modal open={Boolean(violationTarget)} title="ثبت گزارش تخلف ماموریت" onClose={() => setViolationTarget(null)}>
        <form onSubmit={handleViolationSubmit} className="space-y-5">
          <ErrorAlert message={violationError} />
          {violationTarget ? (
            <div className="rounded-2xl border border-[#D9D9D9] bg-[#FAFBFC] px-4 py-3 text-right">
              <div className="text-xs font-semibold text-[#737373]">ماموریت تبدیل‌شده</div>
              <div className="mt-1 text-sm font-bold text-[#222222]">
                {violationTarget.title || `ماموریت #${violationTarget.missionId}`}
              </div>
              <div className="mt-1 text-xs leading-5 text-[#737373]">
                این گزارش پس از بررسی مدیر، در صورت تایید به تخلف عملیاتی تبدیل می‌شود.
              </div>
            </div>
          ) : null}
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="نوع تخلف">
              <Select value={violationForm.violationType} onChange={(event) => setViolationForm((prev) => ({ ...prev, violationType: event.target.value }))}>
                {Object.entries(offenseTypeLabel).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </Field>
            <Field label="شدت">
              <Select value={violationForm.severity} onChange={(event) => setViolationForm((prev) => ({ ...prev, severity: event.target.value }))}>
                {Object.entries(severityLabel).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </Field>
            <Field label="زمان تخلف">
              <Input
                type="datetime-local"
                value={violationForm.occurredAt}
                onChange={(event) => setViolationForm((prev) => ({ ...prev, occurredAt: event.target.value }))}
              />
            </Field>
          </div>
          <Field label="شرح تخلف">
            <Textarea
              rows="5"
              value={violationForm.description}
              onChange={(event) => setViolationForm((prev) => ({ ...prev, description: event.target.value }))}
              required
            />
          </Field>
          <div className="flex justify-end gap-3">
            <SecondaryButton type="button" onClick={() => setViolationTarget(null)}>انصراف</SecondaryButton>
            <PrimaryButton type="submit" disabled={violationSubmitting}>
              {violationSubmitting ? 'در حال ثبت...' : 'ثبت گزارش تخلف'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
