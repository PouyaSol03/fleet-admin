import { type ComponentType, useEffect, useMemo, useState } from "react";
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
import { usersAPI } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import { extractApiError, formatNumber } from "../utils/formatters";
import { AccessDenied, ErrorAlert, LoadingState, ToolbarSelect } from "../components/shared/UI";

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

type ChartPoint = {
  x: number;
  y: number;
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

function getNiceChartMax(values: number[]) {
  const maxValue = Math.max(...values.filter(Number.isFinite), 0);
  if (maxValue <= 850) return 850;

  const magnitude = 10 ** Math.floor(Math.log10(maxValue));
  return Math.ceil(maxValue / magnitude) * magnitude;
}

function buildSmoothPath(points: ChartPoint[]) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;

    const previous = points[index - 1];
    const controlDistance = (point.x - previous.x) / 2;
    return `${path} C ${previous.x + controlDistance} ${previous.y}, ${point.x - controlDistance} ${point.y}, ${point.x} ${point.y}`;
  }, "");
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

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex h-[26px] items-center gap-1 px-1.5 py-1">
      <span className="relative h-4 w-4 shrink-0" aria-hidden="true">
        <span className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 rounded-full" style={{ backgroundColor: color }} />
        <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white" style={{ borderColor: color }} />
      </span>
      <span className="text-xs font-bold text-slate-600">{label}</span>
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
      className="group relative flex min-h-[84px] w-full overflow-hidden rounded-2xl border border-white/70 bg-white/60 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.07)] backdrop-blur-sm transition duration-150 hover:border-white hover:bg-white/75 hover:shadow-[0_14px_30px_rgba(32,106,180,0.12)]"
    >
      <div className="absolute -left-8 -top-8 h-20 w-20 rounded-full bg-[#206AB4]/10 blur-lg transition duration-150 group-hover:bg-[#206AB4]/16" />
      <div className="absolute -bottom-10 right-6 h-20 w-20 rounded-full bg-sky-200/25 blur-lg" />
      <div className="relative flex w-full items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col items-start">
          <span className="text-[26px] font-black leading-8 text-slate-950">{formatNumber(item?.value)}</span>
          <span className="mt-1 rounded-full border border-white/70 bg-white/55 px-2.5 py-1 text-[11px] font-bold leading-none text-slate-600 shadow-sm backdrop-blur-sm">{unit}</span>
        </div>
        <div className="flex min-w-[88px] shrink-0 flex-col items-end justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/80 bg-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_8px_18px_rgba(32,106,180,0.12)] backdrop-blur-sm transition duration-150 group-hover:bg-white/75 [&_svg]:h-6 [&_svg]:w-6">
            <ChartDetailIcon type={config.icon} />
          </div>
          <span className={`mt-2 text-sm font-bold leading-5 text-slate-700 ${index === 3 ? "whitespace-nowrap" : ""}`}>
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
      className="group relative flex min-h-[96px] w-full items-center justify-between overflow-hidden rounded-2xl border border-white/70 bg-white/60 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.07)] backdrop-blur-sm transition duration-150 hover:border-white hover:bg-white/75 hover:shadow-[0_14px_30px_rgba(32,106,180,0.12)]"
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
      <div className="relative flex h-full min-w-0 flex-col items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-white/55 text-[#206AB4] shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_8px_18px_rgba(32,106,180,0.12)] backdrop-blur-sm transition duration-150 group-hover:bg-white/75">
          <Icon className="h-6 w-6" />
        </div>
        <p className="truncate text-lg font-bold text-slate-700">{text}</p>
      </div>
      <div className="relative flex items-center justify-center pr-3">
        <span className="text-[30px] font-black leading-none text-slate-950">{formatNumber(value)}</span>
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
      className="group relative flex min-h-[136px] w-full min-w-0 flex-col items-start justify-between overflow-visible rounded-2xl border border-white/70 bg-white/60 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.07)] backdrop-blur-sm transition duration-150 hover:z-20 hover:border-white hover:bg-white/75 hover:shadow-[0_14px_30px_rgba(32,106,180,0.12)] focus-within:z-20"
      dir="rtl"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute -left-8 -top-10 h-24 w-24 rounded-full bg-[#206AB4]/10 blur-lg transition duration-150 group-hover:bg-[#206AB4]/16" />
        <div className="absolute -bottom-12 right-8 h-24 w-24 rounded-full bg-sky-200/25 blur-lg" />
      </div>
      <div className="relative flex min-h-9 w-full items-start justify-between gap-3">
        <div className="flex min-w-0 items-center justify-start gap-2">
          <p className="min-w-0 truncate text-lg font-black text-slate-950">
            {title}
          </p>
          <TooltipHint label={String(desc || "")} />
        </div>
        <div className="h-8 w-24 shrink-0">
          <ToolbarSelect
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="[&>button]:h-8 [&>button]:cursor-pointer [&>button]:rounded-xl [&>button]:border [&>button]:border-white/70 [&>button]:bg-white/55 [&>button]:px-2 [&>button]:text-sm [&>button]:font-bold [&>button]:text-slate-700 [&>button]:shadow-sm [&>button]:backdrop-blur-sm [&>button_span]:whitespace-nowrap [&>button_svg]:h-5 [&>button_svg]:w-5"
          >
            <option value="daily">روزانه</option>
            <option value="weekly">هفتگی</option>
            <option value="month">ماهیانه</option>
            <option value="year">سالیانه</option>
          </ToolbarSelect>
        </div>
      </div>

      <div className="relative flex w-full flex-row items-center justify-between gap-4">
        <div
          className={`flex items-center justify-center gap-1 rounded-full px-2.5 py-1 ${positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}
        >
          <span className="text-sm font-black">
            {Math.abs(normalizedPercent)}%
          </span>
          {positive ? (
            <TrendingUp className="h-5 w-5" strokeWidth={2.35} aria-hidden="true" />
          ) : (
            <TrendingDown className="h-5 w-5" strokeWidth={2.35} aria-hidden="true" />
          )}
        </div>
        <span className="min-w-0 truncate text-[26px] font-black leading-8 text-slate-950">{formatNumber(price)}</span>
      </div>

      <div className="relative flex w-full items-center justify-center">
        <button
          type="button"
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-white/70 bg-white/55 px-4 py-2 text-xs font-black text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-[#206AB4] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#206AB4]/30"
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
  const displayFallbackCategories = ["Technology", "Car Brands", "Airlines", "Energy", "Technology"];
  const maxVisiblePoints = 5;
  const categories = (chart.categories?.length ? chart.categories : fallbackCategories).slice(0, maxVisiblePoints);
  const income = toNumericArray(chart.income, fallbackIncome).slice(0, maxVisiblePoints);
  const cost = toNumericArray(chart.cost, fallbackCost).slice(0, maxVisiblePoints);
  const chartMax = getNiceChartMax([...income, ...cost]);
  const ticks = Array.from({ length: 6 }, (_, index) => chartMax - (chartMax / 5) * index);
  const width = 804;
  const height = 422;
  const chartX = 8;
  const chartY = 24;
  const axisWidth = 31;
  const plotX = chartX + axisWidth;
  const plotY = chartY + 6;
  const plotWidth = 757;
  const plotHeight = 331;
  const labelY = chartY + 341;
  const count = Math.min(maxVisiblePoints, Math.max(categories.length, income.length, cost.length, 2));
  const denominator = Math.max(count - 1, 1);
  const xStep = plotWidth / denominator;

  const getLabel = (index: number) => {
    const label = categories[index];
    return label ? String(label) : displayFallbackCategories[index % displayFallbackCategories.length];
  };

  const makePoints = (values: number[]) =>
    values.slice(0, count).map((value, index) => ({
      x: plotX + xStep * index,
      y: plotY + plotHeight - (Math.min(Math.max(Number(value || 0), 0), chartMax) / chartMax) * plotHeight,
      value: Number(value || 0),
    }));

  const incomePoints = makePoints(income);
  const costPoints = makePoints(cost);

  return (
    <div className="h-full w-full rounded-2xl border border-white/70 bg-white/45 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-sm" dir="ltr">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" preserveAspectRatio="none" role="img" aria-label="نمودار درآمد و هزینه">
        <defs>
          <linearGradient id="incomeLineGradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#206AB4" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => {
          const y = plotY + plotHeight - (tick / chartMax) * plotHeight;
          return (
            <g key={tick}>
              <line x1={plotX} x2={plotX + plotWidth - 2} y1={y} y2={y} stroke="rgba(15,23,42,0.10)" strokeDasharray="5 7" />
              <text x={chartX + axisWidth - 4} y={y + 4} textAnchor="end" className="fill-slate-500 text-xs font-medium">
                {formatCompactChartValue(tick)}
              </text>
            </g>
          );
        })}

        {Array.from({ length: count }, (_, index) => {
          const x = plotX + xStep * index;
          return (
            <g key={`x-${index}`}>
              <line x1={x} x2={x} y1={plotY} y2={plotY + plotHeight} stroke="rgba(15,23,42,0.06)" />
              <text x={x} y={labelY + 15} textAnchor="middle" className="fill-slate-600 text-xs font-semibold">
                {getLabel(index)}
              </text>
            </g>
          );
        })}

        <path d={buildSmoothPath(incomePoints)} fill="none" stroke="url(#incomeLineGradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        <path d={buildSmoothPath(costPoints)} fill="none" stroke="#E05B1A" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />

        {incomePoints.map((point, index) => (
          <circle key={`income-${index}`} cx={point.x} cy={point.y} r="5.5" fill="#ffffff" stroke="#206AB4" strokeWidth="3" />
        ))}
        {costPoints.map((point, index) => (
          <circle key={`cost-${index}`} cx={point.x} cy={point.y} r="5.5" fill="#ffffff" stroke="#E05B1A" strokeWidth="3" />
        ))}

        <foreignObject x="335.5" y="388" width="133" height="26">
          <div className="flex h-[26px] items-center justify-center gap-2 rounded-full bg-white/80 shadow-[0_8px_22px_rgba(15,23,42,0.08)]" dir="rtl">
            <LegendItem color="#E05B1A" label="هزینه" />
            <LegendItem color="#206AB4" label="درآمد" />
          </div>
        </foreignObject>
      </svg>
    </div>
  );
}

function ChartWithDetails({ chart = fallbackDashboard.chart }: { chart?: DashboardChart }) {
  const [startDate, setStartDate] = useState("select");
  const [endDate, setEndDate] = useState("select");
  const details = (Array.isArray(chart?.details) ? chart.details : fallbackDashboard.chart.details ?? []).slice(0, 4);

  return (
    <div
      className="relative flex h-full w-full flex-col gap-3 overflow-visible rounded-3xl border border-white/70 bg-white/55 p-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-4 lg:gap-4"
      dir="rtl"
    >
      <div className="flex min-h-9 w-full flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-fit items-center justify-start gap-2">
          <span className="h-3 w-3 rounded-full bg-[#206AB4] shadow-[0_0_0_6px_rgba(32,106,180,0.10)]" aria-hidden="true" />
          <h2 className="text-xl font-black leading-[30px] text-slate-950">نمودار بر اساس تاریخ</h2>
          <TooltipHint label="نمودار درآمد و هزینه را در بازه انتخابی نشان می دهد." />
        </div>
        <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:gap-3 lg:w-auto lg:flex-nowrap">
          <div className="h-8 min-w-[126px] flex-1 sm:w-[132px] sm:flex-none">
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
          <div className="h-8 min-w-[126px] flex-1 sm:w-[132px] sm:flex-none">
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
        <div className="order-2 min-h-[250px] min-w-0 flex-1 overflow-x-auto pb-1 sm:min-h-[320px] lg:min-h-0 xl:order-2 xl:overflow-visible">
          <div className="h-full min-w-[620px] xl:min-w-0">
            <LineChart chart={chart} />
          </div>
        </div>
        <div className="order-1 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:order-1 xl:flex xl:w-72 xl:shrink-0 xl:grid-cols-none xl:flex-col">
          {details.map((item, index) => (
            <ChartMetricCard key={item?.key || index} item={item} index={index} />
          ))}
        </div>
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

  if (loading) return <LoadingState message="در حال بارگذاری..." />;

  return (
    <div className="relative isolate flex h-full min-h-screen w-full flex-col items-start gap-3 overflow-x-hidden overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-[#EEF4FF] p-3 sm:gap-4 sm:p-4 lg:min-h-0 lg:overflow-y-hidden" dir="rtl">
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#206AB4]/8 blur-xl" />
      <div className="pointer-events-none absolute -bottom-24 left-8 h-52 w-52 rounded-full bg-sky-200/25 blur-xl" />

      <div className="relative z-10 w-full">
        <ErrorAlert message={error} />
      </div>

      <div className="relative z-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-5">
        {topCardsConfig.map((card) => (
          <DcardInfo
            key={card.key}
            icon={card.icon}
            text={card.text}
            value={getCardValue(cards, card.sourceKey, 0)}
          />
        ))}
      </div>

      <div className="relative z-20 grid w-full grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {fuelCards.map((card, index) => (
          <FuelCard key={`${card.title}-${index}`} {...card} />
        ))}
      </div>

      <div className="relative z-10 flex min-h-[420px] w-full flex-1 items-stretch justify-center sm:min-h-[480px] lg:min-h-0">
        <ChartWithDetails chart={dashboardData.chart} />
      </div>
    </div>
  );
}
