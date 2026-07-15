// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import {
  HiOutlineArrowDownTray,
  HiOutlineCalendarDays,
  HiOutlineCheck,
  HiOutlineChevronDown,
  HiOutlineFunnel,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
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
  Modal,
  PrimaryButton,
  RowActionMenu,
  SecondaryButton,
  Select,
  DataTableExportButton,
} from "../components/shared/UI";

const emptyForm = {
  userId: "",
  accessGroupId: "",
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

import { DriverMetricCard } from "../features/drivers/components/DriverMetricCard";
import { DriverAvatar } from "../features/drivers/components/DriverAvatar";
import { CreateDriverModal } from "../features/drivers/components/CreateDriverModal";
import { DriversFilters } from "../features/drivers/components/DriversFilters";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPlainDate(value) {
  return value ? String(value).replaceAll("-", "/") : "";
}



export default function Drivers() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [driverUsers, setDriverUsers] = useState([]);
  const [accessGroups, setAccessGroups] = useState([]);
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
  const [wizardStep, setWizardStep] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const canView = hasPermission(user, "drivers.view");
  const canCreate = hasPermission(user, "drivers.create");
  const canUpdate = hasPermission(user, "drivers.update");
  const canDelete = hasPermission(user, "drivers.delete");

  const loadData = async () => {
    const [driversResponse, usersResponse, accessGroupsResponse] = await Promise.all([
      usersAPI.listDrivers(),
      usersAPI.list(),
      usersAPI.listAccessGroups(),
    ]);
    setRows(normalizeCollection(driversResponse.data));
    setDriverUsers(normalizeCollection(usersResponse.data).filter((row) => !row.isSuperuser));
    setAccessGroups(normalizeCollection(accessGroupsResponse.data).filter((row) => row.isActive !== false));
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

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const response = await usersAPI.downloadDrivers(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'drivers_export.xlsx';
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
    setWizardStep(1);
    setEditingId(null);
    setFormData({ ...emptyForm, startDate: new Date().toISOString().slice(0, 10) });
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setFormMode("edit");
    setWizardStep(1);
    setEditingId(row.id);
    setFormData({
      userId: row.userId ? String(row.userId) : "",
      accessGroupId: "",
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

  const closeDriverModal = () => {
    setModalOpen(false);
    setWizardStep(1);
    setFormError("");
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

    if (wizardStep === 1) {
      if (!formData.userId && !formData.name.trim()) {
        setFormError("نام راننده را وارد کنید.");
        return;
      }
      if (!formData.startDate) {
        setFormError("تاریخ شروع را انتخاب کنید.");
        return;
      }
      if (formData.userId && !formData.accessGroupId) {
        setFormError("گروه دسترسی جدید کاربر را انتخاب کنید.");
        return;
      }
      setFormError("");
      setWizardStep(2);
      return;
    }

    setSubmitting(true);
    setFormError("");

    const payload = {
      userId: formData.userId ? Number(formData.userId) : null,
      accessGroupId: formData.userId ? Number(formData.accessGroupId) : null,
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
          <DataTableExportButton onClick={handleDownload} disabled={downloading} />

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
            </button>
          ))}

          <DriversFilters
            filterOpen={filterOpen}
            setFilterOpen={setFilterOpen}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            dateFrom={dateFrom}
            setDateFrom={setDateFrom}
            dateTo={dateTo}
            setDateTo={setDateTo}
            scoreFrom={scoreFrom}
            setScoreFrom={setScoreFrom}
            scoreTo={scoreTo}
            setScoreTo={setScoreTo}
            setPage={setPage}
            actionMenuId={actionMenuId}
            clearFilters={clearFilters}
          />
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
                        <td className="border-b border-r border-gray-300 px-4 py-2 text-center">
                          <div onClick={(event) => event.stopPropagation()}>
                            <RowActionMenu
                              items={[
                                canUpdate && {
                                  label: "ویرایش",
                                  onClick: () => openEditModal(row),
                                },
                                {
                                  label: "تغییر رمز",
                                  tone: "blue",
                                  onClick: () => setActionMenuId(null),
                                },
                                canDelete && {
                                  label: "حذف",
                                  tone: "delete",
                                  onClick: () => handleDelete(row),
                                },
                              ]}
                            />
                          </div>
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

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              disabled={safePage >= pageCount}
              className="h-8 rounded-[10px] bg-[#206AB4] px-6 md:px-3 text-xs text-white disabled:bg-[#D9D9D9]"
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
              className="h-8 rounded-[10px] bg-[#7D7D7D] px-6 md:px-3 text-xs text-white disabled:bg-[#D9D9D9]"
            >
              قبل
            </button>
          </div>
        </div>
      </div>

      <CreateDriverModal
        open={modalOpen}
        mode={formMode}
        wizardStep={wizardStep}
        setWizardStep={setWizardStep}
        formData={formData}
        driverUsers={driverUsers}
        accessGroups={accessGroups}
        formError={formError}
        submitting={submitting}
        onClose={closeDriverModal}
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
