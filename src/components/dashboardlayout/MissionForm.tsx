// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useMemo, useState } from 'react';
import {
  Badge,
  Field,
  Input,
  Select,
  Textarea,
  PrimaryButton,
  SecondaryButton,
} from '../shared/UI';
import { formatPlateForDisplay } from '../../utils/iranPlate';

const statusLabel = {
  planned: 'برنامه‌ریزی شده',
  active: 'فعال',
  done: 'انجام شده',
  canceled: 'لغو شده',
};

const statusTone = {
  planned: 'amber',
  active: 'blue',
  done: 'emerald',
  canceled: 'red',
};

const statusActiveClass = {
  planned: 'border-amber-500 bg-amber-50 text-amber-700',
  active: 'border-blue-600 bg-blue-50 text-blue-700',
  done: 'border-emerald-600 bg-emerald-50 text-emerald-700',
  canceled: 'border-red-600 bg-red-50 text-red-700',
};

const missionSteps = [
  { key: 'general', number: 1, label: 'اطلاعات اصلی', hint: 'راننده، خودرو و زمان‌بندی' },
  { key: 'route', number: 2, label: 'مسیر ماموریت', hint: 'مبدا، مقصد و ظرفیت' },
  { key: 'passengers', number: 3, label: 'مسافران و هزینه', hint: 'انتخاب مسافر، مبلغ و یادداشت' },
];

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

function getVehicleLabel(vehicle) {
  if (!vehicle) return '-';
  const model = vehicle.model || 'خودرو';
  const plate = vehicle.plateNumber ? ` - ${formatPlateForDisplay(vehicle.plateNumber)}` : '';
  return `${model}${plate}`;
}

function formatRial(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString('fa-IR')} ریال`;
}

function CompactValue({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-right">
      <span className="block text-[11px] font-bold text-slate-400">{label}</span>
      <span className="mt-1 block truncate text-xs font-black text-slate-700">{value || '-'}</span>
    </div>
  );
}

export default function MissionForm({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  vehicles = [],
  drivers = [],
  users = [],
  isCreateMode = false,
  submitting = false,
  displayTitle = '',
}) {
  const [formTab, setFormTab] = useState('general');
  const [passengerSearch, setPassengerSearch] = useState('');
  const currentTabIndex = missionSteps.findIndex((step) => step.key === formTab);
  const currentStep = missionSteps[currentTabIndex] || missionSteps[0];

  const selectedPassengerIds = useMemo(
    () => new Set((formData.passengerIds || []).map(String)),
    [formData.passengerIds],
  );
  const selectedPassengers = useMemo(
    () => users.filter((user) => selectedPassengerIds.has(String(user.id))),
    [selectedPassengerIds, users],
  );
  const passengerOptions = useMemo(() => {
    const term = passengerSearch.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) => {
      const label = `${user.fullName || ''} ${user.userName || ''} ${user.phone || ''}`.toLowerCase();
      return label.includes(term);
    });
  }, [passengerSearch, users]);
  const driverVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicleBelongsToDriver(vehicle, formData.driverId)),
    [formData.driverId, vehicles],
  );
  const vehicleOptions = formData.driverId ? driverVehicles : vehicles;
  const selectedDriver = useMemo(
    () => drivers.find((driver) => String(driver.id) === String(formData.driverId)),
    [drivers, formData.driverId],
  );
  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => String(vehicle.id) === String(formData.vehicleId)),
    [formData.vehicleId, vehicles],
  );

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const selectDriver = (driverId) => {
    const vehicle = getPrimaryVehicleForDriver(vehicles, driverId);
    setFormData((prev) => ({
      ...prev,
      driverId: String(driverId || ''),
      vehicleId: vehicle ? String(vehicle.id) : '',
    }));
  };

  const togglePassenger = (passengerId) => {
    const id = String(passengerId);
    setFormData((prev) => {
      const current = new Set((prev.passengerIds || []).map(String));
      if (current.has(id)) current.delete(id);
      else current.add(id);
      return { ...prev, passengerIds: Array.from(current) };
    });
  };

  const goNext = () => setFormTab(missionSteps[Math.min(currentTabIndex + 1, missionSteps.length - 1)].key);
  const goBack = () => setFormTab(missionSteps[Math.max(currentTabIndex - 1, 0)].key);

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden px-5 py-5 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-h-0 overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 text-right">
            <span className="text-[11px] font-black text-[#206AB4]">فرم ماموریت</span>
            <h4 className="mt-1 truncate text-base font-black text-slate-800">
              {formData.title || displayTitle || 'ماموریت جدید'}
            </h4>
            {!isCreateMode ? (
              <div className="mt-3">
                <Badge tone={statusTone[formData.status]}>{statusLabel[formData.status]}</Badge>
              </div>
            ) : null}
          </div>

          <div className="mt-3 space-y-2">
            {missionSteps.map((step, index) => {
              const active = step.key === formTab;
              const done = index < currentTabIndex;
              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => setFormTab(step.key)}
                  className={`flex min-h-16 w-full items-start gap-3 rounded-2xl border px-3 py-3 text-right transition ${
                    active
                      ? 'border-[#206AB4] bg-[#EAF3FC] text-[#206AB4]'
                      : done
                        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                    active ? 'bg-[#206AB4] text-white' : done ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {done ? '✓' : step.number}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black">{step.label}</span>
                    <span className="mt-1 block text-[11px] font-bold leading-5 opacity-75">{step.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid gap-2">
            <CompactValue label="راننده" value={selectedDriver?.name} />
            <CompactValue label="خودرو" value={selectedVehicle ? getVehicleLabel(selectedVehicle) : ''} />
            <CompactValue label="مسافران" value={selectedPassengers.length ? `${selectedPassengers.length} نفر` : ''} />
            <CompactValue label="هزینه اولیه" value={formatRial(formData.firstCost)} />
          </div>

          {!isCreateMode ? (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
              <span className="mb-2 block text-right text-[11px] font-bold text-slate-500">وضعیت ماموریت</span>
              <div className="grid gap-2">
                {Object.keys(statusLabel).map((statusKey) => {
                  const isActive = formData.status === statusKey;
                  return (
                    <button
                      key={statusKey}
                      type="button"
                      onClick={() => updateField('status', statusKey)}
                      className={`min-h-10 rounded-xl border px-2 text-xs font-bold transition ${
                        isActive
                          ? statusActiveClass[statusKey]
                          : 'border-slate-200 bg-white text-slate-500 hover:border-[#206AB4] hover:text-[#206AB4]'
                      }`}
                    >
                      {statusLabel[statusKey]}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </aside>

        <section className="min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex shrink-0 flex-col gap-3 border-b border-slate-100 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="text-right">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#206AB4] text-sm font-black text-white">
                  {currentStep.number}
                </span>
                <div>
                  <h5 className="text-base font-black text-slate-800">{currentStep.label}</h5>
                  <p className="mt-0.5 text-xs font-bold text-slate-400">{currentStep.hint}</p>
                </div>
              </div>
            </div>
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
              مرحله {currentStep.number} از {missionSteps.length}
            </span>
          </div>

          <div className="h-full min-h-0 overflow-y-auto overscroll-contain px-4 py-4">
            {formTab === 'general' ? (
              <div className="space-y-4">
                <Field label="عنوان ماموریت">
                  <Input value={formData.title} onChange={(e) => updateField('title', e.target.value)} required />
                </Field>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="راننده ماموریت">
                    <Select value={formData.driverId} onChange={(e) => selectDriver(e.target.value)} required>
                      <option value="">انتخاب راننده</option>
                      {drivers.map((driver) => (
                        <option key={driver.id} value={String(driver.id)}>{driver.name}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="خودروی راننده">
                    <Select value={formData.vehicleId} onChange={(e) => updateField('vehicleId', e.target.value)} required>
                      <option value="">خودرو انتخاب نشده</option>
                      {vehicleOptions.map((vehicle) => (
                        <option key={vehicle.id} value={String(vehicle.id)}>{getVehicleLabel(vehicle)}</option>
                      ))}
                    </Select>
                    {formData.driverId && selectedVehicle ? (
                      <span className="text-xs font-bold text-emerald-600">
                        {getVehicleLabel(selectedVehicle)}
                      </span>
                    ) : null}
                    {formData.driverId && driverVehicles.length === 0 ? (
                      <span className="text-xs font-bold text-red-500">برای این راننده خودرویی ثبت نشده است.</span>
                    ) : null}
                  </Field>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="تاریخ شروع">
                    <Input type="date" value={formData.startDate} onChange={(e) => updateField('startDate', e.target.value)} required />
                  </Field>
                  <Field label="تاریخ پایان">
                    <Input type="date" value={formData.endDate} onChange={(e) => updateField('endDate', e.target.value)} />
                  </Field>
                </div>

                <div className="grid gap-4 lg:grid-cols-2 lg:items-end">
                  <Field label="نوع ماموریت">
                    <Select value={formData.missionType} onChange={(e) => updateField('missionType', e.target.value)}>
                      <option value="single">تکی</option>
                      <option value="periodic">دوره‌ای</option>
                    </Select>
                  </Field>
                  <label className="fleet-check-field min-h-14 cursor-pointer">
                    <input type="checkbox" checked={formData.isSpecial} onChange={(e) => updateField('isSpecial', e.target.checked)} />
                    <span>ماموریت ویژه اختصاصی</span>
                  </label>
                </div>
              </div>
            ) : null}

            {formTab === 'route' ? (
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="مبدا اصلی">
                    <Input value={formData.origin} onChange={(e) => updateField('origin', e.target.value)} required />
                  </Field>
                  <Field label="مقصد اصلی">
                    <Input value={formData.destination} onChange={(e) => updateField('destination', e.target.value)} required />
                  </Field>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="مبداهای دیگر" hint="هر آدرس را در یک خط جدا وارد کنید.">
                    <Textarea rows="5" value={formData.pickupPointsText} onChange={(e) => updateField('pickupPointsText', e.target.value)} />
                  </Field>
                  <Field label="مقصدهای دیگر" hint="هر آدرس را در یک خط جدا وارد کنید.">
                    <Textarea rows="5" value={formData.dropoffPointsText} onChange={(e) => updateField('dropoffPointsText', e.target.value)} />
                  </Field>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="نوع مسیر">
                    <Select value={formData.vehicleType} onChange={(e) => updateField('vehicleType', e.target.value)}>
                      <option value="in_city">داخل شهری</option>
                      <option value="out_of_city">برون شهری</option>
                    </Select>
                  </Field>
                  <Field label="تعداد نفرات">
                    <Input type="number" min="1" value={formData.peopleCount} onChange={(e) => updateField('peopleCount', e.target.value)} required />
                  </Field>
                </div>

                <div className="space-y-4">
                  <label className="fleet-check-field min-h-14 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.hasFreight)}
                      onChange={(e) => {
                        updateField('hasFreight', e.target.checked);
                        if (!e.target.checked) updateField('freightDescription', '');
                      }}
                    />
                    <span>بار همراه دارد</span>
                  </label>
                  {formData.hasFreight ? (
                    <Field label="شرح بار">
                      <Textarea
                        rows="4"
                        value={formData.freightDescription}
                        onChange={(e) => updateField('freightDescription', e.target.value)}
                        required
                      />
                    </Field>
                  ) : null}
                </div>
              </div>
            ) : null}

            {formTab === 'passengers' ? (
              <div className="space-y-4">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                  <Field label="مسافران ماموریت">
                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                      <Input type="search" value={passengerSearch} onChange={(e) => setPassengerSearch(e.target.value)} placeholder="جستجوی مسافر..." />
                      <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-100 bg-white">
                        {passengerOptions.length ? passengerOptions.map((user) => {
                          const checked = selectedPassengerIds.has(String(user.id));
                          return (
                            <label
                              key={user.id}
                              className={`flex cursor-pointer items-center justify-between gap-3 border-b border-slate-50 px-3 py-2.5 text-right text-xs last:border-b-0 ${
                                checked ? 'bg-[#EAF3FC] text-[#206AB4]' : 'hover:bg-slate-50'
                              }`}
                            >
                              <span className="flex min-w-0 flex-col">
                                <span className="truncate font-black">{user.fullName || user.userName}</span>
                                <span className="mt-0.5 text-[11px] font-bold opacity-60">{user.phone || user.userName || '-'}</span>
                              </span>
                              <input type="checkbox" checked={checked} onChange={() => togglePassenger(user.id)} />
                            </label>
                          );
                        }) : (
                          <div className="px-3 py-6 text-center text-xs font-bold text-slate-400">مسافری پیدا نشد.</div>
                        )}
                      </div>
                    </div>
                  </Field>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-700">مسافران انتخاب شده</span>
                        <Badge tone={selectedPassengers.length ? 'blue' : 'slate'}>{selectedPassengers.length}</Badge>
                      </div>
                      <div className="mt-3 max-h-40 overflow-y-auto">
                        {selectedPassengers.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {selectedPassengers.map((passenger) => (
                              <button
                                key={passenger.id}
                                type="button"
                                onClick={() => togglePassenger(passenger.id)}
                                className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700"
                              >
                                {passenger.fullName || passenger.userName} ×
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl bg-slate-50 px-3 py-6 text-center text-xs font-bold text-slate-400">
                            هنوز مسافری انتخاب نشده است.
                          </div>
                        )}
                      </div>
                    </div>

                    <Field label="هزینه اولیه (ریال)">
                      <Input type="number" min="0" inputMode="numeric" value={formData.firstCost ?? '0'} onChange={(e) => updateField('firstCost', e.target.value)} />
                      <span className="rounded-xl bg-slate-50 px-3 py-2 text-right text-xs font-black text-slate-600">{formatRial(formData.firstCost)}</span>
                    </Field>
                  </div>
                </div>

                <Field label="یادداشت‌ها">
                  <Textarea rows="4" value={formData.notes} onChange={(e) => updateField('notes', e.target.value)} />
                </Field>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
        <SecondaryButton type="button" onClick={onCancel}>انصراف</SecondaryButton>
        {currentTabIndex > 0 ? (
          <SecondaryButton type="button" onClick={goBack}>مرحله قبل</SecondaryButton>
        ) : null}
        {currentTabIndex < missionSteps.length - 1 ? (
          <PrimaryButton type="button" onClick={goNext}>مرحله بعد</PrimaryButton>
        ) : (
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? 'در حال ذخیره...' : 'ثبت نهایی ماموریت'}
          </PrimaryButton>
        )}
      </div>
    </form>
  );
}
