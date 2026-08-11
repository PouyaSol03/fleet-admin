import { useState, useMemo, useCallback } from 'react';
import { ErrorAlert, Field, Input, Select, Textarea } from '../../../components/shared/UI';
import { getVehicleLabel, getDriverLabel, vehicleBelongsToDriver, getPrimaryVehicleForDriver } from '../utils';

const requestFormTabs = [
  { key: 'main', label: 'اطلاعات اصلی' },
  { key: 'route', label: 'مسیر' },
  { key: 'schedule', label: 'زمان و مسافران' },
];

export function RequestForm({
  formData,
  setFormData,
  users,
  drivers,
  vehicles,
  formError,
}: any) {
  const [activeTab, setActiveTab] = useState('main');
  const [passengerSearch, setPassengerSearch] = useState('');

  const selectedPassengerIds = useMemo(
    () => new Set((formData.passengerIds || []).map(String)),
    [formData.passengerIds],
  );

  const passengerOptions = useMemo(() => {
    const query = passengerSearch.trim().toLowerCase();
    const filtered = users.filter((option: any) => {
      const label = `${option.fullName || ''} ${option.userName || ''}`.toLowerCase();
      return !query || label.includes(query);
    });

    return filtered.slice(0, 40);
  }, [passengerSearch, users]);

  const selectedPassengers = useMemo(
    () => users.filter((option: any) => selectedPassengerIds.has(String(option.id))),
    [selectedPassengerIds, users],
  );
  
  const suggestedVehicles = useMemo(
    () => (
      formData.suggestedDriverId
        ? vehicles.filter((vehicle: any) => vehicleBelongsToDriver(vehicle, formData.suggestedDriverId))
        : vehicles
    ),
    [formData.suggestedDriverId, vehicles],
  );

  const updateField = useCallback((field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  }, [setFormData]);

  const selectSuggestedDriver = useCallback((driverId: string) => {
    const primaryVehicle = getPrimaryVehicleForDriver(vehicles, driverId);
    setFormData((prev: any) => {
      const currentVehicle = vehicles.find((vehicle: any) => String(vehicle.id) === String(prev.vehicleId));
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

  const togglePassenger = useCallback((id: string | number) => {
    const value = String(id);
    setFormData((prev: any) => {
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
    setFormData((prev: any) => ({ ...prev, passengerIds: [] }));
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
                  {drivers.map((driver: any) => (
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
                  {suggestedVehicles.map((vehicle: any) => (
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
              rows={4}
              value={formData.pickupPointsText}
              onChange={(event) => updateField('pickupPointsText', event.target.value)}
            />
          </Field>
          <Field label="مقصدهای چندگانه" hint="هر خط یک مقصد">
            <Textarea
              rows={4}
              value={formData.dropoffPointsText}
              onChange={(event) => updateField('dropoffPointsText', event.target.value)}
            />
          </Field>
          <Field label="توضیحات">
            <Textarea
              rows={4}
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
                rows={4}
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
                  {selectedPassengers.map((option: any) => (
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
                {passengerOptions.length ? passengerOptions.map((option: any) => {
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
