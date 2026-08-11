import { HiOutlineFunnel, HiOutlineCheck } from "react-icons/hi2";
import { Field, Select, Input, PrimaryButton, SecondaryButton } from "../../../components/shared/UI";

export function DriversFilters({
  filterOpen,
  setFilterOpen,
  statusFilter,
  setStatusFilter,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  scoreFrom,
  setScoreFrom,
  scoreTo,
  setScoreTo,
  setPage,
  actionMenuId,
  clearFilters,
}: any) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setFilterOpen((current: boolean) => !current)}
        className={`flex h-10 items-center justify-center gap-1 rounded-[10px] border px-4 py-2 text-xs font-medium transition ${filterOpen
          ? "border-[#D9D9D9] bg-[#206AB4] text-white"
          : "border-[#D9D9D9] bg-white text-[#222222]"
          }`}
      >
        <HiOutlineFunnel className="h-5 w-5" />
        <span>فیلتر</span>
      </button>

      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${filterOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        onClick={() => setFilterOpen(false)}
      />

      <div
        className={`fixed bottom-0 left-0 right-0 z-50 w-full rounded-t-[24px] border border-[#D9D9D9] bg-white p-6 shadow-2xl max-h-[85vh] overflow-y-auto transform transition-all duration-300 ease-out ${filterOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"} md:absolute md:bottom-auto md:left-auto md:right-0 md:top-10 md:z-30 md:w-[240px] md:rounded-[10px] md:p-2 md:shadow-xl md:max-h-none md:transform-none md:transition-none md:opacity-100 md:translate-y-0 md:pointer-events-auto ${filterOpen ? "md:block" : "md:hidden"}`}
      >
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-gray-300 md:hidden" />

        <section className="space-y-2 pb-4">
          <div className="flex h-6 items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setStatusFilter("");
                setPage(1);
              }}
              className="text-xs font-normal text-[#A30000]"
            >
              حذف فیلتر
            </button>
            <h3 className="text-base font-bold text-[#222222]">وضعیت</h3>
          </div>

          <div className="flex items-center justify-between gap-4">
            {[
              { label: "غیر فعال", value: "inactive" },
              { label: "فعال", value: "active" },
            ].map((option) => {
              const checked = statusFilter === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(checked ? "" : option.value);
                    setPage(1);
                  }}
                  className="flex h-11 md:h-8 flex-1 md:w-[104px] items-center justify-end gap-2 border border-gray-100 rounded-xl p-2 md:border-none md:p-0 text-[#7D7D7D]"
                >
                  <span className="text-base font-medium">{option.label}</span>
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-[4px] border ${checked ? "border-[#206AB4] text-[#206AB4]" : "border-[#D9D9D9] text-[#222222]"
                      }`}
                  >
                    {checked ? <HiOutlineCheck className="h-4 w-4" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="h-px bg-[#D9D9D9]" />

        <section className="space-y-2 py-4">
          <div className="flex h-6 items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                setPage(1);
              }}
              className={`text-xs font-normal ${dateFrom || dateTo ? "text-[#A30000]" : "text-[#D9D9D9]"}`}
            >
              حذف فیلتر
            </button>
            <h3 className="text-base font-bold text-[#222222]">تاریخ</h3>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:block md:space-y-2">
            {[
              { label: "از", value: dateFrom, setValue: setDateFrom },
              { label: "تا", value: dateTo, setValue: setDateTo },
            ].map((item) => (
              <label key={item.label} className="block space-y-1 md:space-y-2">
                <span className="block text-right text-base font-medium text-[#7D7D7D]">{item.label}</span>
                <div className="compact-driver-date-picker">
                  <Input
                    type="date"
                    value={item.value}
                    onChange={(event) => {
                      item.setValue(event.target.value);
                      setPage(1);
                    }}
                    placeholder={item.label}
                  />
                </div>
              </label>
            ))}
          </div>
        </section>

        <div className="h-px bg-[#D9D9D9]" />

        <section className="space-y-2 py-4">
          <div className="flex h-6 items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setScoreFrom("0");
                setScoreTo("10");
                setPage(1);
              }}
              className="text-xs font-normal text-[#A30000]"
            >
              حذف فیلتر
            </button>
            <h3 className="text-base font-bold text-[#222222]">امتیاز</h3>
          </div>

          {[
            { label: "از", value: scoreFrom, setValue: setScoreFrom },
            { label: "تا", value: scoreTo, setValue: setScoreTo },
          ].map((item) => (
            <label key={item.label} className="block space-y-2">
              <span className="block text-right text-base font-medium text-[#7D7D7D]">{item.label}</span>
              <div className="flex h-8 items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={item.value}
                  onChange={(event) => {
                    item.setValue(event.target.value);
                    setPage(1);
                  }}
                  className="h-2 flex-1 cursor-pointer accent-[#206AB4]"
                />
                <span className="w-8 text-right text-base font-medium text-[#7D7D7D]">
                  {Number(item.value || 0).toFixed(1)}
                </span>
              </div>
            </label>
          ))}
        </section>

        <button
          type="button"
          onClick={() => setFilterOpen(false)}
          className="flex h-12 md:h-10 w-full items-center justify-center rounded-[10px] border border-[#206AB4] bg-[#206AB4] text-base font-medium text-white mt-4"
        >
          تایید
        </button>
      </div>

      {filterOpen && actionMenuId === "__legacy-filter__" ? (
        <div className="absolute right-0 top-12 z-20 grid w-[min(520px,calc(100vw-3rem))] gap-4 rounded-[10px] border border-[#D9D9D9] bg-white p-4 shadow-xl md:grid-cols-2">
          <Field label="وضعیت">
            <Select
              value={statusFilter}
              onChange={(event: any) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">همه وضعیت ها</option>
              <option value="active">فعال</option>
              <option value="inactive">غیرفعال</option>
            </Select>
          </Field>
          <Field label="امتیاز از">
            <Input
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={scoreFrom}
              onChange={(event: any) => {
                setScoreFrom(event.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Field label="تاریخ شروع از">
            <Input
              type="date"
              value={dateFrom}
              onChange={(event: any) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Field label="تاریخ شروع تا">
            <Input
              type="date"
              value={dateTo}
              onChange={(event: any) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Field label="امتیاز تا">
            <Input
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={scoreTo}
              onChange={(event: any) => {
                setScoreTo(event.target.value);
                setPage(1);
              }}
            />
          </Field>
          <div className="flex items-end justify-end gap-2">
            <SecondaryButton type="button" onClick={clearFilters}>
              پاک کردن
            </SecondaryButton>
            <PrimaryButton type="button" onClick={() => setFilterOpen(false)}>
              اعمال
            </PrimaryButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
