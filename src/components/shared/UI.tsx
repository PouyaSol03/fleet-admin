import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import DatePickerModule from "react-multi-date-picker";
import type { ChangedValue } from "react-multi-date-picker";
import DateObjectModule from "react-date-object";
import gregorian from "react-date-object/calendars/gregorian";
import persian from "react-date-object/calendars/persian";
import gregorian_en from "react-date-object/locales/gregorian_en";

import persian_fa from "react-date-object/locales/persian_fa";
import type {
  ChangeEvent,
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type Tone = "slate" | "blue" | "emerald" | "amber" | "red" | "rose" | "purple";



type FieldProps = {
  label: string;
  error?: string;
  children?: ReactNode;
  hint?: string;
};

type ButtonProps = HTMLMotionProps<"button"> & {
  children?: ReactNode;
  className?: string;
};



type ToastTone = "error" | "success";

type SelectOption = {
  label: ReactNode;
  value: string;
  disabled?: boolean;
};

type RowActionItem = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "edit" | "delete" | "blue" | "neutral";
};

type ModuleWithDefault<T> = {
  default?: T;
};



const DateObject =
  (DateObjectModule as ModuleWithDefault<typeof DateObjectModule>).default ||
  DateObjectModule;
const DatePicker =
  (DatePickerModule as ModuleWithDefault<typeof DatePickerModule>).default ||
  DatePickerModule;



const panelShadow = "2px 2px 7px 0px rgba(0, 0, 0, 0.08)";
const springTransition = {
  type: "spring" as const,
  stiffness: 420,
  damping: 30,
};

const fadeInInitial = { opacity: 0, scale: 0.98 };
const toastToneClass: Record<ToastTone, {
  border: string;
  iconBg: string;
  iconText: string;
  text: string;
}> = {
  error: {
    border: "border-[#FFE6E6]",
    iconBg: "bg-[#FFE6E6]",
    iconText: "text-[#FA5454]",
    text: "text-[#A30000]",
  },
  success: {
    border: "border-[#E8F7EF]",
    iconBg: "bg-[#E8F7EF]",
    iconText: "text-[#00992E]",
    text: "text-[#16803C]",
  },
};
const metricToneClass: Record<Tone, string> = {
  blue: "bg-[#206AB433]",
  emerald: "bg-[#00992E33]",
  amber: "bg-[#FFB03133]",
  rose: "bg-[#FA545433]",
  purple: "bg-[#7C3AED33]",
  slate: "bg-[#7D7D7D33]",
  red: "bg-[#A3000033]",
};

export { PageHeader } from "../ui/PageHeader";

export { SectionCard } from "../ui/SectionCard";


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
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className="relative flex min-h-[100px] w-full items-center justify-between overflow-hidden rounded-[15px] border border-[#D9D9D9] bg-white px-4 py-2"
      style={{ boxShadow: panelShadow }}
      initial={shouldReduceMotion ? false : fadeInInitial}
      animate={{ opacity: 1, scale: 1 }}
      transition={springTransition}
    >
      <div
        className={`absolute -left-3 -top-4 h-[50px] w-[50px] rounded-full blur-[18px] ${metricToneClass[tone] || metricToneClass.blue}`}
      />
      <div className="relative flex h-full min-w-0 flex-col justify-between">
        <p className="text-2xl font-medium text-[#222222]">{label}</p>
        <p className="text-xs font-medium text-[#7D7D7D]">{helper || "به نسبت گزارش"}</p>
      </div>
      <span className="relative text-4xl font-normal text-black">{value}</span>
    </motion.div>
  );
}

export function Badge({
  children,
  tone = "slate",
}: {
  children?: ReactNode;
  tone?: Tone;
}) {
  const toneClass =
    {
      slate: "bg-[#EFEFEF] text-[#011627]",
      blue: "bg-[#EAF3FC] text-[#206AB4]",
      emerald: "bg-[#E8F7EF] text-[#16803C]",
      amber: "bg-[#FFF6E6] text-[#FFB031]",
      red: "bg-[#FFE6E6] text-[#A30000]",
      rose: "bg-[#FFEAF0] text-[#C0265A]",
      purple: "bg-[#F2ECFF] text-[#6D3BC4]",
    }[tone] || "bg-[#EFEFEF] text-[#011627]";

  return (
    <span
      className={`inline-flex rounded-[10px] px-2.5 py-1 text-xs font-medium ${toneClass}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className="rounded-[10px] border border-dashed border-[#D9D9D9] bg-white px-6 py-10 text-center text-[#737373]"
      initial={shouldReduceMotion ? false : fadeInInitial}
      animate={{ opacity: 1, scale: 1 }}
      transition={springTransition}
    >
      <p className="text-sm font-semibold text-[#011627]">{title}</p>
      {description ? <p className="mt-1 text-xs">{description}</p> : null}
    </motion.div>
  );
}

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === "success") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M20 6 9 17l-5-5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 8v5m0 4h.01M10.3 4.4 2.8 17.2A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.8L13.7 4.4a2 2 0 0 0-3.4 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function showAppToast({
  tone,
  message,
  onDismiss,
}: {
  tone: ToastTone;
  title: string;
  message?: string;
  onDismiss?: () => void;
}) {
  if (!message) return;

  const toneClass = toastToneClass[tone];
  const toastId = `${tone}:${message}`;

  toast.custom(
    (toastItem) => (
      <div
        className={`flex w-fit max-w-[min(360px,calc(100vw-2rem))] items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm shadow-[0_10px_30px_rgba(15,23,42,0.14)] transition ${toastItem.visible ? "translate-y-0 scale-100 opacity-100" : "-translate-y-2 scale-95 opacity-0"
          } ${toneClass.border}`}
        dir="rtl"
      >
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${toneClass.iconBg} ${toneClass.iconText}`}>
          <ToastIcon tone={tone} />
        </div>
        <p className={`min-w-0 max-w-[270px] leading-6 ${toneClass.text}`}>
          {message}
        </p>
        <button
          type="button"
          onClick={() => {
            toast.dismiss(toastItem.id);
            onDismiss?.();
          }}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition ${toneClass.text} hover:bg-[#EFEFEF]`}
          aria-label="بستن پیام"
        >
          ×
        </button>
      </div>
    ),
    { id: toastId },
  );
}

export function ErrorAlert({
  message,
  title = "خطا",
  onDismiss,
}: {
  message?: string;
  title?: string;
  onDismiss?: () => void;
}) {
  useEffect(() => {
    showAppToast({ tone: "error", title, message, onDismiss });
  }, [message, onDismiss, title]);

  return null;
}

export function SuccessAlert({
  message,
  title = "موفقیت",
  onDismiss,
}: {
  message?: string;
  title?: string;
  onDismiss?: () => void;
}) {
  useEffect(() => {
    showAppToast({ tone: "success", title, message, onDismiss });
  }, [message, onDismiss, title]);

  return null;
}

export function LoadingState({
  message = "در حال بارگذاری...",
  className = "",
}: {
  message?: string;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={`flex md:min-h-[calc(100dvh-8rem)] w-full flex-col items-center justify-center gap-2 ${className}`.trim()}
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="relative flex h-60 w-60 items-center justify-center rounded-full"
        animate={shouldReduceMotion ? undefined : { scale: [1, 1.025, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="absolute inset-0 rounded-full border-2 border-[#EAF3FC] border-t-[#206AB4] animate-spin" />
        <div className="flex h-52 w-52 items-center justify-center rounded-full p-2">
          <img
            src="/ExirLogo.png"
            alt="Exir"
            className="h-full w-full object-contain"
          />
        </div>
      </motion.div>
      <p className="mt-5 text-xl font-semibold text-[#011627]">{message}</p>
      {/* <div className="mt-6 h-1 w-28 overflow-hidden rounded-full bg-[#EAF3FC]">
        <div className="h-full w-1/2 rounded-full bg-[#206AB4] animate-pulse" />
      </div> */}
    </motion.div>
  );
}

export function ToolbarInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-10 w-full rounded-none border-0 border-b border-[#737373] bg-transparent px-2 py-3 text-sm text-[#222222] outline-none transition placeholder:text-[#737373] focus:border-[#737373] focus:ring-0 ${props.className || ""}`.trim()}
    />
  );
}

function getSelectOptions(children: ReactNode): SelectOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child) || child.type !== "option") return [];
    const props = child.props as {
      children?: ReactNode;
      value?: string | number;
      disabled?: boolean;
    };

    return [
      {
        label: props.children,
        value:
          props.value !== undefined
            ? String(props.value)
            : String(props.children ?? ""),
        disabled: props.disabled,
      },
    ];
  });
}

function emitSelectChange(
  onChange: SelectHTMLAttributes<HTMLSelectElement>["onChange"],
  value: string,
) {
  onChange?.({
    target: { value },
    currentTarget: { value },
  } as ChangeEvent<HTMLSelectElement>);
}

function emitInputChange(
  onChange: InputHTMLAttributes<HTMLInputElement>["onChange"],
  value: string,
) {
  onChange?.({
    target: { value },
    currentTarget: { value },
  } as ChangeEvent<HTMLInputElement>);
}

function getPickerValue(value: InputHTMLAttributes<HTMLInputElement>["value"]) {
  if (!value) return null;
  const datePart = String(value).slice(0, 10);
  
  // Uses the safely resolved constructor
  return new DateObject({
    date: datePart,
    format: "YYYY-MM-DD",
    calendar: gregorian,
    locale: gregorian_en,
  }).convert(persian, persian_fa);
}

function toGregorianDateValue(date: ChangedValue) {
  if (!date || Array.isArray(date)) return "";
  return date.convert(gregorian, gregorian_en).format("YYYY-MM-DD");
}

function CustomSelect({
  variant = "field",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { variant?: "field" | "toolbar" }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const options = useMemo(() => getSelectOptions(props.children), [props.children]);
  const selectedValue = String(props.value ?? props.defaultValue ?? "");
  const selectedOption = options.find((option) => option.value === selectedValue);

  const updateMenuPosition = useCallback(() => {
    if (typeof window === "undefined") return;

    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;

    const gap = 4;
    const viewportPadding = 8;
    const preferredMaxHeight = 224;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const placeAbove = spaceBelow < 144 && spaceAbove > spaceBelow;
    const availableHeight = Math.max(
      96,
      Math.min(preferredMaxHeight, placeAbove ? spaceAbove - gap : spaceBelow - gap),
    );

    setMenuStyle({
      position: "fixed",
      top: placeAbove ? Math.max(viewportPadding, rect.top - availableHeight - gap) : rect.bottom + gap,
      left: rect.left,
      width: rect.width,
      maxHeight: availableHeight,
      zIndex: 9999,
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    updateMenuPosition();
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  if (props.multiple) {
    return (
      <select
        {...props}
        dir={props.dir || "rtl"}
        className={`fleet-control h-40 w-full rounded-xl border border-[#D9D9D9] bg-white px-[13px] py-3 text-right text-sm text-[#222222] outline-none transition focus:border-[#206AB4] focus:ring-4 focus:ring-[#EAF3FC] ${props.className || ""}`.trim()}
      />
    );
  }

  const triggerClass =
    variant === "toolbar"
      ? "h-10 rounded-[10px] px-3 text-sm"
      : "h-14 rounded-xl px-[13px] text-sm";

  return (
    <div ref={rootRef} className={`relative w-full ${props.className || ""}`.trim()}>
      <button
        type="button"
        disabled={props.disabled}
        onClick={() => {
          if (!open) updateMenuPosition();
          setOpen((current) => !current);
        }}
        className={`fleet-control flex w-full flex-row-reverse items-center justify-between gap-2 border border-[#D9D9D9] bg-white text-right font-normal text-[#222222] outline-none transition focus:border-[#206AB4] focus:ring-4 focus:ring-[#EAF3FC] disabled:cursor-not-allowed disabled:opacity-60 ${triggerClass}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        dir="rtl"
      >
        <span className={`min-w-0 flex-1 truncate text-right ${selectedValue ? "text-[#222222]" : "text-[#BFC4D5]"}`}>
          {selectedOption?.label || options[0]?.label || "انتخاب کنید"}
        </span>
        <svg
          className={`h-5 w-5 shrink-0 text-[#7D7D7D] transition ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m6 9 6 6 6-6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && typeof document !== "undefined" ? createPortal(
        <motion.div
          ref={menuRef}
          className="overflow-y-auto rounded-xl border border-[#D9D9D9] bg-white p-1 text-right shadow-lg"
          role="listbox"
          style={menuStyle}
          dir="rtl"
          initial={shouldReduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={springTransition}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={option.disabled}
              onClick={() => {
                emitSelectChange(props.onChange, option.value);
                setOpen(false);
              }}
              className={`flex min-h-9 w-full items-center justify-start rounded-lg px-3 text-right text-sm transition hover:bg-[#EAF3FC] hover:text-[#206AB4] disabled:cursor-not-allowed disabled:opacity-50 ${selectedValue === option.value
                ? "bg-[#EAF3FC] font-bold text-[#206AB4]"
                : "text-[#222222]"
                }`}
              role="option"
              aria-selected={selectedValue === option.value}
            >
              {option.label}
            </button>
          ))}
        </motion.div>,
        document.body,
      ) : null}
    </div>
  );
}

export function ToolbarSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <CustomSelect {...props} variant="toolbar" />;
}

export function Field({ label, error, children, hint }: FieldProps) {
  return (
    <label className="fleet-field flex min-w-0 flex-col gap-2 text-right" dir="rtl">
      <span className="block min-h-6 text-right text-sm font-semibold leading-6 text-[#606060]">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="block text-right text-xs leading-5 text-[#737373]">{hint}</span>
      ) : null}
      {error ? (
        <span className="block text-right text-xs leading-5 text-[#A30000]">{error}</span>
      ) : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const invalid = props["aria-invalid"] === true || props["aria-invalid"] === "true";

  if (props.type === "date" || props.type === "datetime-local") {
    const currentValue = String(props.value || "");
    const timePart = props.type === "datetime-local" && currentValue.includes("T")
      ? currentValue.slice(11, 16)
      : "00:00";

    return (
      <div className={`relative w-full ${props.className || ""}`.trim()}>
        {/* Render using the safely resolved DatePicker component function */}
        <DatePicker
          value={getPickerValue(props.value)}
          onChange={(date: ChangedValue) => {
            const nextDate = toGregorianDateValue(date);
            emitInputChange(
              props.onChange,
              props.type === "datetime-local" && nextDate ? `${nextDate}T${timePart}` : nextDate,
            );
          }}
          calendar={persian}
          locale={persian_fa}
          calendarPosition="bottom-right"
          fixMainPosition
          portal
          portalTarget={typeof document !== "undefined" ? document.body : undefined}
          zIndex={10000}
          format="YYYY/MM/DD"
          inputClass="fleet-control h-14 w-full rounded-xl border border-[#D9D9D9] bg-white pr-14 pl-[13px] text-right text-sm font-normal text-[#222222] outline-none transition placeholder:text-[#BFC4D5] focus:border-[#206AB4] focus:ring-4 focus:ring-[#EAF3FC]"
          placeholder={props.placeholder || "تاریخ را انتخاب کنید"}
          disabled={props.disabled}
        />
        <span className="pointer-events-none absolute right-px top-px flex h-[54px] w-11 items-center justify-center rounded-r-xl bg-[#EFEFEF] text-[#222222]">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M7 3v3m10-3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    );
  }

  return (
    <input
      {...props}
      dir={props.dir || "rtl"}
      className={`fleet-control h-14 w-full rounded-xl border bg-white px-[13px] text-right text-sm font-normal text-[#222222] outline-none transition placeholder:text-[#BFC4D5] ${
        invalid
          ? "border-[#FA5454] focus:border-[#FA5454] focus:ring-4 focus:ring-[#FFE6E6]"
          : "border-[#D9D9D9] focus:border-[#206AB4] focus:ring-4 focus:ring-[#EAF3FC]"
      } ${props.className || ""}`.trim()}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      dir={props.dir || "rtl"}
      className={`fleet-control min-h-[112px] w-full resize-y rounded-xl border border-[#D9D9D9] bg-white px-[13px] py-3 text-right text-sm font-normal leading-6 text-[#222222] outline-none transition placeholder:text-[#BFC4D5] focus:border-[#206AB4] focus:ring-4 focus:ring-[#EAF3FC] ${props.className || ""}`.trim()}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <CustomSelect {...props} variant="field" />;
}

export function PrimaryButton({
  children,
  className = "",
  ...props
}: ButtonProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.button
      {...props}
      className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[#206AB4] bg-[#206AB4] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#15558F] disabled:cursor-not-allowed disabled:opacity-60 ${className}`.trim()}
      whileHover={props.disabled || shouldReduceMotion ? undefined : { y: -1, boxShadow: "0 10px 22px rgba(32, 106, 180, 0.18)" }}
      whileTap={props.disabled || shouldReduceMotion ? undefined : { scale: 0.97 }}
      transition={springTransition}
    >
      {children}
    </motion.button>
  );
}

export function SecondaryButton({
  children,
  className = "",
  ...props
}: ButtonProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.button
      {...props}
      className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[#D9D9D9] bg-white px-3 py-2 text-sm font-semibold text-[#222222] transition hover:bg-[#EFEFEF] disabled:cursor-not-allowed disabled:opacity-60 ${className}`.trim()}
      whileHover={props.disabled || shouldReduceMotion ? undefined : { y: -1, boxShadow: "0 10px 20px rgba(15, 23, 42, 0.08)" }}
      whileTap={props.disabled || shouldReduceMotion ? undefined : { scale: 0.97 }}
      transition={springTransition}
    >
      {children}
    </motion.button>
  );
}

export function DangerButton({
  children,
  className = "",
  ...props
}: ButtonProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.button
      {...props}
      className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[#FFE6E6] bg-[#FFE6E6] px-3 py-2 text-sm font-semibold text-[#FA5454] transition hover:border-[#FA5454] disabled:cursor-not-allowed disabled:opacity-60 ${className}`.trim()}
      whileHover={props.disabled || shouldReduceMotion ? undefined : { y: -1, boxShadow: "0 10px 20px rgba(250, 84, 84, 0.13)" }}
      whileTap={props.disabled || shouldReduceMotion ? undefined : { scale: 0.97 }}
      transition={springTransition}
    >
      {children}
    </motion.button>
  );
}

function ActionIcon({ tone }: { tone: RowActionItem["tone"] }) {
  if (tone === "delete") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 7h16m-10 4v6m4-6v6M9 7l1-2h4l1 2m-9 0 1 13h10l1-13"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (tone === "blue") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5 12h14m-7-7 7 7-7 7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m14.7 5.3 4 4L9 19H5v-4L14.7 5.3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RowActionMenu({
  items,
  label = "اقدام",
}: {
  items: Array<RowActionItem | null | false | undefined>;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const [opensAbove, setOpensAbove] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const visibleItems = items.filter(Boolean) as RowActionItem[];

  const updateMenuPosition = useCallback(() => {
    if (typeof window === "undefined") return;

    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;

    const gap = 8;
    const viewportPadding = 8;
    const menuWidth = 132;
    const menuHeight = menuRef.current?.offsetHeight ?? Math.min(220, visibleItems.length * 42 + 12);
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const shouldOpenAbove = spaceBelow < menuHeight + gap && spaceAbove > spaceBelow;

    setOpensAbove(shouldOpenAbove);
    setMenuStyle({
      position: "fixed",
      top: shouldOpenAbove
        ? Math.max(viewportPadding, rect.top - menuHeight - gap)
        : Math.min(window.innerHeight - menuHeight - viewportPadding, rect.bottom + gap),
      left: Math.min(
        Math.max(viewportPadding, rect.left + rect.width / 2 - menuWidth / 2),
        Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding),
      ),
      width: menuWidth,
      zIndex: 9999,
    });
  }, [visibleItems.length]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    updateMenuPosition();
    const frame = window.requestAnimationFrame(updateMenuPosition);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  if (!visibleItems.length) return null;

  const toneClass = (tone: RowActionItem["tone"]) =>
    tone === "delete"
      ? "bg-[#FFE6E6] text-[#FA5454]"
      : tone === "blue"
        ? "bg-[#EAF3FC] text-[#206AB4]"
        : tone === "neutral"
          ? "bg-[#EFEFEF] text-[#7D7D7D]"
          : "bg-[#FFF6E6] text-[#FFB031]";

  return (
    <div ref={rootRef} className="relative flex justify-center">
      <motion.button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => {
            if (!current) updateMenuPosition();
            return !current;
          });
        }}
        className="mx-auto flex h-8 items-center justify-center gap-1 rounded-[10px] border border-[#D9D9D9] bg-white px-2 text-[#222222]"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        whileHover={shouldReduceMotion ? undefined : { y: -1 }}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
        transition={springTransition}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M19.4 13.5a7.8 7.8 0 0 0 0-3l2-1.5-2-3.5-2.4 1a8.2 8.2 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A8.2 8.2 0 0 0 7 6.5l-2.4-1-2 3.5 2 1.5a7.8 7.8 0 0 0 0 3l-2 1.5 2 3.5 2.4-1a8.2 8.2 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a8.2 8.2 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
        <svg
          className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m6 9 6 6 6-6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.button>

      {open && typeof document !== "undefined" ? createPortal(
        <motion.div
          ref={menuRef}
          className={`flex flex-col gap-1 border border-[#D9D9D9] bg-white/95 px-2 py-1 text-[#222222] shadow-lg backdrop-blur-sm ${
            opensAbove
              ? "rounded-tl-[10px] rounded-tr-[10px] rounded-bl-[10px] before:absolute before:-bottom-[7px] before:left-4 before:h-3 before:w-3 before:rotate-45 before:border-b before:border-r before:border-[#D9D9D9] before:bg-white/95"
              : "rounded-tl-[10px] rounded-bl-[10px] rounded-br-[10px] before:absolute before:-top-[7px] before:left-4 before:h-3 before:w-3 before:rotate-45 before:border-l before:border-t before:border-[#D9D9D9] before:bg-white/95"
          }`}
          role="menu"
          style={menuStyle}
          onClick={(event) => event.stopPropagation()}
          initial={shouldReduceMotion ? false : { opacity: 0, y: opensAbove ? 6 : -6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={springTransition}
        >
          {visibleItems.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onClick?.();
              }}
              className="flex items-center justify-between rounded-[10px] px-1 py-1 text-xs hover:bg-[#EFEFEF] disabled:cursor-not-allowed disabled:opacity-50"
              role="menuitem"
            >
              <span>{item.label}</span>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${toneClass(item.tone)}`}
              >
                <ActionIcon tone={item.tone} />
              </span>
            </button>
          ))}
        </motion.div>,
        document.body,
      ) : null}
    </div>
  );
}

export { DataTable, DataTableExportButton } from "../ui/DataTable";
export type { DataTableRow, DataTableColumn } from "../ui/DataTable";

export { Modal, ModalForm, ConfirmationModal } from "../ui/Modal";
export type { ModalFormProps, ConfirmationMode, ConfirmationModalProps } from "../ui/Modal";


export function AccessDenied({
  title = "دسترسی مجاز نیست.",
  description = "شما مجوز مشاهده این بخش را ندارید.",
}: {
  title?: string;
  description?: string;
} = {}) {
  return <EmptyState title={title} description={description} />;
}
