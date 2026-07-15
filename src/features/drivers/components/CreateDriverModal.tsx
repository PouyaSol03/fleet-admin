import { useState, useMemo } from "react";
import { HiOutlineCheck } from "react-icons/hi2";
import { Modal, ErrorAlert, Field, Input, Select, PrimaryButton, SecondaryButton } from "../../../components/shared/UI";
import { ToolbarSearchInput } from "../../../components/ui/ToolbarSearchInput";
import { WizardStep } from "./WizardStep";
import { DriverInfoPanel } from "./DriverInfoPanel";

const statusLabelMap: Record<string, string> = {
  active: "فعال",
  inactive: "غیرفعال",
};

function getUserDriverName(user: any) {
  return user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.userName || "";
}

function getUserDriverPhone(user: any) {
  return user?.phone || "";
}

export function CreateDriverModal({
  open,
  mode,
  wizardStep,
  setWizardStep,
  formData,
  driverUsers,
  accessGroups,
  formError,
  submitting,
  onClose,
  onSubmit,
  onChange,
}: any) {
  const title = mode === "edit" ? "ویرایش راننده" : "اضافه کردن راننده";
  const [userSearch, setUserSearch] = useState("");
  const selectedUser = driverUsers.find((option: any) => String(option.id) === String(formData.userId));
  const selectedAccessGroup = accessGroups.find((option: any) => String(option.id) === String(formData.accessGroupId));
  
  const selectUser = (option: any) => {
    onChange("userId", String(option.id));
    onChange("accessGroupId", "");
    onChange("name", getUserDriverName(option));
    onChange("phone", getUserDriverPhone(option));
  };
  
  const unlinkUser = () => {
    onChange("userId", "");
    onChange("accessGroupId", "");
  };

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    const matches = driverUsers
      .filter((option: any) => {
        if (!query) return true;
        return [option.fullName, option.userName, option.phone, option.nationalCode]
          .some((value) => String(value || "").toLowerCase().includes(query));
      })
      .slice(0, 40);
    if (selectedUser && !matches.some((option: any) => String(option.id) === String(selectedUser.id))) {
      return [selectedUser, ...matches];
    }
    return matches;
  }, [driverUsers, selectedUser, userSearch]);

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      bodyClassName="flex flex-col overflow-hidden p-0 sm:p-0"
      panelClassName="h-[92dvh]"
    >
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          <ErrorAlert message={formError} />

          <div className="grid gap-3 md:grid-cols-2">
            <WizardStep step={1} current={wizardStep} title="حساب و مشخصات راننده" />
            <WizardStep step={2} current={wizardStep} title="وضعیت راننده" />
          </div>

        {wizardStep === 1 ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#D9D9D9] bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#222222]">حساب کاربری راننده</h4>
                    <p className="mt-1 text-xs leading-5 text-[#737373]">
                      اگر برای این راننده حساب کاربری ساخته‌اید، همان حساب را انتخاب کنید تا نام و موبایل خودکار ثبت شود.
                    </p>
                  </div>
                  {formData.userId ? (
                    <button
                      type="button"
                      onClick={unlinkUser}
                      className="rounded-lg border border-[#D9D9D9] bg-white px-3 py-2 text-xs font-semibold text-[#A30000] transition hover:bg-[#FFE6E6]"
                    >
                      ثبت دستی بدون حساب
                    </button>
                  ) : null}
                </div>

                <div className="mt-4">
                  <ToolbarSearchInput
                    value={userSearch}
                    onChange={setUserSearch}
                    placeholder="جستجوی کاربر"
                  />
                </div>

                <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-[#E8E8E8] bg-[#FAFBFC] p-2">
                  <button
                    type="button"
                    onClick={unlinkUser}
                    className={`mb-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-right text-sm transition ${!formData.userId ? "bg-[#EAF3FC] text-[#206AB4]" : "bg-white text-[#606060] hover:bg-[#EAF3FC]"}`}
                  >
                    <span>ثبت دستی بدون حساب کاربری</span>
                    {!formData.userId ? <HiOutlineCheck className="h-5 w-5" /> : null}
                  </button>
                  {filteredUsers.map((option: any) => {
                    const selected = String(option.id) === String(formData.userId);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => selectUser(option)}
                        className={`mb-2 flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-right text-sm transition ${selected ? "bg-[#EAF3FC] text-[#206AB4]" : "bg-white text-[#606060] hover:bg-[#EAF3FC]"}`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{getUserDriverName(option)}</span>
                          <span className="block truncate text-xs text-[#737373]">
                            {getUserDriverPhone(option) || "بدون موبایل"} · {option.userName}
                          </span>
                        </span>
                        {selected ? <HiOutlineCheck className="h-5 w-5 shrink-0" /> : null}
                      </button>
                    );
                  })}
                  {!filteredUsers.length ? (
                    <div className="px-3 py-6 text-center text-sm text-[#737373]">
                      کاربری پیدا نشد.
                    </div>
                  ) : null}
                </div>

                {selectedUser ? (
                  <div className="mt-4 rounded-xl border border-[#E8E8E8] bg-[#FAFBFC] p-3">
                    <Field
                      label="گروه دسترسی جدید کاربر"
                      hint={
                        selectedUser.accessGroupName
                          ? `گروه قبلی ${selectedUser.accessGroupName} جایگزین می‌شود.`
                          : "برای ورود راننده به پنل، یک گروه دسترسی انتخاب کنید."
                      }
                    >
                      <Select
                        value={formData.accessGroupId}
                        onChange={(event) => onChange("accessGroupId", event.target.value)}
                        required
                      >
                        <option value="">انتخاب گروه دسترسی</option>
                        {accessGroups.map((option: any) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <p className="mt-2 text-xs leading-5 text-[#737373]">
                      بعد از ذخیره، این گروه به عنوان گروه دسترسی همین کاربر ثبت می‌شود.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-[#D9D9D9] bg-white p-4">
                <h4 className="text-sm font-bold text-[#222222]">مشخصات نمایش راننده</h4>
                <p className="mt-1 text-sm leading-6 text-[#737373]">
                  {formData.userId
                    ? "نام و موبایل از حساب کاربری انتخاب‌شده خوانده می‌شود."
                    : "برای راننده بدون حساب، نام و موبایل را دستی وارد کنید."}
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="نام راننده">
                    <Input
                      value={formData.name}
                      onChange={(event) => onChange("name", event.target.value)}
                      placeholder="مثلا علی رضایی"
                      readOnly={Boolean(formData.userId)}
                      required={!formData.userId}
                    />
                  </Field>
                  <Field label="شماره موبایل">
                    <Input
                      type="tel"
                      inputMode="tel"
                      dir="ltr"
                      value={formData.phone}
                      onChange={(event) => onChange("phone", event.target.value)}
                      placeholder="09123456789"
                      readOnly={Boolean(formData.userId)}
                    />
                  </Field>
                  <Field label="تاریخ شروع">
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(event) => onChange("startDate", event.target.value)}
                      required
                    />
                  </Field>
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <DriverInfoPanel title="راهنما">
                راننده بدون حساب هم می‌تواند در خودروها، ماموریت‌ها و گزارش‌ها استفاده شود.
              </DriverInfoPanel>
              <DriverInfoPanel title="اتصال به کاربر">
                بعدا هم می‌توانید همین راننده را ویرایش کنید و به یک حساب کاربری وصل کنید؛ سوابق قبلی او حفظ می‌شود.
              </DriverInfoPanel>
            </aside>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#D9D9D9] bg-white p-4">
                <h4 className="text-sm font-bold text-[#222222]">وضعیت راننده</h4>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="وضعیت">
                    <Select
                      value={formData.status}
                      onChange={(event) => onChange("status", event.target.value)}
                    >
                      <option value="active">فعال</option>
                      <option value="inactive">غیرفعال</option>
                    </Select>
                  </Field>
                  <Field label="امتیاز">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="10"
                      step="0.1"
                      value={formData.score}
                      onChange={(event) => onChange("score", event.target.value)}
                      required
                    />
                  </Field>
                </div>
              </div>

            </div>

            <aside className="space-y-4">
              <DriverInfoPanel title="خلاصه">
                <div>راننده: <strong className="text-[#222222]">{formData.name || "بدون نام"}</strong></div>
                <div>وضعیت: <strong className="text-[#222222]">{statusLabelMap[formData.status] || "-"}</strong></div>
                <div>امتیاز: <strong className="text-[#222222]">{Number(formData.score || 0).toFixed(1)}</strong></div>
              </DriverInfoPanel>
              <DriverInfoPanel title="حساب کاربری">
                {selectedUser ? (
                  <div className="space-y-1">
                    <div>
                      به حساب <strong className="text-[#222222]">{selectedUser.fullName || selectedUser.userName}</strong> وصل می‌شود.
                    </div>
                    <div>
                      گروه جدید: <strong className="text-[#222222]">{selectedAccessGroup?.name || "انتخاب نشده"}</strong>
                    </div>
                  </div>
                ) : (
                  <>این راننده فعلا حساب ورود جداگانه ندارد.</>
                )}
              </DriverInfoPanel>
            </aside>
          </div>
        )}

        </div>

        <div className="shrink-0 border-t border-[#D9D9D9] bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-wrap justify-end gap-3">
            <SecondaryButton type="button" onClick={wizardStep === 1 ? onClose : () => setWizardStep(1)}>
              {wizardStep === 1 ? "انصراف" : "مرحله قبل"}
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={submitting}>
              {wizardStep === 1 ? "مرحله بعد" : submitting ? "در حال ذخیره..." : "ذخیره راننده"}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}
