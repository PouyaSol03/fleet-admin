import React from "react";

export function DriverInfoPanel({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#D9D9D9] bg-[#FAFBFC] p-4">
      <div className="text-sm font-bold text-[#222222]">{title}</div>
      <div className="mt-2 text-sm leading-7 text-[#606060]">{children}</div>
    </div>
  );
}
