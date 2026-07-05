import type { InputHTMLAttributes, ReactNode } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  onEndIconClick?: () => void;
};

export function Input({
  label,
  error,
  startIcon,
  endIcon,
  onEndIconClick,
  className = "",
  ...props
}: InputProps) {
  return (
    <label className="block text-right">
      <span className="mb-2 block text-sm font-medium text-sky-950">
        {label}
      </span>

      <div
        className={`fleet-control flex items-center rounded-2xl border bg-white/70 px-4 transition focus-within:border-sky-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-100 ${
          error ? "border-red-300" : "border-sky-200"
        }`}
      >
        {startIcon && (
          <>
            <span className="flex h-12 items-center text-sky-700">
              {startIcon}
            </span>

            <span className="mx-3 h-6 w-px bg-sky-200" />
          </>
        )}

        <input
          dir=""
          className={`h-12 min-w-0 flex-1 text-right bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 ${className}`}
          {...props}
        />

        {endIcon && (
          <button
            type="button"
            onClick={onEndIconClick}
            className="mr-3 flex h-12 cursor-pointer items-center text-sky-700 transition hover:text-sky-950"
          >
            {endIcon}
          </button>
        )}
      </div>

      {error && (
        <span className="mt-2 block text-sm text-red-600">{error}</span>
      )}
    </label>
  );
}
