

export function DriverAvatar({ name }: { name: string }) {
  const letter = String(name || "ر").trim().charAt(0) || "ر";

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EAF3FC] text-base font-bold text-[#206AB4]">
      {letter}
    </div>
  );
}
