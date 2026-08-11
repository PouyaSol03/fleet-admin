import type { ReactNode } from "react";

export type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex items-center justify-start gap-1 text-xs">
          <span className="font-bold text-[#206AB4]">خانه</span>
          <span className="font-bold text-black">/</span>
          <span className="text-black">{title}</span>
        </div>
        {description ? (
          <p className="mt-2 max-w-3xl hidden md:block text-xs leading-6 text-[#7D7D7D]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}
