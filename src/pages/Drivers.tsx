// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import {
  HiOutlineArrowDownTray,
  HiOutlineCalendarDays,
  HiOutlineCheck,
  HiOutlineChevronDown,
  HiOutlineCog6Tooth,
  HiOutlineFunnel,
  HiOutlineInformationCircle,
  HiOutlineKey,
  HiOutlineMagnifyingGlass,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineTrash,
} from "react-icons/hi2";
import { usersAPI } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import { extractApiError, formatDate, normalizeCollection } from "../utils/formatters";
import {
  AccessDenied,
  ConfirmationModal,
  ErrorAlert,
  Field,
  Input,
  LoadingState,
  PrimaryButton,
  SecondaryButton,
  Select,
} from "../components/shared/UI";

const emptyForm = {
  userId: "",
  name: "",
  phone: "",
  status: "active",
  startDate: new Date().toISOString().slice(0, 10),
  score: "0",
};

const statusLabelMap = {
  active: "فعال",
  inactive: "غیرفعال",
};

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPlainDate(value) {
  return value ? String(value).replaceAll("-", "/") : "";
}

function TrendIndicator({ value }) {
  const isPositive = Number(value) >= 0;

  return (
    <div className="flex items-center gap-2">
      <span className={`text-base font-medium ${isPositive ? "text-[#00992E]" : "text-[#A30000]"}`}>
        {Math.abs(Number(value) || 0)}%
      </span>
      <span className="text-xs font-medium text-[#222222]">به نسبت ماه قبل</span>
    </div>
  );
}

function DriverMetricCard({ title, value, percent }) {
  return (
    <div
      className="relative flex h-[100px] w-full md:max-w-[286px] items-center justify-between overflow-hidden rounded-[15px] border border-[#D9D9D9] bg-white px-4 py-2"
      style={{ boxShadow: "2px 2px 7px 0px rgba(0, 0, 0, 0.08)" }}
    >
      <div className="absolute -left-3 -top-4 h-[50px] w-[50px] rounded-full bg-[#206AB433] blur-[18px]" />
      <div className="relative flex h-full flex-col justify-between">
        <p className="text-2xl font-medium text-[#222222]">{title}</p>
        <TrendIndicator value={percent} />
      </div>
      <span className="relative text-4xl font-normal text-black">{value}</span>
    </div>
  );
}

function DriverAvatar({ name }) {
  const letter = String(name || "ر").trim().charAt(0) || "ر";

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EAF3FC] text-base font-bold text-[#206AB4]">
      {letter}
    </div>
  );
}

function DriverModalField({ label, children, className = "", withInfo = false }) {
  return (
    <label className={`flex min-w-0 flex-col gap-2 text-right ${className}`}>
      <span className="flex h-6 items-center justify-end gap-2 text-base font-medium text-[#7D7D7D]">
        {withInfo ? <HiOutlineInformationCircle className="h-5 w-5 text-[#7D7D7D]" /> : null}
        <span>{label}</span>
      </span>
      {children}
    </label>
  );
}

const driverInputClass =
  "h-14 w-full rounded-md border border-[#D9D9D9] bg-white px-[13px] text-right text-sm font-normal text-[#222222] outline-none placeholder:text-[#BFC4D5] focus:border-[#206AB4]";

function DriverModalInput({ label, className = "", ...props }) {
  return (
    <DriverModalField label={label} className={className}>
      <input {...props} dir="rtl" className={driverInputClass} />
    </DriverModalField>
  );
}

function DriverModalDateInput({ label, className = "", ...props }) {
  return (
    <DriverModalField label={label} className={className}>
      <Input {...props} type="date" />
    </DriverModalField>
  );
}

function DriverModalSelect({ label, children, className = "", ...props }) {
  return (
    <DriverModalField label={label} className={className}>
      <div className="relative">
        <select {...props} dir="rtl" className={`${driverInputClass} appearance-none pl-10`}>
          {children}
        </select>
        <HiOutlineChevronDown className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7D7D7D]" />
      </div>
    </DriverModalField>
  );
}

function DriverModalTextarea({ label, className = "", ...props }) {
  return (
    <DriverModalField label={label} className={className} withInfo>
      <textarea
        {...props}
        dir="rtl"
        className="min-h-[100px] w-full resize-none rounded-md border border-[#D9D9D9] bg-white px-[13px] py-3 text-right text-sm font-normal text-[#222222] outline-none placeholder:text-[#7D7D7D] focus:border-[#206AB4]"
      />
    </DriverModalField>
  );
}

function CreateDriverModal({
  open,
  mode,
  formData,
  driverUsers,
  formError,
  submitting,
  onClose,
  onSubmit,
  onChange,
}) {
  if (!open) return null;

  const title = mode === "edit" ? "ویرایش راننده" : "اضافه کردن راننده";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
      <div className="w-full max-w-[1118px] overflow-hidden rounded-[10px] border border-[#D9D9D9] bg-white" dir="rtl">
        <div className="flex h-16 items-center justify-center rounded-bl-[50px] rounded-br-[15px] bg-[#206AB4] px-3">
          <h3 className="text-2xl font-medium text-white">{title}</h3>
        </div>

        <form onSubmit={onSubmit} className="p-4 md:p-8">
          <ErrorAlert message={formError} />

          <div dir="ltr" className="grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
            <DriverModalInput
              label="نام راننده"
              placeholder="نام راننده را وارد کنید"
              value={formData.name}
              onChange={(event) => onChange("name", event.target.value)}
              required
            />
            <DriverModalSelect
              label="کاربر راننده"
              value={formData.userId}
              onChange={(event) => onChange("userId", event.target.value)}
            >
              <option value="">بدون اتصال به کاربر</option>
              {driverUsers.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.fullName || option.userName}
                </option>
              ))}
            </DriverModalSelect>
            <DriverModalInput
              label="تلفن"
              placeholder="تلفن را وارد کنید"
              value={formData.phone}
              onChange={(event) => onChange("phone", event.target.value)}
            />
            <DriverModalDateInput
              label="تاریخ شروع"
              value={formData.startDate}
              onChange={(event) => onChange("startDate", event.target.value)}
              required
            />
            <DriverModalInput
              label="امتیاز"
              type="number"
              min="0"
              max="10"
              step="0.1"
              placeholder="امتیاز را وارد کنید"
              value={formData.score}
              onChange={(event) => onChange("score", event.target.value)}
              required
            />
            <DriverModalSelect
              label="وضعیت"
              value={formData.status}
              onChange={(event) => onChange("status", event.target.value)}
            >
              <option value="active">فعال</option>
              <option value="inactive">غیرفعال</option>
            </DriverModalSelect>
            <DriverModalTextarea
              label="اطلاعات تکمیلی"
              className="md:col-span-2 xl:col-span-3"
              placeholder="اطلاعات تکمیلی راننده را اینجا بنویسید..."
            />
          </div>

          <div className="mt-8 flex flex-col-reverse items-center justify-center gap-4 md:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-full max-w-[304px] items-center justify-center rounded-[10px] border border-[#A30000] bg-white px-3 text-base font-medium text-[#A30000]"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex h-10 w-full max-w-[304px] items-center justify-center rounded-[10px] border border-[#206AB4] bg-[#206AB4] px-3 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "در حال ذخیره..." : "تایید"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Drivers() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [driverUsers, setDriverUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [scoreFrom, setScoreFrom] = useState("0");
  const [scoreTo, setScoreTo] = useState("10");
  const [selectedRows, setSelectedRows] = useState([]);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [rowCountOpen, setRowCountOpen] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const canView = hasPermission(user, "drivers.view");
  const canCreate = hasPermission(user, "drivers.create");
  const canUpdate = hasPermission(user, "drivers.update");
  const canDelete = hasPermission(user, "drivers.delete");

  const loadData = async () => {
    const [driversResponse, usersResponse] = await Promise.all([
      usersAPI.listDrivers(),
      usersAPI.list(),
    ]);
    setRows(normalizeCollection(driversResponse.data));
    setDriverUsers(normalizeCollection(usersResponse.data).filter((row) => !row.isSuperuser));
  };

  useEffect(() => {
    if (!canView) return;

    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        await loadData();
      } catch (err) {
        if (mounted) setError(extractApiError(err, "بارگذاری رانندگان انجام نشد."));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [canView]);

  const filteredRows = useMemo(() => {
    const minScore = toNumber(scoreFrom);
    const maxScore = toNumber(scoreTo || 10);
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const rowScore = toNumber(row.score);
      const rowDate = String(row.startDate || "");
      const values = [row.id, row.userId, row.name, row.phone, row.userName];
      const matchesQuery =
        !query || values.some((value) => String(value || "").toLowerCase().includes(query));
      const matchesStatus = !statusFilter || row.status === statusFilter;
      const matchesDateFrom = !dateFrom || rowDate >= dateFrom;
      const matchesDateTo = !dateTo || rowDate <= dateTo;
      const matchesScore = rowScore >= minScore && rowScore <= maxScore;

      return matchesQuery && matchesStatus && matchesDateFrom && matchesDateTo && matchesScore;
    });
  }, [rows, search, statusFilter, dateFrom, dateTo, scoreFrom, scoreTo]);

  const activeDrivers = useMemo(
    () => rows.filter((row) => row.status === "active").length,
    [rows],
  );
  const inactiveDrivers = useMemo(
    () => rows.filter((row) => row.status === "inactive").length,
    [rows],
  );
  const averageScore = useMemo(() => {
    if (!rows.length) return 0;
    const total = rows.reduce((sum, row) => sum + toNumber(row.score), 0);
    return Number((total / rows.length).toFixed(1));
  }, [rows]);

  const activePercent = rows.length ? Math.round((activeDrivers / rows.length) * 100) : 0;
  const inactivePercent = rows.length ? -Math.round((inactiveDrivers / rows.length) * 100) : 0;
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pagedRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const visibleIds = pagedRows.map((row) => row.id).filter(Boolean);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedRows.includes(id));
  const activeFilterChips = [
    ...(statusFilter
      ? [
        {
          key: "status",
          label: "وضعیت:",
          value: statusLabelMap[statusFilter] || statusFilter,
          onRemove: () => setStatusFilter(""),
        },
      ]
      : []),
    ...(dateFrom || dateTo
      ? [
        {
          key: "date",
          label: "تاریخ:",
          value: `${dateFrom ? formatPlainDate(dateFrom) : "-"} تا ${dateTo ? formatPlainDate(dateTo) : "-"}`,
          onRemove: () => {
            setDateFrom("");
            setDateTo("");
          },
        },
      ]
      : []),
    ...(scoreFrom !== "0" || scoreTo !== "10"
      ? [
        {
          key: "score",
          label: "امتیاز:",
          value: `${Number(scoreFrom || 0).toFixed(1)} تا ${Number(scoreTo || 10).toFixed(1)}`,
          onRemove: () => {
            setScoreFrom("0");
            setScoreTo("10");
          },
        },
      ]
      : []),
  ];

  const openCreateModal = () => {
    setFormMode("create");
    setEditingId(null);
    setFormData({ ...emptyForm, startDate: new Date().toISOString().slice(0, 10) });
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setFormMode("edit");
    setEditingId(row.id);
    setFormData({
      userId: row.userId ? String(row.userId) : "",
      name: row.name || "",
      phone: row.phone || "",
      status: row.status || "active",
      startDate: String(row.startDate || "").slice(0, 10),
      score: String(row.score ?? 0),
    });
    setFormError("");
    setModalOpen(true);
    setActionMenuId(null);
  };

  const handleDelete = (row) => {
    setActionMenuId(null);
    setDeleteTarget(row);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await usersAPI.deleteDriver(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(extractApiError(err, "حذف راننده انجام نشد."));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");

    const payload = {
      userId: formData.userId ? Number(formData.userId) : null,
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      status: formData.status,
      startDate: formData.startDate,
      score: Number(Number(formData.score).toFixed(1)),
    };

    try {
      if (formMode === "edit") {
        await usersAPI.updateDriver(editingId, payload);
      } else {
        await usersAPI.createDriver(payload);
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(extractApiError(err, "ذخیره راننده انجام نشد."));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleVisibleRows = () => {
    if (allVisibleSelected) {
      setSelectedRows((current) => current.filter((id) => !visibleIds.includes(id)));
      return;
    }

    setSelectedRows((current) => Array.from(new Set([...current, ...visibleIds])));
  };

  const toggleRow = (rowId) => {
    if (!rowId) return;
    setSelectedRows((current) =>
      current.includes(rowId) ? current.filter((id) => id !== rowId) : [...current, rowId],
    );
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
    setScoreFrom("0");
    setScoreTo("10");
    setPage(1);
    setFilterOpen(false);
  };

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const requiredColumnKeys = ['driver', 'actions'];

  const allColumns = [
    { key: "id", title: "شناسه" },
    { key: "userId", title: "شناسه کاربر" },
    { key: "driver", title: "راننده" },
    { key: "userName", title: "نام کاربری" },
    { key: "status", title: "فعال/غیرفعال" },
    { key: "phone", title: "تلفن" },
    { key: "startDate", title: "تاریخ شروع" },
    { key: "score", title: "میانگین امتیاز" },
  ];

  const middleColumns = useMemo(() => {
    return allColumns.filter(col => !requiredColumnKeys.includes(col.key));
  }, []);

  const [visibleKeys, setVisibleKeys] = useState(requiredColumnKeys);

  const handleToggleColumn = (key) => {
    setVisibleKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const shouldRenderColumn = (key) => {
    if (!isMobile) return true;
    return requiredColumnKeys.includes(key) || visibleKeys.includes(key);
  };

  const activeColumnsCount = useMemo(() => {
    let count = allColumns.filter(col => shouldRenderColumn(col.key)).length;
    if ((canUpdate || canDelete) && shouldRenderColumn('actions')) count += 1;
    if (!isMobile) count += 1;
    return count;
  }, [visibleKeys, isMobile, canUpdate, canDelete]);

  if (!canView) return <AccessDenied />;

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div className="flex w-full items-center justify-start gap-1 text-xs">
        <span className="font-bold text-[#206AB4]">خانه</span>
        <span className="font-bold text-black">/</span>
        <span className="text-black">رانندگان</span>
        <span className="font-bold text-black">/</span>
        <span className="text-black">کاربران</span>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError("")} />

      <div className="grid w-full grid-cols-1 justify-items-end gap-4 md:grid-cols-2 xl:grid-cols-[286px_286px_1fr]">
        <DriverMetricCard title="تعداد راننده" value={rows.length} percent={activePercent} />
        <DriverMetricCard title="میانگین امتیاز" value={averageScore} percent={inactivePercent} />
      </div>

      <div
        className="w-full rounded-[10px] bg-white py-4 md:p-4"
        style={{ boxShadow: "2px 2px 7px 0px rgba(0, 0, 0, 0.08)" }}
      >
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:w-1/2 lg:w-1/3">
            <input
              className="h-10 w-full rounded-none border-0 border-b border-[#737373] bg-transparent py-3 pr-2 pl-9 text-sm text-[#222222] outline-none placeholder:text-[#737373] focus:border-[#737373]"
              placeholder="جست‌وجو ..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
            <HiOutlineMagnifyingGlass className="absolute left-2 top-1/2 h-5 w-5 -translate-y-1/2 text-[#959DB8]" />
          </div>

          {canCreate ? (
            <button
              type="button"
              onClick={openCreateModal}
              className="flex h-10 w-full items-center justify-center gap-1 rounded-[10px] border border-[#206AB4] bg-[#206AB4] px-3 text-sm font-medium text-white md:w-auto"
            >
              <span>اضافه کردن</span>
              <HiOutlinePlus className="h-[18px] w-[18px]" />
            </button>
          ) : null}
        </div>

        <div className="relative mb-4 flex flex-wrap items-center justify-start gap-3">
          <button
            type="button"
            className="flex h-10 items-center justify-center gap-1 rounded-[10px] border border-[#D9D9D9] px-3 py-2 text-sm text-[#222222]"
          >
            <span>Export</span>
            <HiOutlineArrowDownTray className="h-5 w-5" />
          </button>

          {activeFilterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => {
                chip.onRemove();
                setPage(1);
              }}
              className="flex h-8 items-center justify-center gap-1 rounded-[10px] border border-[#D9D9D9] bg-white px-2 text-xs font-medium text-[#222222]"
            >
              <span className="text-[#7D7D7D]">{chip.label}</span>
              <span>{chip.value}</span>
              <span className="text-[#A30000]">×</span>
            </button>
          ))}

          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((current) => !current)}
              className={`flex h-10 items-center justify-center gap-1 rounded-[10px] border px-2 py-4 text-xs font-medium transition ${filterOpen
                ? "border-[#D9D9D9] bg-[#206AB4] text-white"
                : "border-[#D9D9D9] bg-white text-[#222222]"
                }`}
            >
              <HiOutlineFunnel className="h-5 w-5" />
              <span>فیلتر</span>
            </button>

            {filterOpen ? (
              <div className="absolute right-0 top-10 z-30 w-[240px] rounded-[10px] border border-[#D9D9D9] bg-white p-2 shadow-xl">
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
                          className="flex h-8 w-[104px] items-center justify-end gap-1 text-[#7D7D7D]"
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

                  {[
                    { label: "از", value: dateFrom, setValue: setDateFrom },
                    { label: "تا", value: dateTo, setValue: setDateTo },
                  ].map((item) => (
                    <label key={item.label} className="block space-y-2">
                      <span className="block text-right text-base font-medium text-[#7D7D7D]">{item.label}</span>
                      <div className="flex h-10 overflow-hidden rounded-md border border-[#D9D9D9] bg-white">
                        <input
                          type="date"
                          value={item.value}
                          onChange={(event) => {
                            item.setValue(event.target.value);
                            setPage(1);
                          }}
                          className="h-full min-w-0 flex-1 bg-white px-2 text-left text-sm text-[#222222] outline-none"
                        />
                        <div className="flex h-10 w-11 items-center justify-center bg-[#D9D9D9] text-[#222222]">
                          <HiOutlineCalendarDays className="h-6 w-6" />
                        </div>
                      </div>
                    </label>
                  ))}
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
                      <div className="flex h-6 items-center gap-3">
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
                  className="flex h-10 w-full items-center justify-center rounded-[10px] border border-[#206AB4] bg-[#206AB4] text-base font-medium text-white"
                >
                  تایید
                </button>
              </div>
            ) : null}
          </div>

          <button type="button" className="hidden">
            <span>فیلتر</span>
            <HiOutlineFunnel className="h-5 w-5" />
          </button>

          {filterOpen && actionMenuId === "__legacy-filter__" ? (
            <div className="absolute right-0 top-12 z-20 grid w-[min(520px,calc(100vw-3rem))] gap-4 rounded-[10px] border border-[#D9D9D9] bg-white p-4 shadow-xl md:grid-cols-2">
              <Field label="وضعیت">
                <Select
                  value={statusFilter}
                  onChange={(event) => {
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
                  onChange={(event) => {
                    setScoreFrom(event.target.value);
                    setPage(1);
                  }}
                />
              </Field>
              <Field label="تاریخ شروع از">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => {
                    setDateFrom(event.target.value);
                    setPage(1);
                  }}
                />
              </Field>
              <Field label="تاریخ شروع تا">
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(event) => {
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
                  onChange={(event) => {
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
        {isMobile && middleColumns.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 py-4 md:p-4 shadow-sm mb-4">
            <div className="mb-3 flex items-center gap-2 text-slate-700">
              <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span className="text-xs font-bold">تنظیم نمایش ستون‌های جدول</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {middleColumns.map((column) => {
                const isChecked = visibleKeys.includes(column.key);
                return (
                  <button
                    key={column.key}
                    type="button"
                    onClick={() => handleToggleColumn(column.key)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 select-none
              ${isChecked
                        ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm shadow-blue-100/40'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                  >
                    <div className={`flex h-4 w-4 items-center justify-center rounded border transition-colors
              ${isChecked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'}`}
                    >
                      {isChecked && (
                        <HiOutlineCheck className="h-3 w-3 text-white" />
                      )}
                    </div>
                    {column.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300 bg-white text-sm text-gray-600">
            <thead>
              <tr className="bg-[#EFEFEF] text-[#011627]">
                {!isMobile && (
                  <th className="w-8 border-b border-r border-gray-300 px-4 py-2 text-center">
                    <button
                      type="button"
                      onClick={toggleVisibleRows}
                      className="mx-auto flex h-8 w-8 items-center justify-center rounded-[8px]"
                      aria-label="انتخاب همه"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-[4px] border border-[#D9D9D9] bg-white text-[#222222]">
                        {allVisibleSelected ? <HiOutlineCheck className="h-4 w-4" /> : null}
                      </span>
                    </button>
                  </th>
                )}
                {shouldRenderColumn('id') && <th className="w-8 border-b border-r border-gray-300 px-4 py-2 text-center font-bold">شناسه</th>}
                {shouldRenderColumn('userId') && <th className="min-w-[110px] border-b border-r border-gray-300 px-4 py-2 text-center font-bold">شناسه کاربر</th>}
                {shouldRenderColumn('driver') && <th className="min-w-[180px] border-b border-r border-gray-300 px-4 py-2 text-center font-bold">راننده</th>}
                {shouldRenderColumn('userName') && <th className="min-w-[170px] border-b border-r border-gray-300 px-4 py-2 text-center font-bold">نام کاربری</th>}
                {shouldRenderColumn('status') && <th className="min-w-[130px] border-b border-r border-gray-300 px-4 py-2 text-center font-bold">فعال/غیرفعال</th>}
                {shouldRenderColumn('phone') && <th className="min-w-[130px] border-b border-r border-gray-300 px-4 py-2 text-center font-bold">تلفن</th>}
                {shouldRenderColumn('startDate') && <th className="min-w-[130px] border-b border-r border-gray-300 px-4 py-2 text-center font-bold">تاریخ شروع</th>}
                {shouldRenderColumn('score') && <th className="min-w-[130px] border-b border-r border-gray-300 px-4 py-2 text-center font-bold">میانگین امتیاز</th>}
                {(canUpdate || canDelete) && shouldRenderColumn('actions') ? (
                  <th className="w-[140px] border-b border-r border-gray-300 px-4 py-2 text-center font-bold">اقدامات</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={activeColumnsCount}>
                    <LoadingState message="در حال دریافت اطلاعات..." className="min-h-[260px]" />
                  </td>
                </tr>
              ) : null}

              {!loading && !pagedRows.length ? (
                <tr>
                  <td colSpan={activeColumnsCount} className="px-4 py-8 text-center text-[#737373]">
                    راننده ای برای نمایش وجود ندارد.
                  </td>
                </tr>
              ) : null}

              {!loading
                ? pagedRows.map((row, rowIndex) => {
                  const isSelected = selectedRows.includes(row.id);
                  const displayName = row.name || row.fullName || "-";
                  const userName = row.userName || "-";

                  return (
                    <tr
                      key={row.id || rowIndex}
                      onClick={() => toggleRow(row.id)}
                      className={`${isSelected ? "bg-[#206AB4] text-white" : rowIndex % 2 === 0 ? "bg-gray-50" : "bg-white"} cursor-pointer transition hover:bg-[#206AB4] hover:text-white`}
                    >
                      {/* سلول چک باکس ردیف: فقط در دسکتاپ نمایش داده می‌شود */}
                      {!isMobile && (
                        <td className="border-b border-r border-gray-300 px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleRow(row.id);
                            }}
                            className="mx-auto flex h-8 w-8 items-center justify-center rounded-[8px]"
                            aria-label="انتخاب ردیف"
                          >
                            <span className="flex h-5 w-5 items-center justify-center rounded-[4px] border border-[#D9D9D9] bg-white text-[#222222]">
                              {isSelected ? <HiOutlineCheck className="h-4 w-4" /> : null}
                            </span>
                          </button>
                        </td>
                      )}
                      {shouldRenderColumn('id') && <td className="border-b border-r border-gray-300 px-4 py-2 text-center">{row.id ?? "-"}</td>}
                      {shouldRenderColumn('userId') && <td className="border-b border-r border-gray-300 px-4 py-2 text-center">{row.userId ?? "-"}</td>}
                      {shouldRenderColumn('driver') && (
                        <td className="border-b border-r border-gray-300 px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <DriverAvatar name={displayName} />
                            <div className="text-right">
                              <p className="text-sm font-medium">{displayName}</p>
                            </div>
                          </div>
                        </td>
                      )}
                      {shouldRenderColumn('userName') && <td className="border-b border-r border-gray-300 px-4 py-2 text-center">{userName}</td>}
                      {shouldRenderColumn('status') && (
                        <td className="border-b border-r border-gray-300 px-4 py-2 text-center">
                          {statusLabelMap[row.status] || row.status || "-"}
                        </td>
                      )}
                      {shouldRenderColumn('phone') && <td className="border-b border-r border-gray-300 px-4 py-2 text-center">{row.phone || "-"}</td>}
                      {shouldRenderColumn('startDate') && <td className="border-b border-r border-gray-300 px-4 py-2 text-center">{formatDate(row.startDate)}</td>}
                      {shouldRenderColumn('score') && <td className="border-b border-r border-gray-300 px-4 py-2 text-center">{toNumber(row.score).toFixed(1)}</td>}
                      {(canUpdate || canDelete) && shouldRenderColumn('actions') ? (
                        <td className="relative border-b border-r border-gray-300 px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setActionMenuId((current) => (current === row.id ? null : row.id));
                            }}
                            className="mx-auto flex h-8 items-center justify-center gap-1 rounded-[10px] border border-[#D9D9D9] bg-white px-2 text-[#222222]"
                            aria-label="اقدامات"
                          >
                            <HiOutlineCog6Tooth className="h-5 w-5" />
                            <HiOutlineChevronDown
                              className={`h-4 w-4 transition ${actionMenuId === row.id ? "rotate-180" : ""}`}
                            />
                          </button>
                          {actionMenuId === row.id ? (
                            <div
                              className="absolute left-4 top-11 z-20 flex w-[120px] flex-col gap-1 rounded-tl-[10px] rounded-bl-[10px] rounded-br-[10px] border border-[#D9D9D9] bg-white/85 px-2 py-1 text-[#222222] shadow-lg backdrop-blur-sm before:absolute before:-top-[7px] before:left-3 before:h-3 before:w-3 before:rotate-45 before:border-l before:border-t before:border-[#D9D9D9] before:bg-white/85"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {canUpdate ? (
                                <button
                                  type="button"
                                  onClick={() => openEditModal(row)}
                                  className="flex items-center justify-between rounded-[10px] px-1 py-1 text-xs hover:bg-[#FFF6E6]"
                                >
                                  <span>ویرایش</span>
                                  <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#FFF6E6] text-[#FFB031]">
                                    <HiOutlinePencilSquare className="h-5 w-5" />
                                  </span>
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => setActionMenuId(null)}
                                className="flex items-center justify-between rounded-[10px] px-1 py-1 text-xs hover:bg-[#EAF3FC]"
                              >
                                <span>تغییر رمز</span>
                                <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#EAF3FC] text-[#206AB4]">
                                  <HiOutlineKey className="h-5 w-5" />
                                </span>
                              </button>
                              {canDelete ? (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(row)}
                                  className="flex items-center justify-between rounded-[10px] px-1 py-1 text-xs hover:bg-[#FFE6E6]"
                                >
                                  <span>حذف</span>
                                  <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#FFE6E6] text-[#FA5454]">
                                    <HiOutlineTrash className="h-5 w-5" />
                                  </span>
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  );
                })
                : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-4 px-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex items-center gap-3 text-sm text-[#7D7D7D]">
            <span>تعداد سطر ها:</span>
            <button
              type="button"
              onClick={() => setRowCountOpen((current) => !current)}
              className="flex h-8 min-w-14 items-center justify-center gap-1 rounded-[10px] border border-[#206AB4] bg-white px-2 text-sm font-bold text-[#206AB4]"
              aria-haspopup="listbox"
              aria-expanded={rowCountOpen}
            >
              <HiOutlineChevronDown className={`h-4 w-4 transition ${rowCountOpen ? "rotate-180" : ""}`} />
              <span>{pageSize}</span>
            </button>
            {rowCountOpen ? (
              <div
                className="absolute right-[92px] bottom-9 z-20 flex w-16 flex-col rounded-[10px] border border-[#D9D9D9] bg-white p-1 text-[#222222] shadow-lg"
                role="listbox"
              >
                {[10, 20, 50].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setPageSize(option);
                      setPage(1);
                      setRowCountOpen(false);
                    }}
                    className={`h-8 rounded-[8px] text-sm font-bold transition hover:bg-[#EAF3FC] hover:text-[#206AB4] ${pageSize === option ? "bg-[#EAF3FC] text-[#206AB4]" : "text-[#222222]"
                      }`}
                    role="option"
                    aria-selected={pageSize === option}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={safePage >= pageCount}
              className="h-8 rounded-[10px] bg-[#206AB4] px-3 text-xs text-white disabled:bg-[#D9D9D9]"
            >
              بعد
            </button>
            <span className="text-xs text-[#7D7D7D]">
              صفحه {safePage} از {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={safePage <= 1}
              className="h-8 rounded-[10px] bg-[#7D7D7D] px-3 text-xs text-white disabled:bg-[#D9D9D9]"
            >
              قبل
            </button>
          </div>
        </div>
      </div>

      <CreateDriverModal
        open={modalOpen}
        mode={formMode}
        formData={formData}
        driverUsers={driverUsers}
        formError={formError}
        submitting={submitting}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        onChange={(field, value) => setFormData((prev) => ({ ...prev, [field]: value }))}
      />

      <ConfirmationModal
        open={Boolean(deleteTarget)}
        mode="delete"
        message={`آیا از حذف راننده "${deleteTarget?.name || ""}" اطمینان دارید؟`}
        loading={deleteSubmitting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
