import { useEffect } from "react";
import type { ReactNode, FormEvent } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { PrimaryButton, SecondaryButton } from "../shared/UI";

const springTransition = {
  type: "spring" as const,
  stiffness: 420,
  damping: 30,
};

export type ModalFormProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children?: ReactNode;
  cancelLabel?: string;
  submitLabel?: string;
  submitting?: boolean;
  footer?: ReactNode;
  bodyClassName?: string;
};

export function Modal({
  open,
  title,
  onClose,
  children,
  bodyClassName,
  panelClassName,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children?: ReactNode;
  bodyClassName?: string;
  panelClassName?: string;
}) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  const shouldReduceMotion = useReducedMotion();

  if (!open) return null;

  const modal = (
    <motion.div
      className="fleet-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-3 py-4 sm:px-6"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        className={`fleet-modal-panel flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#D9D9D9] bg-white shadow-2xl shadow-slate-950/20 ${panelClassName || ""}`.trim()}
        dir="rtl"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={springTransition}
      >
        <div className="fleet-modal-header flex shrink-0 items-center justify-between border-b border-[#D9D9D9] bg-white px-5 py-4 sm:px-6">
          <h3 className="min-w-0 truncate text-right text-lg font-bold text-[#011627]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#737373] transition hover:bg-[#EFEFEF] hover:text-[#011627]"
            aria-label="بستن"
          >
            ×
          </button>
        </div>
        <div
          className={
            bodyClassName
              ? `fleet-modal-body min-h-0 flex-1 ${bodyClassName}`
              : "fleet-modal-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6"
          }
        >
          {children}
        </div>
      </motion.div>
    </motion.div>
  );

  return typeof document === "undefined" ? modal : createPortal(modal, document.body);
}

export function ModalForm({
  open,
  title,
  onClose,
  onSubmit,
  children,
  cancelLabel = "انصراف",
  submitLabel = "ذخیره",
  submitting = false,
  footer,
  bodyClassName = "",
}: ModalFormProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      bodyClassName="overflow-hidden p-0"
      panelClassName="h-[92dvh]"
    >
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 ${bodyClassName}`.trim()}
        >
          {children}
        </div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-[#EFEFEF] bg-white px-5 py-4 sm:px-6">
          {footer || (
            <>
              <SecondaryButton type="button" onClick={onClose} disabled={submitting}>
                {cancelLabel}
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={submitting}>
                {submitting ? "در حال ذخیره..." : submitLabel}
              </PrimaryButton>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
}

export type ConfirmationMode = "confirm" | "delete" | "warning" | "success" | "info";

export type ConfirmationModalProps = {
  open: boolean;
  mode?: ConfirmationMode;
  message?: ReactNode;
  title?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmationModal({
  open,
  mode = "confirm",
  message,
  title,
  confirmLabel = "تایید",
  cancelLabel = "انصراف",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const shouldReduceMotion = useReducedMotion();

  if (!open) return null;

  const defaultMessage =
    {
      delete: "آیا از حذف موارد انتخاب شده اطمینان دارید؟",
      warning: "آیا از انجام این عملیات اطمینان دارید؟",
      success: "آیا این عملیات تایید شود؟",
      info: "آیا ادامه می دهید؟",
      confirm: "آیا از انجام این عملیات اطمینان دارید؟",
    }[mode] || "آیا از انجام این عملیات اطمینان دارید؟";

  const confirmClass =
    mode === "delete"
      ? "border-[#206AB4] bg-[#206AB4] text-white hover:bg-[#15558F]"
      : mode === "warning"
        ? "border-[#FFB031] bg-[#FFB031] text-white hover:bg-[#E39A20]"
        : mode === "success"
          ? "border-[#00992E] bg-[#00992E] text-white hover:bg-[#087D2B]"
          : "border-[#206AB4] bg-[#206AB4] text-white hover:bg-[#15558F]";

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-6"
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        className="relative w-full max-w-[320px] rounded-[10px] border border-[#D9D9D9] bg-white px-2 pb-4 pt-8"
        dir="rtl"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 14, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={springTransition}
      >
        <div className="absolute right-2 top-2 flex h-6 w-[304px] justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[#222222] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="بستن"
          >
            <span className="flex h-[19px] w-[19px] items-center justify-center rounded-[3px] border border-[#222222] text-base leading-none">
              ×
            </span>
          </button>
        </div>

        {title ? (
          <p className="mb-1 text-center text-sm font-medium text-[#7D7D7D]">
            {title}
          </p>
        ) : null}
        <div className="flex min-h-[60px] items-center justify-center px-1 text-center text-xl font-medium leading-[30px] text-black">
          {message || defaultMessage}
        </div>

        <div className="mt-4 flex h-10 items-center justify-center gap-4">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex h-10 w-[140px] items-center justify-center rounded-[10px] border px-3 text-base font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${confirmClass}`}
          >
            {loading ? "در حال انجام..." : confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex h-10 w-[140px] items-center justify-center rounded-[10px] border border-[#A30000] bg-white px-3 text-base font-medium text-[#A30000] transition hover:bg-[#FFF6F6] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
