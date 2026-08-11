import React from 'react';

export function SummaryRow({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#EFEFEF] bg-[#FAFBFC] px-3 py-2">
      <div className="text-xs font-semibold text-[#737373]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[#222222]">{value || '-'}</div>
    </div>
  );
}
