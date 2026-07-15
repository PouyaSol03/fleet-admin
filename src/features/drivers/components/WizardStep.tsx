

export function WizardStep({ step, current, title }: { step: number, current: number, title: string }) {
  const active = step === current;
  const done = step < current;

  return (
    <div className={`flex min-w-0 items-center gap-3 rounded-xl border px-4 py-3 ${active ? "border-[#206AB4] bg-[#EAF3FC]" : done ? "border-[#BFE3CA] bg-[#E8F7EF]" : "border-[#D9D9D9] bg-white"}`}>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${active ? "bg-[#206AB4] text-white" : done ? "bg-[#16803C] text-white" : "bg-[#EFEFEF] text-[#606060]"}`}>
        {step}
      </span>
      <span className="truncate text-sm font-semibold text-[#222222]">{title}</span>
    </div>
  );
}
