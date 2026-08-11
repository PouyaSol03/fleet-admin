import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

const panelShadow = "2px 2px 7px 0px rgba(0, 0, 0, 0.08)";
const springTransition = {
  type: "spring" as const,
  stiffness: 420,
  damping: 30,
};
const fadeUpInitial = { opacity: 0, y: 10 };

export type SectionCardProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function SectionCard({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: SectionCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      className={`min-w-0 w-full rounded-[10px] bg-white py-4 md:p-4 ${className}`.trim()}
      style={{ boxShadow: panelShadow }}
      initial={shouldReduceMotion ? false : fadeUpInitial}
      animate={{ opacity: 1, y: 0 }}
      transition={springTransition}
    >
      {title || subtitle || actions ? (
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            {title ? (
              <h2 className="text-base font-bold text-[#222222]">{title}</h2>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap gap-2">{actions}</div>
          ) : null}
        </div>
      ) : null}
      {children}
    </motion.section>
  );
}
