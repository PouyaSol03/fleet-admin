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

function getVehicleLabel(vehicle) {
  return [vehicle?.model, vehicle?.plateNumber ? formatPlateForDisplay(vehicle.plateNumber) : ''].filter(Boolean).join(' - ') || `خودرو #${vehicle?.id}`;
}

function getDriverLabel(driver) {
  return driver?.name || driver?.fullName || driver?.userName || `راننده #${driver?.id}`;
}

function vehicleBelongsToDriver(vehicle, driverId) {
  if (!driverId) return false;
  const selected = String(driverId);
  if (String(vehicle?.driverId || '') === selected) return true;
  return Array.isArray(vehicle?.driverIds) && vehicle.driverIds.map(String).includes(selected);
}

function getPrimaryVehicleForDriver(vehicles, driverId) {
  if (!driverId) return null;
  return (
    vehicles.find((vehicle) => String(vehicle?.driverId || '') === String(driverId)) ||
    vehicles.find((vehicle) => vehicleBelongsToDriver(vehicle, driverId)) ||
    null
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="rounded-xl border border-[#EFEFEF] bg-[#FAFBFC] px-3 py-2">
      <div className="text-xs font-semibold text-[#737373]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[#222222]">{value || '-'}</div>
    </div>
  );
}

const decisionSteps = [
  { key: 1, label: 'خلاصه درخواست' },
  { key: 2, label: 'راننده' },
  { key: 3, label: 'خودرو' },
  { key: 4, label: 'بررسی نهایی' },
  { key: 5, label: 'هزینه و یادداشت' },
];

const requestFormTabs = [
  { key: 'main', label: 'اطلاعات اصلی' },
  { key: 'route', label: 'مسیر' },
  { key: 'schedule', label: 'زمان و مسافران' },
];

function RequestForm({
  formData,
  setFormData,
  users,
  drivers,
  vehicles,
  formError,
}) {
  const [activeTab, setActiveTab] = useState('main');
  const [passengerSearch, setPassengerSearch] = useState('');

  const selectedPassengerIds = useMemo(
    () => new Set((formData.passengerIds || []).map(String)),
    [formData.passengerIds],
  );

  const passengerOptions = useMemo(() => {
    const query = passengerSearch.trim().toLowerCase();
    const filtered = users.filter((option) => {
      const label = `${option.fullName || ''} ${option.userName || ''}`.toLowerCase();
      return !query || label.includes(query);
    });

    return filtered.slice(0, 40);
  }, [passengerSearch, users]);

  const selectedPassengers = useMemo(
    () => users.filter((option) => selectedPassengerIds.has(String(option.id))),
    [selectedPassengerIds, users],
  );
  const suggestedVehicles = useMemo(
    () => (
      formData.suggestedDriverId
        ? vehicles.filter((vehicle) => vehicleBelongsToDriver(vehicle, formData.suggestedDriverId))
        : vehicles
    ),
    [formData.suggestedDriverId, vehicles],
  );

  const updateField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, [setFormData]);

  const selectSuggestedDriver = useCallback((driverId) => {
    const primaryVehicle = getPrimaryVehicleForDriver(vehicles, driverId);
    setFormData((prev) => {
      const currentVehicle = vehicles.find((vehicle) => String(vehicle.id) === String(prev.vehicleId));
      const keepCurrentVehicle = driverId && currentVehicle && vehicleBelongsToDriver(currentVehicle, driverId);
      return {
        ...prev,
        suggestedDriverId: driverId,
        vehicleId: keepCurrentVehicle
          ? prev.vehicleId
          : primaryVehicle
            ? String(primaryVehicle.id)
            : driverId
              ? ''
              : prev.vehicleId,
      };
    });
  }, [setFormData, vehicles]);

  const togglePassenger = useCallback((id) => {
    const value = String(id);
    setFormData((prev) => {
      const current = new Set((prev.passengerIds || []).map(String));
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      return { ...prev, passengerIds: Array.from(current) };
    });
  }, [setFormData]);

  const clearPassengers = useCallback(() => {
    setFormData((prev) => ({ ...prev, passengerIds: [] }));
  }, [setFormData]);

  return (
    <div className="space-y-5">
      <ErrorAlert message={formError} />

      <div className="flex flex-wrap gap-2 border-b border-[#EFEFEF] pb-2">
        {requestFormTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`h-9 rounded-[10px] px-3 text-sm font-semibold transition ${
              activeTab === tab.key
                ? 'bg-[#EAF3FC] text-[#206AB4]'
                : 'bg-white text-[#737373] hover:bg-[#EFEFEF]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'main' ? (
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="عنوان درخواست">
            <Input
              type="text"
              value={formData.title}
              onChange={(event) => updateField('title', event.target.value)}
              required
            />
          </Field>
          <Field label="نوع مسیر">
            <Select
              value={formData.vehicleType}
              onChange={(event) => updateField('vehicleType', event.target.value)}
            >
              <option value="in_city">داخل شهری</option>
              <option value="out_of_city">برون شهری</option>
            </Select>
          </Field>
          <Field label="نوع ماموریت">
            <Select
              value={formData.missionType}
              onChange={(event) => updateField('missionType', event.target.value)}
            >
              <option value="single">تکی</option>
              <option value="periodic">دوره ای</option>
            </Select>
          </Field>
          <Field label="ظرفیت یا تعداد نفرات">
            <Input
              type="number"
              min="1"
              inputMode="numeric"
              value={formData.peopleCount}
              onChange={(event) => updateField('peopleCount', event.target.value)}
              required
            />
          </Field>
          {drivers.length || vehicles.length ? (
            <>
              <Field label="راننده پیشنهادی" hint="اختیاری">
                <Select
                  value={formData.suggestedDriverId}
                  onChange={(event) => selectSuggestedDriver(event.target.value)}
                >
                  <option value="">بدون پیشنهاد</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>{getDriverLabel(driver)}</option>
                  ))}
                </Select>
              </Field>
              <Field label="خودروی پیشنهادی" hint="اختیاری">
                <Select
                  value={formData.vehicleId}
                  onChange={(event) => updateField('vehicleId', event.target.value)}
                  disabled={!suggestedVehicles.length}
                >
                  <option value="">بدون پیشنهاد</option>
                  {suggestedVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>{getVehicleLabel(vehicle)}</option>
                  ))}
                </Select>
              </Field>
            </>
          ) : null}
          <label className="fleet-check-field md:col-span-2">
            <input
              type="checkbox"
              checked={formData.isSpecial}
              onChange={(event) => updateField('isSpecial', event.target.checked)}
            />
            درخواست ویژه
          </label>
        </div>
      ) : null}

      {activeTab === 'route' ? (
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="اولین مبدا">
            <Input
              type="text"
              value={formData.origin}
              onChange={(event) => updateField('origin', event.target.value)}
              required
            />
          </Field>
          <Field label="آخرین مقصد">
            <Input
              type="text"
              value={formData.destination}
              onChange={(event) => updateField('destination', event.target.value)}
              required
            />
          </Field>
          <Field label="مبداهای چندگانه" hint="هر خط یک مبدا">
            <Textarea
              rows="4"
              value={formData.pickupPointsText}
              onChange={(event) => updateField('pickupPointsText', event.target.value)}
            />
          </Field>
          <Field label="مقصدهای چندگانه" hint="هر خط یک مقصد">
            <Textarea
              rows="4"
              value={formData.dropoffPointsText}
              onChange={(event) => updateField('dropoffPointsText', event.target.value)}
            />
          </Field>
          <Field label="توضیحات">
            <Textarea
              rows="4"
              value={formData.notes}
              onChange={(event) => updateField('notes', event.target.value)}
            />
          </Field>
          <label className="fleet-check-field md:col-span-2">
            <input
              type="checkbox"
              checked={Boolean(formData.hasFreight)}
              onChange={(event) => {
                updateField('hasFreight', event.target.checked);
                if (!event.target.checked) updateField('freightDescription', '');
              }}
            />
            بار همراه دارد
          </label>
          {formData.hasFreight ? (
            <Field label="شرح بار">
              <Textarea
                rows="4"
                value={formData.freightDescription}
                onChange={(event) => updateField('freightDescription', event.target.value)}
                required
              />
            </Field>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'schedule' ? (
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="تاریخ شروع">
            <Input
              type="date"
              value={formData.startDate}
              onChange={(event) => updateField('startDate', event.target.value)}
              required
            />
          </Field>
          <Field label="تاریخ پایان">
            <Input
              type="date"
              value={formData.endDate}
              onChange={(event) => updateField('endDate', event.target.value)}
            />
          </Field>
          <Field
            label="مسافران ماموریت"
            hint="نام را جستجو کنید. برای کارایی بهتر فقط ۴۰ نتیجه اول نمایش داده می شود."
          >
            <div className="space-y-3 rounded-xl border border-[#D9D9D9] bg-white p-3">
              <Input
                type="search"
                value={passengerSearch}
                placeholder="جستجوی مسافر"
                onChange={(event) => setPassengerSearch(event.target.value)}
              />
              {selectedPassengers.length ? (
                <div className="flex flex-wrap gap-2">
                  {selectedPassengers.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => togglePassenger(option.id)}
                      className="rounded-[10px] bg-[#EAF3FC] px-2.5 py-1 text-xs font-semibold text-[#206AB4]"
                    >
                      {option.fullName || option.userName} ×
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={clearPassengers}
                    className="rounded-[10px] bg-[#EFEFEF] px-2.5 py-1 text-xs font-semibold text-[#737373]"
                  >
                    پاک کردن
                  </button>
                </div>
              ) : null}
              <div className="max-h-56 overflow-y-auto rounded-[10px] border border-[#EFEFEF]">
                {passengerOptions.length ? passengerOptions.map((option) => {
                  const optionId = String(option.id);
                  const checked = selectedPassengerIds.has(optionId);
                  return (
                    <label
                      key={option.id}
                      className="flex cursor-pointer items-center justify-between gap-3 border-b border-[#EFEFEF] px-3 py-2 text-sm last:border-b-0 hover:bg-[#FAFBFC]"
                    >
                      <span className="min-w-0 truncate">{option.fullName || option.userName}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePassenger(option.id)}
                      />
                    </label>
                  );
                }) : (
                  <div className="px-3 py-6 text-center text-sm text-[#737373]">
                    مسافری پیدا نشد.
                  </div>
                )}
              </div>
            </div>
          </Field>
        </div>
      ) : null}

    </div>
  );
}

function MissionDecisionWizard({
  requestRow,
  drivers,
  vehicles,
  decisionData,
  setDecisionData,
  decisionError,
  decisionSubmitting,
  onSubmit,
  onCancel,
}) {
  const [step, setStep] = useState(1);
  const selectedDriver = useMemo(
    () => drivers.find((driver) => String(driver.id) === String(decisionData.driverId)),
    [decisionData.driverId, drivers],
  );
  const driverVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicleBelongsToDriver(vehicle, decisionData.driverId)),
    [decisionData.driverId, vehicles],
  );
  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => String(vehicle.id) === String(decisionData.vehicleId)),
    [decisionData.vehicleId, vehicles],
  );
  const updateDecision = useCallback((field, value) => {
    setDecisionData((prev) => ({ ...prev, [field]: value }));
  }, [setDecisionData]);

  const selectDriver = useCallback((driverId) => {
    const vehicle = getPrimaryVehicleForDriver(vehicles, driverId);
    setDecisionData((prev) => ({
      ...prev,
      driverId: String(driverId),
      vehicleId: vehicle ? String(vehicle.id) : '',
    }));
  }, [setDecisionData, vehicles]);

  const nextStep = () => {
    if (step === 2 && !decisionData.driverId) return;
    if (step === 3 && !decisionData.vehicleId) return;
    setStep((current) => Math.min(5, current + 1));
  };

  const previousStep = () => setStep((current) => Math.max(1, current - 1));

  const handleWizardSubmit = (event) => {
    event.preventDefault();
    if (step < 5) {
      nextStep();
      return;
    }
    onSubmit(event);
  };

  const routeOrigins = requestRow?.pickupPoints?.length ? requestRow.pickupPoints : [requestRow?.origin].filter(Boolean);
  const routeDestinations = requestRow?.dropoffPoints?.length ? requestRow.dropoffPoints : [requestRow?.destination].filter(Boolean);
  const passengerNames = requestRow?.passengerNames || [];

  return (
    <form onSubmit={handleWizardSubmit} className="space-y-5">
      <ErrorAlert message={decisionError} />

      <div className="grid gap-2 sm:grid-cols-5">
        {decisionSteps.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setStep(item.key)}
            className={`min-h-12 rounded-xl border px-2 text-xs font-bold transition ${
              step === item.key
                ? 'border-[#206AB4] bg-[#EAF3FC] text-[#206AB4]'
                : item.key < step
                  ? 'border-[#BFE3CA] bg-[#E8F7EF] text-[#16803C]'
                  : 'border-[#D9D9D9] bg-white text-[#737373]'
            }`}
          >
            {item.key}. {item.label}
          </button>
        ))}
      </div>

      {step === 1 ? (
        <div className="grid gap-3 md:grid-cols-2">
          <SummaryRow label="عنوان درخواست" value={requestRow?.title} />
          <SummaryRow label="درخواست کننده" value={requestRow?.requesterName} />
          <SummaryRow label="نوع مسیر" value={requestRow?.vehicleType === 'out_of_city' ? 'برون شهری' : 'داخل شهری'} />
          <SummaryRow label="نوع ماموریت" value={requestRow?.missionType === 'periodic' ? 'دوره ای' : 'تکی'} />
          <SummaryRow label="تعداد نفرات" value={requestRow?.peopleCount} />
          <SummaryRow label="وضعیت ویژه" value={toBooleanLabel(requestRow?.isSpecial)} />
          <SummaryRow label="راننده پیشنهادی" value={requestRow?.suggestedDriverName} />
          <SummaryRow label="خودروی پیشنهادی" value={requestRow?.vehicleModel} />
        </div>
      ) : null}

      {step === 2 ? (
        <Field label="انتخاب راننده">
          <div className="max-h-72 overflow-y-auto rounded-xl border border-[#D9D9D9] bg-[#FAFBFC] p-2">
            {drivers.length ? drivers.map((driver) => {
              const selected = String(driver.id) === String(decisionData.driverId);
              return (
                <button
                  key={driver.id}
                  type="button"
                  onClick={() => selectDriver(driver.id)}
                  className={`mb-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-right text-sm transition ${
                    selected ? 'bg-[#EAF3FC] text-[#206AB4]' : 'bg-white text-[#606060] hover:bg-[#EAF3FC]'
                  }`}
                >
                  <span>{getDriverLabel(driver)}</span>
                  {selected ? <span className="font-bold">انتخاب شد</span> : null}
                </button>
              );
            }) : (
              <div className="px-3 py-6 text-center text-sm text-[#737373]">راننده ای پیدا نشد.</div>
            )}
          </div>
        </Field>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <Field label="خودروی راننده">
            <div className="rounded-xl border border-[#D9D9D9] bg-[#FAFBFC] p-3">
              {!decisionData.driverId ? (
                <div className="px-3 py-6 text-center text-sm text-[#737373]">ابتدا راننده را انتخاب کنید.</div>
              ) : selectedVehicle ? (
                <div className="flex flex-col gap-2 rounded-lg bg-white px-3 py-3 text-right text-sm text-[#222222]">
                  <span className="font-bold">{getVehicleLabel(selectedVehicle)}</span>
                  <span className="text-xs leading-5 text-[#737373]">
                    این خودرو بر اساس راننده انتخاب شده به صورت خودکار ثبت می‌شود.
                  </span>
                </div>
              ) : (
                <div className="px-3 py-6 text-center text-sm text-[#737373]">
                  برای این راننده خودرو ثبت نشده است.
                </div>
              )}
            </div>
          </Field>
          {driverVehicles.length > 1 ? (
            <Field label="تغییر خودرو">
              <Select
                value={decisionData.vehicleId}
                onChange={(event) => updateDecision('vehicleId', event.target.value)}
              >
                {driverVehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>{getVehicleLabel(vehicle)}</option>
                ))}
              </Select>
            </Field>
          ) : null}
        </div>
      ) : null}

      {step === 4 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#D9D9D9] bg-white p-4">
            <h4 className="text-sm font-bold text-[#222222]">مسیر</h4>
            <div className="mt-3 space-y-2 text-sm leading-7 text-[#606060]">
              <div><strong className="text-[#222222]">مبداها:</strong> {routeOrigins.join('، ') || '-'}</div>
              <div><strong className="text-[#222222]">مقصدها:</strong> {routeDestinations.join('، ') || '-'}</div>
            </div>
          </div>
          <div className="rounded-2xl border border-[#D9D9D9] bg-white p-4">
            <h4 className="text-sm font-bold text-[#222222]">زمان و مسافران</h4>
            <div className="mt-3 space-y-2 text-sm leading-7 text-[#606060]">
              <div><strong className="text-[#222222]">شروع:</strong> {formatDate(requestRow?.startDate)}</div>
              <div><strong className="text-[#222222]">پایان:</strong> {formatDate(requestRow?.endDate) || '-'}</div>
              <div><strong className="text-[#222222]">مسافران:</strong> {passengerNames.join('، ') || '-'}</div>
              <div><strong className="text-[#222222]">توضیحات:</strong> {requestRow?.notes || '-'}</div>
            </div>
          </div>
          <div className="rounded-2xl border border-[#D9D9D9] bg-[#FAFBFC] p-4 lg:col-span-2">
            <h4 className="text-sm font-bold text-[#222222]">انتخاب های ماموریت</h4>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <SummaryRow label="راننده" value={selectedDriver?.name} />
              <SummaryRow label="خودرو" value={selectedVehicle ? getVehicleLabel(selectedVehicle) : ''} />
            </div>
          </div>
        </div>
      ) : null}

      {step === 5 ? (
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="هزینه اولیه (ریال)">
            <Input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              dir="ltr"
              value={decisionData.firstCost}
              onChange={(event) => updateDecision('firstCost', event.target.value)}
              required
            />
          </Field>
          <div className="rounded-xl border border-[#D9D9D9] bg-[#FAFBFC] px-4 py-3">
            <div className="text-xs font-semibold text-[#737373]">نمایش هزینه</div>
            <div className="mt-2 text-lg font-bold text-[#222222]">{formatRial(decisionData.firstCost)}</div>
          </div>
          <Field label="یادداشت مدیر">
            <Textarea
              rows="5"
              value={decisionData.adminNote}
              onChange={(event) => updateDecision('adminNote', event.target.value)}
            />
          </Field>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-3 border-t border-[#EFEFEF] pt-4">
        <SecondaryButton type="button" onClick={step === 1 ? onCancel : previousStep}>
          {step === 1 ? 'انصراف' : 'مرحله قبل'}
        </SecondaryButton>
        {step < 5 ? (
          <PrimaryButton
            type="button"
            onClick={nextStep}
            disabled={(step === 2 && !decisionData.driverId) || (step === 3 && !decisionData.vehicleId)}
          >
            مرحله بعد
          </PrimaryButton>
        ) : (
          <PrimaryButton type="submit" disabled={decisionSubmitting}>
            {decisionSubmitting ? 'در حال ساخت...' : 'تایید نهایی و ساخت ماموریت'}
          </PrimaryButton>
        )}
      </div>
    </form>
  );
}

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
