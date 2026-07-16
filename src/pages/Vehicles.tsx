// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { usersAPI } from '../api/users';
import { vehiclesAPI } from '../api/vehicles';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { extractApiError, formatNumber, normalizeCollection } from '../utils/formatters';
import { formatPlateForStorage } from '../utils/iranPlate';
import { IranPlateDisplay, IranPlateInput } from '../components/shared/IranPlate';
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
  ToolbarInput,
  ToolbarSelect,
  LoadingState,
  DataTableExportButton,
} from '../components/shared/UI';

const emptyForm = {
  model: '',
  plateNumber: '',
  typeId: '',
  groupId: '',
  driverId: '',
  imei: '',
  numberOfPeople: '1',
  status: 'active',
  parkingPlace: '',
  missionPlace: '',
  firstKilometer: '0',
  currentKilometer: '0',
  gas: '0',
  lat: '',
  lng: '',
};

const statusSearchLabel = {
  active: 'فعال active',
  inactive: 'غیرفعال inactive',
  maintenance: 'در تعمیر maintenance',
  on_mission: 'در ماموریت on mission',
};

function getVehicleSearchValues(row) {
  return [
    row.id,
    row.typeId,
    row.groupId,
    row.driverId,
    row.driverIds,
    row.typeName,
    row.groupName,
    row.driverName,
    row.driverNames,
    row.model,
    row.plateNumber,
    row.numberOfPeople,
    row.status,
    statusSearchLabel[row.status],
    row.parkingPlace,
    row.stationPlace,
    row.missionPlace,
    row.firstKilometer,
    row.currentKilometer,
    row.gas,
    row.imei,
    row.traccarDeviceId,
    row.serviceReport,
    row.technicalServiceReport,
    row.insuranceProvider,
    row.insurancePolicyNumber,
    row.insuranceExpiryDate,
    row.replacedParts,
  ];
}

export default function Vehicles() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [types, setTypes] = useState([]);
  const [groups, setGroups] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const canView = hasPermission(user, 'vehicles.view');
  const canCreate = hasPermission(user, 'vehicles.create');
  const canUpdate = hasPermission(user, 'vehicles.update');
  const canDelete = hasPermission(user, 'vehicles.delete');

  const vehicleListParams = useMemo(() => {
    const params = {};
    const query = debouncedSearch.trim();

    if (query) params.search = query;
    if (statusFilter) params.status = statusFilter;

    return params;
  }, [debouncedSearch, statusFilter]);

  const loadData = async (params = vehicleListParams) => {
    const [vehiclesResponse, typesResponse, groupsResponse, driversResponse] = await Promise.all([
      vehiclesAPI.list(params),
      vehiclesAPI.listTypes(),
      vehiclesAPI.listGroups(),
      usersAPI.listDrivers(),
    ]);
    setRows(normalizeCollection(vehiclesResponse.data));
    setTypes(normalizeCollection(typesResponse.data));
    setGroups(normalizeCollection(groupsResponse.data));
    setDrivers(normalizeCollection(driversResponse.data));
  };

  useEffect(() => {
    if (!canView) return;

    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        await loadData();
      } catch (err) {
        if (mounted) setError(extractApiError(err, 'بارگذاری خودروها انجام نشد.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [canView, vehicleListParams]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const response = await vehiclesAPI.downloadVehicles(vehicleListParams);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'vehicles_export.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(extractApiError(err, 'دریافت فایل خروجی انجام نشد.'));
    } finally {
      setDownloading(false);
    }
  };

  const filteredRows = useMemo(() => rows.filter((row) => {
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || getVehicleSearchValues(row).some((value) => {
      if (Array.isArray(value)) {
        return value.some((item) => String(item || '').toLowerCase().includes(query));
      }

      if (value && typeof value === 'object') {
        return JSON.stringify(value).toLowerCase().includes(query);
      }

      return String(value || '').toLowerCase().includes(query);
    });
    const matchesStatus = !statusFilter || row.status === statusFilter;
    return matchesQuery && matchesStatus;
  }), [rows, search, statusFilter]);

  const openCreateModal = () => {
    setFormMode('create');
    setEditingId(null);
    setFormData(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setFormMode('edit');
    setEditingId(row.id);
    setFormData({
      model: row.model || '',
      plateNumber: row.plateNumber || '',
      typeId: row.typeId ? String(row.typeId) : '',
      groupId: row.groupId ? String(row.groupId) : '',
      driverId: row.driverId ? String(row.driverId) : '',
      imei: row.imei || '',
      numberOfPeople: String(row.numberOfPeople ?? 1),
      status: row.status || 'active',
      parkingPlace: row.parkingPlace || '',
      missionPlace: row.missionPlace || '',
      firstKilometer: String(row.firstKilometer ?? 0),
      currentKilometer: String(row.currentKilometer ?? 0),
      gas: String(row.gas ?? 0),
      lat: row.location?.lat != null ? String(row.location.lat) : '',
      lng: row.location?.lng != null ? String(row.location.lng) : '',
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
      await vehiclesAPI.delete(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(extractApiError(err, 'حذف خودرو انجام نشد.'));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');

    const payload = {
      model: formData.model.trim(),
      plateNumber: formatPlateForStorage(formData.plateNumber),
      typeId: formData.typeId ? Number(formData.typeId) : null,
      groupId: formData.groupId ? Number(formData.groupId) : null,
      driverId: formData.driverId ? Number(formData.driverId) : null,
      imei: formData.imei.trim() || null,
      numberOfPeople: Number(formData.numberOfPeople),
      status: formData.status,
      parkingPlace: formData.parkingPlace.trim(),
      missionPlace: formData.missionPlace.trim(),
      firstKilometer: Number(formData.firstKilometer),
      currentKilometer: Number(formData.currentKilometer),
      gas: Number(formData.gas),
      location: formData.lat && formData.lng ? { lat: Number(formData.lat), lng: Number(formData.lng) } : null,
    };

    try {
      if (formMode === 'edit') {
        await vehiclesAPI.update(editingId, payload);
      } else {
        await vehiclesAPI.create(payload);
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(extractApiError(err, 'ذخیره خودرو انجام نشد.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!canView) return <AccessDenied />;

  const statusTone = {
    active: 'emerald',
    inactive: 'red',
    maintenance: 'amber',
    on_mission: 'blue',
  };

  const statusLabel = {
    active: 'فعال',
    inactive: 'غیرفعال',
    maintenance: 'در تعمیر',
    on_mission: 'در ماموریت',
  };

  const columns = [
    { key: 'model', title: 'مدل' },
    { key: 'plateNumber', title: 'پلاک', render: (value) => <IranPlateDisplay value={value} /> },
    { key: 'imei', title: 'IMEI' },
    { key: 'typeName', title: 'نوع' },
    { key: 'groupName', title: 'گروه' },
    { key: 'driverName', title: 'راننده' },
    { key: 'currentKilometer', title: 'کارکرد', render: (value) => `${formatNumber(value)} کیلومتر` },
    { key: 'gas', title: 'سوخت', render: (value) => `${formatNumber(value)} لیتر` },
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
      <PageHeader
        title="مدیریت خودروها"
        description="ثبت خودرو، تخصیص راننده و نگهداری اطلاعات عملیاتی هر وسیله نقلیه"
        action={
          <div className="flex items-center justify-end gap-2">
            <DataTableExportButton onClick={handleDownload} disabled={downloading} />
            {canCreate ? (
              <PrimaryButton type="button" onClick={openCreateModal}>خودرو جدید</PrimaryButton>
            ) : null}
          </div>
        }
      />
      <ErrorAlert message={error} />

      <SectionCard title="فیلترها">
        <div className="grid gap-4 md:grid-cols-2">
          <ToolbarInput placeholder="جستجو در مدل، پلاک، IMEI، راننده، گروه، کارکرد، سوخت، بیمه و گزارش‌ها" value={search} onChange={(event) => setSearch(event.target.value)} />
          <ToolbarSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">همه وضعیت ها</option>
            <option value="active">فعال</option>
            <option value="inactive">غیرفعال</option>
            <option value="maintenance">در تعمیر</option>
            <option value="on_mission">در ماموریت</option>
          </ToolbarSelect>
        </div>
      </SectionCard>

      <SectionCard title="فهرست خودروها">
        {loading || search.trim() !== debouncedSearch.trim() ? <LoadingState /> : <DataTable columns={columns} rows={filteredRows} emptyTitle="خودرویی برای نمایش وجود ندارد." />}
      </SectionCard>

      <Modal open={modalOpen} title={formMode === 'edit' ? 'ویرایش خودرو' : 'ثبت خودرو'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <ErrorAlert message={formError} />
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="مدل">
              <Input value={formData.model} onChange={(event) => setFormData((prev) => ({ ...prev, model: event.target.value }))} required />
            </Field>
            <Field label="پلاک">
              <IranPlateInput value={formData.plateNumber} onChange={(plateNumber) => setFormData((prev) => ({ ...prev, plateNumber }))} />
            </Field>
            <Field label="نوع خودرو">
              <Select value={formData.typeId} onChange={(event) => setFormData((prev) => ({ ...prev, typeId: event.target.value }))}>
                <option value="">انتخاب کنید</option>
                {types.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
              </Select>
            </Field>
            <Field label="گروه خودرو">
              <Select value={formData.groupId} onChange={(event) => setFormData((prev) => ({ ...prev, groupId: event.target.value }))}>
                <option value="">انتخاب کنید</option>
                {groups.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
              </Select>
            </Field>
            <Field label="راننده تخصیص یافته">
              <Select value={formData.driverId} onChange={(event) => setFormData((prev) => ({ ...prev, driverId: event.target.value }))}>
                <option value="">بدون راننده</option>
                {drivers.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
              </Select>
            </Field>
            <Field label="IMEI" hint="شناسه GPS در Traccar">
              <Input value={formData.imei} onChange={(event) => setFormData((prev) => ({ ...prev, imei: event.target.value }))} />
            </Field>
            <Field label="ظرفیت">
              <Input type="number" min="1" value={formData.numberOfPeople} onChange={(event) => setFormData((prev) => ({ ...prev, numberOfPeople: event.target.value }))} required />
            </Field>
            <Field label="وضعیت">
              <Select value={formData.status} onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))}>
                <option value="active">فعال</option>
                <option value="inactive">غیرفعال</option>
                <option value="maintenance">در تعمیر</option>
                <option value="on_mission">در ماموریت</option>
              </Select>
            </Field>
            <Field label="پارکینگ">
              <Input value={formData.parkingPlace} onChange={(event) => setFormData((prev) => ({ ...prev, parkingPlace: event.target.value }))} />
            </Field>
            <Field label="موقعیت ماموریت">
              <Input value={formData.missionPlace} onChange={(event) => setFormData((prev) => ({ ...prev, missionPlace: event.target.value }))} />
            </Field>
            <Field label="کیلومتر اولیه">
              <Input type="number" min="0" value={formData.firstKilometer} onChange={(event) => setFormData((prev) => ({ ...prev, firstKilometer: event.target.value }))} required />
            </Field>
            <Field label="کیلومتر فعلی">
              <Input type="number" min="0" value={formData.currentKilometer} onChange={(event) => setFormData((prev) => ({ ...prev, currentKilometer: event.target.value }))} required />
            </Field>
            <Field label="مقدار سوخت">
              <Input type="number" min="0" step="0.01" value={formData.gas} onChange={(event) => setFormData((prev) => ({ ...prev, gas: event.target.value }))} />
            </Field>
            <Field label="عرض جغرافیایی">
              <Input type="number" step="0.000001" value={formData.lat} onChange={(event) => setFormData((prev) => ({ ...prev, lat: event.target.value }))} />
            </Field>
            <Field label="طول جغرافیایی">
              <Input type="number" step="0.000001" value={formData.lng} onChange={(event) => setFormData((prev) => ({ ...prev, lng: event.target.value }))} />
            </Field>
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
        message={`آیا از حذف خودرو ${deleteTarget?.model || ''} اطمینان دارید؟`}
        loading={deleteSubmitting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
