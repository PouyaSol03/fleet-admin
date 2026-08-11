import { useState, useMemo, useEffect } from "react";
import type { ReactNode } from "react";
import { HiOutlineChevronDown } from "react-icons/hi";
import { motion, useReducedMotion } from "motion/react";

export type DataTableRow = Record<string, unknown>;
export type DataTableColumn = {
  key: string;
  title: ReactNode;
  render?: (value: unknown, row: DataTableRow) => ReactNode;
};

const requiredDataTableColumnKeys = [
  'plateNumber',
  'fullName',
  'name',
  'actions',
  'inspectorName',
  'title',
  'requesterName',
  'driverName'
];

const springTransition = {
  type: "spring" as const,
  stiffness: 420,
  damping: 30,
};

export function DataTable({
  columns,
  rows,
  keyField = "id",
  emptyTitle = "داده ای یافت نشد.",
}: {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  keyField?: string;
  emptyTitle?: string;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rowCountOpen, setRowCountOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const pageCount = useMemo(() => {
    return Math.max(1, Math.ceil(rows.length / pageSize));
  }, [rows.length, pageSize]);

  const safePage = useMemo(() => {
    return Math.min(page, pageCount);
  }, [page, pageCount]);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return rows.slice(start, end);
  }, [rows, safePage, pageSize]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const middleColumns = useMemo(() => {
    return columns.filter(col => !requiredDataTableColumnKeys.includes(col.key));
  }, [columns]);

  const [visibleKeys, setVisibleKeys] = useState<string[]>(requiredDataTableColumnKeys);

  const finalColumns = useMemo(() => {
    if (!isMobile) {
      return columns;
    }
    return columns.filter(col =>
      requiredDataTableColumnKeys.includes(col.key) || visibleKeys.includes(col.key)
    );
  }, [columns, visibleKeys, isMobile]);

  const handleToggle = (key: string) => {
    setVisibleKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {middleColumns.length > 0 && (
        <div className="block md:hidden rounded-2xl border border-slate-200 bg-slate-50/80 py-4 md:p-4 shadow-sm">
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
                  onClick={() => handleToggle(column.key)}
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
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  {column.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="w-full min-w-0 max-w-full overflow-x-auto bg-transparent rounded-2xl border border-[#D9D9D9]">
        <table className="min-w-full bg-white text-sm text-[#606060]">
          <thead>
            <tr className="bg-[#EFEFEF] text-[#011627]">
              {finalColumns.map((column) => (
                <th
                  key={column.key}
                  className="whitespace-nowrap border-b border-r border-[#D9D9D9] px-4 py-2 text-center font-bold first:border-r-0"
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length ? (
              paginatedRows.map((row, rowIndex) => (
                <tr
                  key={String(row[keyField] ?? rowIndex)}
                  className={`${rowIndex % 2 === 0 ? "bg-gray-50" : "bg-white"} cursor-pointer transition hover:bg-[#206AB4] hover:text-white`}
                >
                  {finalColumns.map((column) => (
                    <td
                      key={column.key}
                      className="border-b border-r border-[#D9D9D9] px-4 py-2 text-center align-middle first:border-r-0"
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : ((row[column.key] as ReactNode) ?? "-")}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={Math.max(finalColumns.length, 1)}
                  className="px-4 py-8 text-center text-[#737373]"
                >
                  {emptyTitle}
                </td>
              </tr>
            )}
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
  );
}

export function DataTableExportButton({ onClick, disabled }: { onClick?: () => void, disabled?: boolean }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 items-center justify-center gap-1 rounded-[10px] border border-[#D9D9D9] bg-white px-3 py-2 text-sm font-medium text-[#222222] transition hover:bg-[#EFEFEF] disabled:opacity-50 disabled:cursor-not-allowed"
      whileHover={shouldReduceMotion || disabled ? undefined : { y: -1, boxShadow: "0 10px 20px rgba(15, 23, 42, 0.08)" }}
      whileTap={shouldReduceMotion || disabled ? undefined : { scale: 0.97 }}
      transition={springTransition}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 3v11m0 0 4-4m-4 4-4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      خروجی
    </motion.button>
  );
}
