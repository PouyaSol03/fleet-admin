// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useState } from 'react';
import {
  Badge,
  Field,
  Input,
  Select,
  Textarea,
  PrimaryButton,
  SecondaryButton,
} from '../shared/UI';

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

  const handlePassengerChange = (event) => {
    const values = Array.from(event.target.selectedOptions, (option) => option.value);
    setFormData((prev) => ({ ...prev, passengerIds: values }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-4 text-right">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-slate-400">عنوان ماموریت</span>
            <span className="text-sm font-black text-slate-700">
              {formData.title || displayTitle || 'ماموریت جدید'}
            </span>
          </div>
          {!isCreateMode && <Badge tone={statusTone[formData.status]}>{statusLabel[formData.status]}</Badge>}
        </div>

        <div className="mt-2 border-t border-slate-200/60 pt-2">
          <span className="text-[11px] font-bold text-slate-500 block mb-1.5">تغییر سریع وضعیت ماموریت:</span>
          <div className="grid grid-cols-4 gap-1.5">
            {Object.keys(statusLabel).map((statusKey) => {
              const isActive = formData.status === statusKey;
              const activeClasses = {
                planned: 'bg-amber-500 border-amber-600 text-white shadow-sm ring-2 ring-amber-200',
                active: 'bg-blue-600 border-blue-700 text-white shadow-sm ring-2 ring-blue-200',
                done: 'bg-emerald-600 border-emerald-700 text-white shadow-sm ring-2 ring-emerald-200',
                canceled: 'bg-red-600 border-red-700 text-white shadow-sm ring-2 ring-red-200',
              };
              return (
                <button
                  key={statusKey}
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, status: statusKey }))}
                  className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all border text-center ${
                    isActive ? activeClasses[statusKey] : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {statusLabel[statusKey].replace(' شده', '')}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex border-b border-slate-100 pb-1" dir="rtl">
        <button type="button" onClick={() => setFormTab('general')} className={`pb-2 px-4 text-xs font-bold transition-all border-b-2 ${formTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>اصلی و خودرو</button>
        <button type="button" onClick={() => setFormTab('route')} className={`pb-2 px-4 text-xs font-bold transition-all border-b-2 ${formTab === 'route' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>مسیر و ایستگاه‌ها</button>
        <button type="button" onClick={() => setFormTab('passengers')} className={`pb-2 px-4 text-xs font-bold transition-all border-b-2 ${formTab === 'passengers' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>مسافران و یادداشت</button>
      </div>

      <div className="pt-2 min-h-[220px]">
        {formTab === 'general' && (
          <div className="space-y-4 animate-fadeIn">
            <Field label="عنوان ماموریت">
              <Input value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="انتخاب خودرو">
                <Select value={formData.vehicleId} onChange={(e) => setFormData((p) => ({ ...p, vehicleId: e.target.value }))}>
                  <option value="">بدون خودرو</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={String(v.id)}>{v.model || 'خودرو'} - {v.plateNumber || 'بدون پلاک'}</option>
                  ))}
                </Select>
              </Field>
              <Field label="راننده ماموریت">
                <Select value={formData.driverId} onChange={(e) => setFormData((p) => ({ ...p, driverId: e.target.value }))}>
                  <option value="">بدون راننده</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={String(d.id)}>{d.name}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="تاریخ شروع">
                <Input type="date" value={formData.startDate} onChange={(e) => setFormData((p) => ({ ...p, startDate: e.target.value }))} required />
              </Field>
              <Field label="تاریخ پایان">
                <Input type="date" value={formData.endDate} onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4 items-center pt-2">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-600 cursor-pointer h-[42px]">
                <input type="checkbox" checked={formData.isSpecial} onChange={(e) => setFormData((p) => ({ ...p, isSpecial: e.target.checked }))} />
                <span>ماموریت ویژه اختصاصی</span>
              </label>
              <Field label="نوع دوره">
                <Select value={formData.missionType} onChange={(e) => setFormData((p) => ({ ...p, missionType: e.target.value }))}>
                  <option value="single">تکی</option>
                  <option value="periodic">دوره‌ای</option>
                </Select>
              </Field>
            </div>
          </div>
        )}

        {formTab === 'route' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="اولین مبدا">
                <Input value={formData.origin} onChange={(e) => setFormData((p) => ({ ...p, origin: e.target.value }))} required />
              </Field>
              <Field label="آخرین مقصد">
                <Input value={formData.destination} onChange={(e) => setFormData((p) => ({ ...p, destination: e.target.value }))} required />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="مبداهای فرعی جایگزین" hint="هر خط یک آدرس">
                <Textarea rows="3" value={formData.pickupPointsText} onChange={(e) => setFormData((p) => ({ ...p, pickupPointsText: e.target.value }))} />
              </Field>
              <Field label="مقصدهای فرعی جایگزین" hint="هر خط یک آدرس">
                <Textarea rows="3" value={formData.dropoffPointsText} onChange={(e) => setFormData((p) => ({ ...p, dropoffPointsText: e.target.value }))} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="نوع جاده / مسیر">
                <Select value={formData.vehicleType} onChange={(e) => setFormData((p) => ({ ...p, vehicleType: e.target.value }))}>
                  <option value="in_city">داخل شهری</option>
                  <option value="out_of_city">برون شهری</option>
                </Select>
              </Field>
              <Field label="تعداد نفرات ظرفیت">
                <Input type="number" min="1" value={formData.peopleCount} onChange={(e) => setFormData((p) => ({ ...p, peopleCount: e.target.value }))} required />
              </Field>
            </div>
          </div>
        )}

        {formTab === 'passengers' && (
          <div className="space-y-4">
            <Field label="مسافران تخصیص یافته" hint="برای انتخاب چندگانه Ctrl را نگه‌دارید">
              <select multiple value={formData.passengerIds} onChange={handlePassengerChange} className="h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100">
                {users.map((u) => <option key={u.id} value={String(u.id)}>{u.fullName || u.userName}</option>)}
              </select>
            </Field>
            <Field label="یادداشت‌ها">
              <Textarea rows="2" value={formData.notes} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} />
            </Field>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
        <SecondaryButton type="button" onClick={onCancel}>انصراف</SecondaryButton>
        <PrimaryButton type="submit" disabled={submitting}>
          {submitting ? 'در حال اعمال تغییرات...' : 'ذخیره نهایی'}
        </PrimaryButton>
      </div>
    </form>
  );
}