import { useState, useMemo, useCallback } from 'react';
import { ErrorAlert, Field, Input, Select, Textarea, SecondaryButton, PrimaryButton } from '../../../components/shared/UI';
import { getDriverLabel, getVehicleLabel, getPrimaryVehicleForDriver, vehicleBelongsToDriver } from '../utils';
import { formatDate, toBooleanLabel } from '../../../utils/formatters';
import { SummaryRow } from './SummaryRow';

const decisionSteps = [
  { key: 1, label: 'خلاصه درخواست' },
  { key: 2, label: 'راننده' },
  { key: 3, label: 'خودرو' },
  { key: 4, label: 'بررسی نهایی' },
  { key: 5, label: 'هزینه و یادداشت' },
];

function formatRial(value: any) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '۰ ریال';
  return `${new Intl.NumberFormat('fa-IR').format(amount)} ریال`;
}

export function MissionDecisionWizard({
  requestRow,
  drivers,
  vehicles,
  decisionData,
  setDecisionData,
  decisionError,
  decisionSubmitting,
  onSubmit,
  onCancel,
}: any) {
  const [step, setStep] = useState(1);
  const selectedDriver = useMemo(
    () => drivers.find((driver: any) => String(driver.id) === String(decisionData.driverId)),
    [decisionData.driverId, drivers],
  );
  const driverVehicles = useMemo(
    () => vehicles.filter((vehicle: any) => vehicleBelongsToDriver(vehicle, decisionData.driverId)),
    [decisionData.driverId, vehicles],
  );
  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle: any) => String(vehicle.id) === String(decisionData.vehicleId)),
    [decisionData.vehicleId, vehicles],
  );
  const updateDecision = useCallback((field: string, value: any) => {
    setDecisionData((prev: any) => ({ ...prev, [field]: value }));
  }, [setDecisionData]);

  const selectDriver = useCallback((driverId: string | number) => {
    const vehicle = getPrimaryVehicleForDriver(vehicles, driverId);
    setDecisionData((prev: any) => ({
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

  const handleWizardSubmit = (event: any) => {
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
            {drivers.length ? drivers.map((driver: any) => {
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
                {driverVehicles.map((vehicle: any) => (
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
              step={1}
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
              rows={5}
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
