

export function TrendIndicator({ value }: { value: number | string }) {
  const isPositive = Number(value) >= 0;

  return (
    <div className="flex items-center gap-2">
      <span className={`text-base font-medium ${isPositive ? "text-[#00992E]" : "text-[#A30000]"}`}>
        {Math.abs(Number(value) || 0)}%
      </span>
      <span className="text-xs font-medium text-[#222222]">به نسبت ماه قبل</span>
    </div>
  );
}

export function DriverMetricCard({ title, value, percent }: { title: string, value: number | string, percent: number | string }) {
  return (
    <div
      className="relative flex h-[100px] w-full md:max-w-[286px] items-center justify-between overflow-hidden rounded-[15px] border border-[#D9D9D9] bg-white px-4 py-2"
      style={{ boxShadow: "2px 2px 7px 0px rgba(0, 0, 0, 0.08)" }}
    >
      <div className="absolute -left-3 -top-4 h-[50px] w-[50px] rounded-full bg-[#206AB433] blur-[18px]" />
      <div className="relative flex h-full flex-col justify-between">
        <p className="text-2xl font-medium text-[#222222]">{title}</p>
        <TrendIndicator value={percent} />
      </div>
      <span className="relative text-4xl font-normal text-black">{value}</span>
    </div>
  );
}
