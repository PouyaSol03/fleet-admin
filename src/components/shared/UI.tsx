import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type Tone = "slate" | "blue" | "emerald" | "amber" | "red" | "rose" | "purple";
type Row = Record<string, ReactNode>;

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

type SectionCardProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

type FieldProps = {
  label: string;
  error?: string;
  children?: ReactNode;
  hint?: string;
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
  className?: string;
};

type DataTableColumn = {
  key: string;
  title: string;
  render?: (value: ReactNode, row: Row) => ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-100 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-sky-950">{title}</h1>
        {description ? (
          <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function SectionCard({ title, subtitle, actions, children, className = "" }: SectionCardProps) {
  return (
    <section className={`rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-100 ${className}`.trim()}>
      {title || subtitle || actions ? (
        <div className="mb-5 flex flex-col gap-2 border-b border-sky-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            {title ? <h2 className="text-base font-bold text-sky-950">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  tone = "blue",
  helper,
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
  helper?: ReactNode;
}) {
  const toneClass = {
    blue: "border-sky-100 bg-sky-50",
    emerald: "border-emerald-100 bg-emerald-50",
    amber: "border-amber-100 bg-amber-50",
    rose: "border-rose-100 bg-rose-50",
    purple: "border-violet-100 bg-violet-50",
    slate: "border-slate-100 bg-slate-50",
    red: "border-red-100 bg-red-50",
  }[tone] || "border-sky-100 bg-sky-50";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

export function Badge({ children, tone = "slate" }: { children?: ReactNode; tone?: Tone }) {
  const toneClass = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-sky-100 text-sky-800",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-700",
    rose: "bg-rose-100 text-rose-700",
    purple: "bg-violet-100 text-violet-700",
  }[tone] || "bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${toneClass}`}>
      {children}
    </span>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/60 px-6 py-10 text-center text-slate-500">
      <p className="text-sm font-semibold text-sky-950">{title}</p>
      {description ? <p className="mt-1 text-xs">{description}</p> : null}
    </div>
  );
}

export function ErrorAlert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

export function LoadingState({ message = "در حال بارگذاری..." }: { message?: string }) {
  return (
    <div className="rounded-3xl bg-white px-6 py-12 text-center text-sm text-slate-500 shadow-sm ring-1 ring-sky-100">
      {message}
    </div>
  );
}

export function ToolbarInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 ${props.className || ""}`.trim()}
    />
  );
}

export function ToolbarSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-11 w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 ${props.className || ""}`.trim()}
    />
  );
}

export function Field({ label, error, children, hint }: FieldProps) {
  return (
    <label className="block space-y-2 text-right">
      <span className="text-sm font-medium text-sky-950">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
      {error ? <span className="block text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 ${props.className || ""}`.trim()}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 ${props.className || ""}`.trim()}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-11 w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 ${props.className || ""}`.trim()}
    />
  );
}

export function PrimaryButton({ children, className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`h-10 rounded-xl border border-[#206AB4] bg-[#206AB4] px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60 ${className}`.trim()}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`h-10 rounded-xl border border-sky-100 bg-white px-4 py-2 text-sm font-semibold text-sky-800 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 ${className}`.trim()}
    >
      {children}
    </button>
  );
}

export function DangerButton({ children, className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`h-10 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 ${className}`.trim()}
    >
      {children}
    </button>
  );
}

export function DataTable({
  columns,
  rows,
  keyField = "id",
  emptyTitle = "داده ای یافت نشد.",
}: {
  columns: DataTableColumn[];
  rows: Row[];
  keyField?: string;
  emptyTitle?: string;
}) {
  if (!rows.length) return <EmptyState title={emptyTitle} />;

  return (
    <div className="overflow-x-auto rounded-2xl border border-sky-100">
      <table className="min-w-full bg-white text-sm text-slate-700">
        <thead>
          <tr className="bg-sky-50 text-sky-950">
            {columns.map((column) => (
              <th
                key={column.key}
                className="whitespace-nowrap border-b border-l border-sky-100 px-4 py-3 text-right font-bold last:border-l-0"
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={String(row[keyField] ?? rowIndex)}
              className={`${rowIndex % 2 === 0 ? "bg-white" : "bg-sky-50/30"} transition hover:bg-sky-50`}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className="border-b border-l border-sky-50 px-4 py-3 align-top last:border-l-0"
                >
                  {column.render ? column.render(row[column.key], row) : row[column.key] ?? "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children?: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-xl ring-1 ring-sky-100">
        <div className="sticky top-0 flex items-center justify-between border-b border-sky-100 bg-white/95 px-5 py-4 backdrop-blur">
          <h3 className="text-base font-bold text-sky-950">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-sky-50 hover:text-sky-950"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function AccessDenied({
  title = "دسترسی مجاز نیست.",
  description = "شما مجوز مشاهده این بخش را ندارید.",
}: {
  title?: string;
  description?: string;
} = {}) {
  return <EmptyState title={title} description={description} />;
}
