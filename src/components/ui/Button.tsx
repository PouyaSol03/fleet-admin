import type { ReactNode } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

type ButtonProps = HTMLMotionProps<"button"> & {
  children: ReactNode;
};

export function Button({ children, className = "", ...props }: ButtonProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.button
      className={`inline-flex w-full cursor-pointer items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      whileHover={props.disabled || shouldReduceMotion ? undefined : { y: -1, boxShadow: "0 12px 24px rgba(15, 23, 42, 0.18)" }}
      whileTap={props.disabled || shouldReduceMotion ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
