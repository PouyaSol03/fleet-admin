import { memo, type ComponentType, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  CreditCard,
  DollarSign,
  FileText,
  Info,
  TrendingDown,
  TrendingUp,
  Truck,
  User,
  Users,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion, useReducedMotion } from "motion/react";
import { usersAPI } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import { extractApiError, formatNumber } from "../utils/formatters";
import { AccessDenied, ErrorAlert, ToolbarSelect } from "../components/shared/UI";

type IconComponent = ComponentType<{ className?: string }>;

type SummaryCard = {
  key?: string;
  label?: string;
  value?: number | string | null;
};

type FuelCardData = {
  title?: string;
  desc?: string;
  price?: number | string | null;
  percent?: number | string | null;
};

type ChartDetail = {
  key?: string;
  value?: number | string | null;
  unit?: string;
};

type DashboardChart = {
  categories?: string[];
  income?: Array<number | string | null>;
  cost?: Array<number | string | null>;
  details?: ChartDetail[];
};

type DashboardData = {
  cards?: SummaryCard[];
  fuelCards?: FuelCardData[];
  chart?: DashboardChart;
  announcements?: string[];
};

type TopCardConfig = {
  key: string;
  sourceKey: string;
  text: string;
  icon: IconComponent;
};

const topCardsConfig: TopCardConfig[] = [
  { key: "users", sourceKey: "users", text: "کاربران", icon: Users },
  { key: "drivers", sourceKey: "drivers", text: "رانندگان", icon: User },
  { key: "vehicles", sourceKey: "vehicles", text: "وسایل نقلیه", icon: Truck },
  { key: "activeVehicles", sourceKey: "activeVehicles", text: "وسایل فعال", icon: Activity },
  { key: "inspections", sourceKey: "inspections", text: "بازرسی", icon: CalendarDays },
];

const fallbackDashboard: Required<Pick<DashboardData, "cards" | "fuelCards" | "chart" | "announcements">> = {
  cards: [
    { key: "users", value: 0 },
    { key: "drivers", value: 0 },
    { key: "vehicles", value: 0 },
    { key: "activeVehicles", value: 0 },
    { key: "inspections", value: 0 },
  ],
  fuelCards: [
    { title: "مصرف سوخت", desc: "برآورد مصرف سوخت در بازه انتخابی", price: 0, percent: 0 },
    { title: "بودجه سوخت", desc: "برآورد بودجه بر اساس کارکرد خودرو", price: 0, percent: 0 },
    { title: "اثر تعمیرات", desc: "اثر هزینه توقف ناشی از تعمیرات", price: 0, percent: 0 },
    { title: "بهره وری مسیر", desc: "صرفه جویی سوخت از بهینه سازی مسیر", price: 0, percent: 0 },
  ],
  chart: {
    categories: ["", "", "", "", ""],
    income: [510, 570, 850, 660, 520],
    cost: [170, 340, 510, 340, 170],
    details: [
      { key: "reservations", value: 876, unit: "عدد" },
      { key: "income", value: 120000000, unit: "تومان" },
      { key: "cost", value: 56000000, unit: "تومان" },
      { key: "vehicleTypes", value: 24, unit: "عدد" },
    ],
  },
  announcements: ["اطلاعات داشبورد از سرور دریافت می شود"],
};

const fuelTitleMap: Record<string, string> = {
  "Fuel usage": "مصرف سوخت",
  "Fuel budget": "بودجه سوخت",
  "Fuel efficiency": "بهره وری سوخت",
  "Fuel cost": "هزینه سوخت",
  "Maintenance impact": "اثر تعمیرات",
  "Route efficiency": "بهره وری مسیر",
};

const fuelDescMap: Record<string, string> = {
  "Estimated fuel usage in selected range": "برآورد مصرف سوخت در بازه انتخابی",
  "Estimated budget by vehicle mileage": "برآورد بودجه بر اساس کارکرد خودرو",
  "Estimated fuel budget in selected range": "برآورد بودجه سوخت در بازه انتخابی",
  "Average fuel efficiency in selected range": "میانگین بهره وری سوخت در بازه انتخابی",
  "Estimated fuel cost in selected range": "هزینه تخمینی سوخت در بازه انتخابی",
  "Cost impact from maintenance-related idle time": "اثر هزینه توقف ناشی از تعمیرات",
  "Fuel savings from route optimization": "صرفه جویی سوخت از بهینه سازی مسیر",
};

const announcementMap: Record<string, string> = {
  "Fleet API connected successfully": "اتصال API ناوگان با موفقیت انجام شد",
  "Driver, vehicle, and inspection data are now live": "داده های رانندگان، خودروها و بازرسی ها فعال شد",
  "You can extend CRUD actions from current table UI":
    "می توانید عملیات ایجاد، ویرایش و حذف را از همین رابط جدول گسترش دهید",
};

const detailLabels: Record<string, string> = {
  reservations: "رزرو ها",
  income: "درآمد",
  cost: "هزینه",
  vehicleTypes: "انواع وسیله نقلیه",
};

const chartDetailConfig: Record<string, { label: string; icon: "contact" | "money" | "card" | "user" }> = {
  reservations: { label: "رزرو ها", icon: "contact" },
  income: { label: "درآمد", icon: "money" },
  cost: { label: "هزینه", icon: "card" },
  vehicleTypes: { label: "فروشندگان", icon: "user" },
};

function localizeFuelCard(fuelCard: FuelCardData | undefined): FuelCardData {
  return {
    ...fuelCard,
    title: fuelTitleMap[String(fuelCard?.title || "")] || fuelCard?.title,
    desc: fuelDescMap[String(fuelCard?.desc || "")] || fuelCard?.desc,
  };
}

function localizeAnnouncement(announcement: string) {
  return announcementMap[announcement] || announcement;
}

function getCardValue(cards: SummaryCard[] | undefined, key: string, fallbackValue = 0) {
  if (!Array.isArray(cards)) return fallbackValue;
  const matchedCard = cards.find((item) => item?.key === key);
  return matchedCard?.value ?? fallbackValue;
}

function toNumericArray(values: unknown, fallback: Array<number | string | null>): number[] {
  const normalized = Array.isArray(values)
    ? values.map((value) => Number(value || 0))
    : [];

  return normalized.length ? normalized : fallback.map((value) => Number(value || 0));
}

function formatCompactChartValue(value: number) {
  if (value >= 1_000_000_000) return `${formatNumber(Math.round((value / 1_000_000_000) * 10) / 10)}B`;
  if (value >= 1_000_000) return `${formatNumber(Math.round((value / 1_000_000) * 10) / 10)}M`;
  if (value >= 1_000) return `${formatNumber(Math.round((value / 1_000) * 10) / 10)}K`;
  return formatNumber(value);
}

function ChartDetailIcon({ type }: { type: "contact" | "money" | "card" | "user" }) {
  const Icon = type === "money" ? DollarSign : type === "card" ? CreditCard : type === "user" ? User : FileText;

  return <Icon className="h-7 w-7 text-[#206AB4]" strokeWidth={2.35} aria-hidden="true" />;
}

function TooltipHint({ label, className = "" }: { label: string; className?: string }) {
  return (
    <button
      aria-label={label}
      className={`group/tooltip relative inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-[#206AB4]/30 hover:bg-[#EEF4FF] hover:text-[#206AB4] focus:outline-none focus:ring-2 focus:ring-[#206AB4]/20 ${className}`}
      type="button"
    >
      <Info className="h-4 w-4" strokeWidth={2.35} aria-hidden="true" />
      <span
        className="pointer-events-none absolute right-1/2 top-full z-50 mt-3 w-max max-w-[260px] translate-x-1/2 translate-y-1 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-right text-xs font-bold leading-6 text-slate-700 opacity-0 shadow-[0_12px_28px_rgba(15,23,42,0.12)] transition duration-150 group-hover/tooltip:translate-y-0 group-hover/tooltip:opacity-100 group-focus/tooltip:translate-y-0 group-focus/tooltip:opacity-100"
        role="tooltip"
      >
        <span className="absolute -top-1.5 right-1/2 h-3 w-3 translate-x-1/2 rotate-45 border-l border-t border-slate-200 bg-white" />
        {label}
      </span>
    </button>
  );
}

const SkeletonBlock = memo(function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`fleet-dashboard-card fleet-dashboard-skeleton relative overflow-hidden rounded-2xl bg-white/70 ${className}`.trim()}
      aria-hidden="true"
    />
  );
});

function DashboardSkeleton() {
  return (
    <div className="fleet-dashboard-low-gpu relative isolate flex w-full flex-col items-start gap-3" dir="rtl" aria-label="در حال بارگذاری داشبورد">
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#206AB4]/8 blur-xl" />
      <div className="pointer-events-none absolute -bottom-24 left-8 h-52 w-52 rounded-full bg-sky-200/20 blur-xl" />

      <SkeletonBlock className="relative z-10 h-11 w-full sm:h-16" />

      <div className="relative z-10 grid w-full grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3">
        {fallbackDashboard.fuelCards.slice(0, 3).map((card, index) => (
          <SkeletonBlock key={`${card.title}-${index}`} className="h-[108px] sm:h-[136px]" />
        ))}
      </div>

      <div className="fleet-dashboard-card relative z-10 grid min-h-[360px] w-full grid-cols-1 gap-3 rounded-2xl border border-white/70 bg-white/55 p-2.5 sm:min-h-[480px] sm:rounded-3xl sm:p-4 xl:grid-cols-[1fr_18rem] xl:gap-4">
        <div className="order-2 flex min-h-[240px] flex-col gap-3 rounded-xl border border-white/75 bg-white/55 p-2.5 sm:min-h-[280px] sm:rounded-2xl sm:p-3 xl:order-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SkeletonBlock className="h-9 w-52 max-w-full" />
            <div className="flex gap-2">
              <SkeletonBlock className="h-8 w-24" />
              <SkeletonBlock className="h-8 w-24" />
            </div>
          </div>
          <SkeletonBlock className="min-h-[220px] flex-1 sm:min-h-[250px]" />
        </div>
        <div className="order-1 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:order-2 xl:grid-cols-1">
          {(fallbackDashboard.chart.details ?? []).map((detail, index) => (
            <SkeletonBlock key={detail.key || index} className="h-[72px] sm:h-[84px]" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChartMetricCard({ item, index }: { item: ChartDetail; index: number }) {
  const config = chartDetailConfig[String(item?.key || "")] || {
    label: detailLabels[String(item?.key || "")] || String(item?.key || ""),
    icon: "contact" as const,
  };
  const unit = item?.unit || (item?.key === "income" || item?.key === "cost" ? "تومان" : "عدد");

  return (
    <div
      className="fleet-dashboard-card group relative flex min-h-[72px] w-full overflow-hidden rounded-xl border border-white/70 bg-white/60 px-3 py-2.5 transition duration-150 hover:border-white hover:bg-white/75 sm:min-h-[84px] sm:rounded-2xl sm:px-4 sm:py-3"
    >
      <div className="absolute -left-8 -top-8 h-20 w-20 rounded-full bg-[#206AB4]/10 blur-lg transition duration-150 group-hover:bg-[#206AB4]/16" />
      <div className="absolute -bottom-10 right-6 h-20 w-20 rounded-full bg-sky-200/25 blur-lg" />
      <div className="relative flex w-full items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col items-start">
          <span className="text-xl font-black leading-7 text-slate-950 sm:text-[26px] sm:leading-8">{formatNumber(item?.value)}</span>
          <span className="mt-1 rounded-full border border-white/70 bg-white/55 px-2 py-1 text-[10px] font-bold leading-none text-slate-600 shadow-sm backdrop-blur-sm sm:px-2.5 sm:text-[11px]">{unit}</span>
        </div>
        <div className="flex min-w-[68px] shrink-0 flex-col items-end justify-center sm:min-w-[88px]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/80 bg-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_8px_18px_rgba(32,106,180,0.12)] backdrop-blur-sm transition duration-150 group-hover:bg-white/75 sm:h-10 sm:w-10 sm:rounded-2xl [&_svg]:h-5 [&_svg]:w-5 sm:[&_svg]:h-6 sm:[&_svg]:w-6">
            <ChartDetailIcon type={config.icon} />
          </div>
          <span className={`mt-1.5 text-xs font-bold leading-5 text-slate-700 sm:mt-2 sm:text-sm ${index === 3 ? "whitespace-nowrap" : ""}`}>
            {config.label}
          </span>
        </div>
      </div>
    </div>
  );
}

function DcardInfo({
  icon: Icon,
  text,
  value,
}: {
  icon: IconComponent;
  text: string;
  value: SummaryCard["value"];
}) {
  return (
    <div
      className="fleet-dashboard-card group relative flex min-h-[78px] w-full items-center justify-between overflow-hidden rounded-xl border border-white/70 bg-white/60 px-3 py-2.5 transition duration-150 hover:border-white hover:bg-white/75 sm:min-h-[96px] sm:rounded-2xl sm:px-4 sm:py-3"
      dir="rtl"
    >
      <div
        className="absolute -left-10 -top-10 h-24 w-24 rounded-full transition duration-150"
        style={{
          background: "rgba(32, 106, 180, 0.10)",
          filter: "blur(16px)",
        }}
      />
      <div className="absolute -bottom-12 right-8 h-24 w-24 rounded-full bg-sky-200/25 blur-lg" />
      <div className="relative flex h-full min-w-0 flex-col items-start justify-between gap-2 sm:gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/80 bg-white/55 text-[#206AB4] shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_8px_18px_rgba(32,106,180,0.12)] backdrop-blur-sm transition duration-150 group-hover:bg-white/75 sm:h-11 sm:w-11 sm:rounded-2xl">
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <p className="truncate text-xs font-bold text-slate-700 sm:text-lg">{text}</p>
      </div>
      <div className="relative flex min-w-0 items-center justify-center pr-2 sm:pr-3">
        <span className="truncate text-[22px] font-black leading-none text-slate-950 sm:text-[30px]">{formatNumber(value)}</span>
      </div>
    </div>
  );
}

function FuelCard({
  title = "مصرف سوخت",
  desc = "متن توضیح",
  price = 9000000,
  percent = 52,
}: FuelCardData) {
  const [period, setPeriod] = useState("month");
  const normalizedPercent = Number(percent || 0);
  const positive = normalizedPercent >= 0;

  return (
    <div
      className="fleet-dashboard-card group relative flex min-h-[122px] w-full min-w-0 flex-col items-start justify-between overflow-visible rounded-xl border border-white/70 bg-white/60 px-3 py-2.5 transition duration-150 hover:z-20 hover:border-white hover:bg-white/75 focus-within:z-20 sm:min-h-[136px] sm:rounded-2xl sm:px-4 sm:py-3"
      dir="rtl"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute -left-8 -top-10 h-24 w-24 rounded-full bg-[#206AB4]/10 blur-lg transition duration-150 group-hover:bg-[#206AB4]/16" />
        <div className="absolute -bottom-12 right-8 h-24 w-24 rounded-full bg-sky-200/25 blur-lg" />
      </div>
      <div className="relative flex min-h-8 w-full items-start justify-between gap-2 sm:min-h-9 sm:gap-3">
        <div className="flex min-w-0 items-center justify-start gap-2">
          <p className="min-w-0 truncate text-sm font-black text-slate-950 sm:text-lg">
            {title}
          </p>
          <TooltipHint label={String(desc || "")} className="h-6 w-6 sm:h-7 sm:w-7 [&_svg]:h-3.5 [&_svg]:w-3.5 sm:[&_svg]:h-4 sm:[&_svg]:w-4" />
        </div>
        <div className="h-7 w-[86px] shrink-0 sm:h-8 sm:w-24">
          <ToolbarSelect
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="[&>button]:h-7 sm:[&>button]:h-8 [&>button]:cursor-pointer [&>button]:rounded-lg sm:[&>button]:rounded-xl [&>button]:border [&>button]:border-white/70 [&>button]:bg-white/55 [&>button]:px-2 [&>button]:text-xs sm:[&>button]:text-sm [&>button]:font-bold [&>button]:text-slate-700 [&>button]:shadow-sm [&>button]:backdrop-blur-sm [&>button_span]:whitespace-nowrap [&>button_svg]:h-4 [&>button_svg]:w-4 sm:[&>button_svg]:h-5 sm:[&>button_svg]:w-5"
          >
            <option value="daily">روزانه</option>
            <option value="weekly">هفتگی</option>
            <option value="month">ماهیانه</option>
            <option value="year">سالیانه</option>
          </ToolbarSelect>
        </div>
      </div>

      <div className="relative flex w-full flex-row items-center justify-between gap-3 sm:gap-4">
        <div
          className={`flex items-center justify-center gap-1 rounded-full px-2 py-1 sm:px-2.5 ${positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}
        >
          <span className="text-xs font-black sm:text-sm">
            {Math.abs(normalizedPercent)}%
          </span>
          {positive ? (
            <TrendingUp className="h-5 w-5" strokeWidth={2.35} aria-hidden="true" />
          ) : (
            <TrendingDown className="h-5 w-5" strokeWidth={2.35} aria-hidden="true" />
          )}
        </div>
        <span className="min-w-0 truncate text-xl font-black leading-7 text-slate-950 sm:text-[26px] sm:leading-8">{formatNumber(price)}</span>
      </div>

      <div className="relative flex w-full items-center justify-center">
        <button
          type="button"
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-white/70 bg-white/55 px-3 py-1.5 text-[11px] font-black text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-[#206AB4] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#206AB4]/30 sm:px-4 sm:py-2 sm:text-xs"
        >
          نمایش چارت
          <BarChart3 className="h-4 w-4" strokeWidth={2.35} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function LineChart({ chart }: { chart: DashboardChart }) {
  const fallbackCategories = fallbackDashboard.chart.categories ?? [];
  const fallbackIncome = fallbackDashboard.chart.income ?? [];
  const fallbackCost = fallbackDashboard.chart.cost ?? [];

  const categories = useMemo(
    () => (chart.categories?.length ? chart.categories : fallbackCategories),
    [chart.categories, fallbackCategories],
  );

  const income = useMemo(() => toNumericArray(chart.income, fallbackIncome), [chart.income, fallbackIncome]);
  const cost = useMemo(() => toNumericArray(chart.cost, fallbackCost), [chart.cost, fallbackCost]);

  const chartData = useMemo(() => {
    const chartLength = Math.max(categories.length, income.length, cost.length, 1);
    return Array.from({ length: chartLength }, (_, index) => ({
      category: String(categories[index] || `#${index + 1}`),
      income: Number(income[index] || 0),
      cost: Number(cost[index] || 0),
    }));
  }, [categories, cost, income]);

  const incomeTotal = useMemo(() => income.reduce((sum, value) => sum + Number(value || 0), 0), [income]);
  const costTotal = useMemo(() => cost.reduce((sum, value) => sum + Number(value || 0), 0), [cost]);
  const hasRealValue = useMemo(() => chartData.some((item) => item.income > 0 || item.cost > 0), [chartData]);
  const yDomain: [number, number | "auto"] = hasRealValue ? [0, "auto"] : [0, 10];

  const renderTooltip = useCallback(({ active, payload, label }: { active?: boolean; payload?: ReadonlyArray<{ color?: string; name?: string | number; value?: unknown }>; label?: string | number }) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="min-w-[140px] rounded-xl border border-white/80 bg-white/95 px-3 py-2 text-right shadow-[0_14px_30px_rgba(15,23,42,0.14)] backdrop-blur-md" dir="rtl">
        <div className="mb-1 text-xs font-black text-slate-500">{label}</div>
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-4 text-xs font-black text-slate-700">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              {item.name}
            </span>
            <span>{formatCompactChartValue(Number(item.value || 0))}</span>
          </div>
        ))}
      </div>
    );
  }, []);

  return (
    <div className="fleet-dashboard-card flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/75 bg-white/65 p-2.5 sm:rounded-2xl sm:p-3" dir="rtl">
      <div className="flex flex-col gap-2 border-b border-slate-100/80 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950 sm:text-base">روند درآمد و هزینه</p>
          <p className="mt-1 text-[11px] font-bold text-slate-500 sm:text-xs">
            مقایسه سریع وضعیت مالی در بازه انتخابی
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="rounded-full border border-[#206AB4]/15 bg-[#206AB4]/8 px-2.5 py-1 text-[11px] font-black text-[#206AB4] sm:px-3 sm:py-1.5 sm:text-xs">
            درآمد: {formatCompactChartValue(incomeTotal)}
          </div>
          <div className="rounded-full border border-[#E05B1A]/15 bg-[#E05B1A]/8 px-2.5 py-1 text-[11px] font-black text-[#C94D12] sm:px-3 sm:py-1.5 sm:text-xs">
            هزینه: {formatCompactChartValue(costTotal)}
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto overflow-y-hidden pt-3">
        <div className="h-[270px] min-w-[560px] sm:h-[320px] sm:min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={chartData} margin={{ top: 16, right: 12, bottom: 8, left: 4 }}>
              <CartesianGrid stroke="rgba(15,23,42,0.08)" strokeDasharray="4 10" vertical={false} />
              <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: "#475569", fontSize: 11, fontWeight: 800 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => formatCompactChartValue(Number(value || 0))} tick={{ fill: "#94A3B8", fontSize: 10, fontWeight: 800 }} width={42} domain={yDomain} />
              <RechartsTooltip content={renderTooltip} cursor={{ stroke: "#206AB4", strokeDasharray: "5 7", strokeOpacity: 0.35 }} />
              <Legend verticalAlign="bottom" align="center" iconType="circle" formatter={(value) => <span className="text-xs font-black text-slate-600">{value}</span>} />
              <Line
                type="monotone"
                dataKey="income"
                name="درآمد"
                stroke="#206AB4"
                strokeWidth={3}
                dot={{
                  r: 4,
                  fill: "#ffffff",
                  stroke: "#206AB4",
                  strokeWidth: 3,
                }}
                activeDot={{
                  r: 6,
                  fill: "#206AB4",
                  stroke: "#ffffff",
                  strokeWidth: 3,
                }}
                isAnimationActive={false}
              />

              <Line
                type="monotone"
                dataKey="cost"
                name="هزینه"
                stroke="#E05B1A"
                strokeWidth={3}
                dot={{
                  r: 4,
                  fill: "#ffffff",
                  stroke: "#E05B1A",
                  strokeWidth: 3,
                }}
                activeDot={{
                  r: 6,
                  fill: "#E05B1A",
                  stroke: "#ffffff",
                  strokeWidth: 3,
                }}
                isAnimationActive={false}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function ChartWithDetails({ chart = fallbackDashboard.chart }: { chart?: DashboardChart }) {
  const [startDate, setStartDate] = useState("select");
  const [endDate, setEndDate] = useState("select");
  const details = (Array.isArray(chart?.details) ? chart.details : fallbackDashboard.chart.details ?? []).slice(0, 4);

  return (
    <div
      className="fleet-dashboard-card relative flex h-full w-full flex-col gap-3 overflow-visible rounded-2xl border border-white/70 bg-white/55 p-2.5 sm:rounded-3xl sm:p-4 lg:gap-4"
      dir="rtl"
    >
      <div className="flex min-h-9 w-full flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-fit items-center justify-start gap-2">
          <h2 className="text-base font-black leading-7 text-slate-950 sm:text-xl sm:leading-[30px]">نمودار بر اساس تاریخ</h2>
          <TooltipHint label="نمودار درآمد و هزینه را در بازه انتخابی نشان می دهد." />
        </div>
        <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3 lg:w-auto lg:flex-none">
          <div className="h-8 min-w-0">
            <ToolbarSelect
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="[&>button]:h-8 [&>button]:cursor-pointer [&>button]:rounded-xl [&>button]:border [&>button]:border-white/70 [&>button]:bg-white/55 [&>button]:px-2 [&>button]:text-sm [&>button]:font-bold [&>button]:text-slate-700 [&>button]:shadow-sm [&>button]:backdrop-blur-sm [&>button_span]:whitespace-nowrap [&>button_svg]:h-5 [&>button_svg]:w-5"
            >
              <option value="select">انتخاب تاریخ</option>
              <option value="daily">روزانه</option>
              <option value="weekly">هفتگی</option>
              <option value="month">ماهیانه</option>
              <option value="year">سالیانه</option>
            </ToolbarSelect>
          </div>
          <span className="rounded-full border border-white/70 bg-white/55 px-3 py-1 text-sm font-black leading-6 text-slate-600 shadow-sm backdrop-blur-sm">تا</span>
          <div className="h-8 min-w-0">
            <ToolbarSelect
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="[&>button]:h-8 [&>button]:cursor-pointer [&>button]:rounded-xl [&>button]:border [&>button]:border-white/70 [&>button]:bg-white/55 [&>button]:px-2 [&>button]:text-sm [&>button]:font-bold [&>button]:text-slate-700 [&>button]:shadow-sm [&>button]:backdrop-blur-sm [&>button_span]:whitespace-nowrap [&>button_svg]:h-5 [&>button_svg]:w-5"
            >
              <option value="select">انتخاب تاریخ</option>
              <option value="daily">روزانه</option>
              <option value="weekly">هفتگی</option>
              <option value="month">ماهیانه</option>
              <option value="year">سالیانه</option>
            </ToolbarSelect>
          </div>
        </div>
      </div>

      <div className="flex h-full min-h-0 w-full flex-col gap-3 xl:flex-row xl:items-stretch xl:justify-between xl:gap-4">
        <div className="order-2 min-h-[250px] min-w-0 flex-1 overflow-hidden pb-1 sm:min-h-[320px] lg:min-h-0 xl:order-2">
          <div className="h-full min-w-0">
            <LineChart chart={chart} />
          </div>
        </div>
        <div className="order-1 grid w-full grid-cols-2 gap-2 sm:gap-4 xl:order-1 xl:flex xl:w-72 xl:shrink-0 xl:grid-cols-none xl:flex-col">
          {details.map((item, index) => (
            <ChartMetricCard key={item?.key || index} item={item} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ScrollingText({ texts, speed = 45 }: { texts: string[]; speed?: number }) {
  const normalizedTexts = texts.length ? texts : fallbackDashboard.announcements;
  const marqueeItems = useMemo(() => [...normalizedTexts, ...normalizedTexts, ...normalizedTexts], [normalizedTexts]);
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="fleet-dashboard-card relative h-11 w-full overflow-hidden rounded-xl border border-white/70 bg-white/55 sm:h-16 sm:rounded-2xl"
      dir="rtl"
    >
      <motion.div
        className="fleet-dashboard-marquee absolute left-0 top-0 flex h-full w-max items-center whitespace-nowrap"
        animate={reduceMotion ? { x: "0%" } : { x: ["0%", "-33.333%"] }}
        transition={reduceMotion ? undefined : { duration: speed, ease: "linear", repeat: Infinity }}
      >
        {marqueeItems.map((text, index) => (
          <div key={`${text}-${index}`} className="flex h-full items-center py-2">
            <div
              className={`flex h-full items-center justify-center whitespace-nowrap px-4 text-center text-xs font-black sm:px-6 sm:text-sm ${index % 4 === 2 ? "text-[#B69A00]" : "text-slate-700"
                }`}
            >
              {text}
            </div>
            <span className="h-6 w-px shrink-0 bg-slate-200 sm:h-8" aria-hidden="true" />
          </div>
        ))}
      </motion.div>
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12 bg-gradient-to-r from-white/85 to-transparent sm:w-20" />
      <div className="absolute right-0 top-0 z-10 flex h-full w-[88px] items-center justify-center border-l border-white/70 bg-white/75 px-2 shadow-[-10px_0_18px_rgba(255,255,255,0.62)] backdrop-blur-sm sm:w-[116px] sm:px-2.5">
        <span className="whitespace-nowrap text-sm font-black text-slate-900 sm:text-lg">اطلاعیه ها</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData>(fallbackDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await usersAPI.dashboardSummary();
        if (isMounted && response?.data) {
          setDashboardData((prev) => ({
            ...prev,
            ...(response.data as DashboardData),
          }));
          setError("");
        }
      } catch (err) {
        if (isMounted) {
          setDashboardData(fallbackDashboard);
          setError(extractApiError(err, "بارگذاری داشبورد انجام نشد."));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const cards = useMemo(
    () => (Array.isArray(dashboardData?.cards) ? dashboardData.cards : fallbackDashboard.cards),
    [dashboardData],
  );

  const fuelCards = useMemo(() => {
    const source = Array.isArray(dashboardData?.fuelCards) ? dashboardData.fuelCards : fallbackDashboard.fuelCards;
    return fallbackDashboard.fuelCards.map((fallback, index) => localizeFuelCard(source[index] || fallback));
  }, [dashboardData]);

  const announcements = useMemo(
    () =>
      Array.isArray(dashboardData?.announcements)
        ? dashboardData.announcements.map(localizeAnnouncement)
        : fallbackDashboard.announcements.map(localizeAnnouncement),
    [dashboardData],
  );

  if (!hasPermission(user, "dashboard.view")) {
    return <AccessDenied />;
  }

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="fleet-dashboard-low-gpu relative isolate flex w-full flex-col items-start gap-2.5 sm:gap-3" dir="rtl">
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#206AB4]/8 blur-xl" />
      <div className="pointer-events-none absolute -bottom-24 left-8 h-52 w-52 rounded-full bg-sky-200/25 blur-xl" />

      <div className="relative z-10 w-full">
        <ErrorAlert message={error} />
      </div>

      <div className="relative z-10 grid w-full grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        {topCardsConfig.map((card) => (
          <DcardInfo
            key={card.key}
            icon={card.icon}
            text={card.text}
            value={getCardValue(cards, card.sourceKey, 0)}
          />
        ))}
      </div>

      <div className="relative z-20 grid w-full grid-cols-1 gap-2.5 sm:gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {fuelCards.map((card, index) => (
          <FuelCard key={`${card.title}-${index}`} {...card} />
        ))}
      </div>

      <div className="relative z-10 flex min-h-[360px] w-full flex-1 items-stretch justify-center sm:min-h-[480px] lg:min-h-0">
        <ChartWithDetails chart={dashboardData.chart} />
      </div>
      <div className="relative z-20 w-full">
        <ScrollingText texts={announcements} />
      </div>
    </div>
  );
}
