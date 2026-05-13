import { type ComponentType, useEffect, useMemo, useState } from "react";
import {
  HiOutlineCalendarDays,
  HiOutlineTruck,
  HiOutlineUserGroup,
  HiOutlineUsers,
} from "react-icons/hi2";
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
  { key: "users", sourceKey: "users", text: "کاربران", icon: HiOutlineUsers },
  { key: "drivers", sourceKey: "drivers", text: "رانندگان", icon: HiOutlineUserGroup },
  { key: "vehicles", sourceKey: "vehicles", text: "وسایل نقلیه", icon: HiOutlineTruck },
  { key: "activeVehicles", sourceKey: "activeVehicles", text: "وسایل فعال", icon: HiOutlineTruck },
  { key: "inspections", sourceKey: "inspections", text: "بازرسی", icon: HiOutlineCalendarDays },
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

function InfoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 14.6667C11.6819 14.6667 14.6667 11.6819 14.6667 8C14.6667 4.3181 11.6819 1.33334 8 1.33334C4.3181 1.33334 1.33334 4.3181 1.33334 8C1.33334 11.6819 4.3181 14.6667 8 14.6667Z" stroke="#222222" strokeWidth="1.5" />
      <path d="M8 7.33334V11.3333" stroke="#222222" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8.006 5.33334H8" stroke="#222222" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function TrendIcon({ positive }: { positive: boolean }) {
  const color = positive ? "#00992E" : "#A30000";

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {positive ? (
        <>
          <path d="M21 21H10C6.7 21 5.05 21 4.02 19.97C3 18.95 3 17.3 3 14V3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M7 17C13.5 17 17.75 13.25 17.75 7M15.5 7H17.75V9.25" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <path d="M21 21H10C6.7 21 5.05 21 4.02 19.97C3 18.95 3 17.3 3 14V3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M7 6C13.5 6 17.75 9.75 17.75 16M15.5 16H17.75V13.75" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

function ChartLineIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M14 14H6.66667C4.46667 14 3.36667 14 2.68 13.3133C2 12.6333 2 11.5333 2 9.33333V2" stroke="#222222" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4.66666 10.6667C6.17333 10.6667 7.18 9.33333 8.33333 9.33333C9.48666 9.33333 10.5133 11.3333 11.6667 11.3333C12.82 11.3333 13.3333 9.33333 13.3333 9.33333" stroke="#222222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChartDetailIcon({ type }: { type: "contact" | "money" | "card" | "user" }) {
  if (type === "money") {
    return (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path d="M6 24.75C8.4 27.15 12.6 28.5 18 28.5C23.4 28.5 27.6 27.15 30 24.75" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M5.25 17.25C5.25 10.25 10.25 5.25 17.25 5.25H18.75C25.75 5.25 30.75 10.25 30.75 17.25V18.75C30.75 25.75 25.75 30.75 18.75 30.75H17.25C10.25 30.75 5.25 25.75 5.25 18.75V17.25Z" stroke="white" strokeWidth="1.8" />
        <circle cx="18" cy="18" r="3.75" stroke="white" strokeWidth="1.8" />
      </svg>
    );
  }

  if (type === "card") {
    return (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path d="M5.25 12.75H30.75" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8.25 7.5H27.75C29.4 7.5 30.75 8.85 30.75 10.5V25.5C30.75 27.15 29.4 28.5 27.75 28.5H8.25C6.6 28.5 5.25 27.15 5.25 25.5V10.5C5.25 8.85 6.6 7.5 8.25 7.5Z" stroke="white" strokeWidth="1.8" />
        <path d="M10.5 22.5H12.75M18 22.5H23.25" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "user") {
    return (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path d="M6 9.75C6 7.68 7.68 6 9.75 6H26.25C28.32 6 30 7.68 30 9.75V26.25C30 28.32 28.32 30 26.25 30H9.75C7.68 30 6 28.32 6 26.25V9.75Z" stroke="white" strokeWidth="1.8" />
        <path d="M18 18.75C20.49 18.75 22.5 16.74 22.5 14.25C22.5 11.76 20.49 9.75 18 9.75C15.51 9.75 13.5 11.76 13.5 14.25C13.5 16.74 15.51 18.75 18 18.75Z" stroke="white" strokeWidth="1.8" />
        <path d="M10.5 27C11.85 23.85 14.43 22.5 18 22.5C21.57 22.5 24.15 23.85 25.5 27" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <path d="M9.75 6H25.5C27.15 6 28.5 7.35 28.5 9V30L18 25.5L7.5 30V8.25C7.5 7.01 8.51 6 9.75 6Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M13.5 13.5H22.5M13.5 18H21" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex h-[26px] items-center gap-1 px-1 py-1">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect y="7" width="16" height="2" fill={color} />
        <circle cx="8" cy="8" r="4" fill="white" stroke={color} />
      </svg>
      <span className="text-xs font-medium text-black/70">{label}</span>
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
      className="relative flex h-20 w-full overflow-hidden rounded-[15px] border border-[#D9D9D9] bg-white px-4 py-2"
      style={{ boxShadow: "2px 2px 7px 0px rgba(0, 0, 0, 0.08)" }}
    >
      <div className="absolute -left-2.5 -top-[15px] h-[49px] w-[49px] rounded-full bg-[#CDF05F]/50" />
      <div className="flex w-full items-start justify-between">
        <div className="mt-3.5 flex min-w-0 flex-col items-start">
          <span className="text-2xl font-bold leading-9 text-[#222222]">{formatNumber(item?.value)}</span>
          <span className="text-xs font-bold leading-[18px] text-[#222222]">{unit}</span>
        </div>
        <div className="flex h-16 w-20 shrink-0 flex-col items-end justify-start">
          <ChartDetailIcon type={config.icon} />
          <span className={`mt-[-2px] text-xl font-medium leading-[30px] text-[#222222] ${index === 3 ? "whitespace-nowrap" : ""}`}>
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
      className="relative flex h-25 w-full min-w-55 max-w-81.5 items-center justify-between overflow-hidden rounded-[15px] border border-[#D9D9D9] bg-white px-4 py-2"
      style={{ boxShadow: "2px 2px 7px 0px rgba(0, 0, 0, 0.08)" }}
      dir="rtl"
    >
      <div
        className="absolute -left-3 -top-3.75 h-12.5 w-12.5"
        style={{
          background: "rgba(32, 106, 180, 0.20)",
          filter: "blur(18px)",
        }}
      />
      <div className="flex h-full flex-col items-start justify-between">
        <Icon className="h-9 w-9 text-[#222222]" />
        <p className="whitespace-nowrap text-2xl text-black">{text}</p>
      </div>
      <div className="flex items-center justify-center">
        <span className="text-4xl text-black">{formatNumber(value)}</span>
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
      className="flex h-[134px] w-full min-w-[362px] flex-col items-start justify-between rounded-[15px] border border-[#D9D9D9] bg-white px-4 py-2"
      style={{ boxShadow: "2px 2px 7px 0px rgba(0, 0, 0, 0.08)" }}
      title={desc}
      dir="rtl"
    >
      <div className="relative h-8 w-full">
        <div className="absolute right-0 top-0 flex h-[30px] max-w-[218px] items-center justify-start gap-1">
          <p className="min-w-0 truncate text-xl font-bold text-[#222222]" title={title}>
            {title}
          </p>
          <span className="shrink-0 cursor-pointer" title={desc}>
            <InfoIcon />
          </span>
        </div>
        <div className="absolute left-0 top-0 h-8 w-24">
          <ToolbarSelect
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="[&>button]:h-8 [&>button]:rounded-[10px] [&>button]:bg-white/60 [&>button]:px-2 [&>button]:text-base [&>button]:font-medium [&>button_span]:whitespace-nowrap [&>button_svg]:h-6 [&>button_svg]:w-6"
          >
            <option value="daily">روزانه</option>
            <option value="weekly">هفتگی</option>
            <option value="month">ماهیانه</option>
            <option value="year">سالیانه</option>
          </ToolbarSelect>
        </div>
      </div>

      <div className="flex h-9 w-full flex-row items-center justify-between">
        <div className="flex items-center justify-center gap-1">
          <span className={`text-base font-medium ${positive ? "text-[#00992E]" : "text-[#A30000]"}`}>
            {Math.abs(normalizedPercent)}%
          </span>
          <TrendIcon positive={positive} />
        </div>
        <span className="text-2xl font-bold text-[#222222]">{formatNumber(price)}</span>
      </div>

      <div className="flex h-[18px] w-full items-center justify-center gap-2">
        <button type="button" className="text-xs font-medium text-[#222222]">
          نمایش چارت
        </button>
        <ChartLineIcon />
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
    <div className="h-full w-full bg-transparent" dir="ltr">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none" role="img" aria-label="نمودار درآمد و هزینه">
        {ticks.map((tick) => {
          const y = plotY + plotHeight - (tick / chartMax) * plotHeight;
          return (
            <g key={tick}>
              <line x1={plotX} x2={plotX + plotWidth - 2} y1={y} y2={y} stroke="rgba(0,0,0,0.30)" />
              <text x={chartX + axisWidth - 4} y={y + 4} textAnchor="end" className="fill-black/70 text-xs">
                {formatCompactChartValue(tick)}
              </text>
            </g>
          );
        })}

        {Array.from({ length: count }, (_, index) => {
          const x = plotX + xStep * index;
          return (
            <g key={`x-${index}`}>
              <line x1={x} x2={x} y1={plotY} y2={plotY + plotHeight} stroke="rgba(0,0,0,0.16)" />
              <text x={x} y={labelY + 15} textAnchor="middle" className="fill-black/70 text-xs">
                {getLabel(index)}
              </text>
            </g>
          );
        })}

        <path d={buildSmoothPath(incomePoints)} fill="none" stroke="#206AB4" strokeWidth="2" />
        <path d={buildSmoothPath(costPoints)} fill="none" stroke="#9D3400" strokeWidth="2" />

        {incomePoints.map((point, index) => (
          <circle key={`income-${index}`} cx={point.x} cy={point.y} r="4" fill="#ffffff" stroke="#206AB4" strokeWidth="2" />
        ))}
        {costPoints.map((point, index) => (
          <circle key={`cost-${index}`} cx={point.x} cy={point.y} r="4" fill="#ffffff" stroke="#9D3400" strokeWidth="2" />
        ))}

        <foreignObject x="335.5" y="388" width="133" height="26">
          <div className="flex h-[26px] items-center gap-2" dir="rtl">
            <LegendItem color="#9D3400" label="هزینه" />
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
      className="flex h-full w-full flex-col gap-4 rounded-[15px] border border-[#D9D9D9] bg-white px-4 py-2"
      style={{ boxShadow: "2px 2px 7px 0px rgba(0, 0, 0, 0.08)" }}
      dir="rtl"
    >
      <div className="flex min-h-9 w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex h-[30px] min-w-fit items-center justify-start gap-1">
          <h2 className="text-xl font-bold leading-[30px] text-[#222222]">نمودار بر اساس تاریخ</h2>
          <span title="لورم ایپسوم متن ساختگی با تولید سادگی نامفهوم از صنعت چاپ و با استفاده از طراحان گرافیک است">
            <InfoIcon />
          </span>
        </div>
        <div className="flex h-9 w-full items-center justify-start gap-4 lg:w-[312px]">
          <div className="h-8 w-[132px]">
            <ToolbarSelect
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="[&>button]:h-8 [&>button]:rounded-[10px] [&>button]:bg-white/60 [&>button]:px-2 [&>button]:text-base [&>button]:font-medium [&>button_span]:whitespace-nowrap [&>button_svg]:h-6 [&>button_svg]:w-6"
            >
              <option value="select">انتخاب تاریخ</option>
              <option value="daily">روزانه</option>
              <option value="weekly">هفتگی</option>
              <option value="month">ماهیانه</option>
              <option value="year">سالیانه</option>
            </ToolbarSelect>
          </div>
          <span className="text-2xl font-bold leading-9 text-[#222222]">تا</span>
          <div className="h-8 w-[132px]">
            <ToolbarSelect
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="[&>button]:h-8 [&>button]:rounded-[10px] [&>button]:bg-white/60 [&>button]:px-2 [&>button]:text-base [&>button]:font-medium [&>button_span]:whitespace-nowrap [&>button_svg]:h-6 [&>button_svg]:w-6"
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

      <div className="flex w-full h-full flex-col gap-4 xl:h-105.5 xl:flex-row xl:items-center xl:justify-between">
        <div className="order-2 h-120 min-w-0 flex-1 xl:order-2">
          <LineChart chart={chart} />
        </div>
        <div className="order-1 grid w-full grid-cols-1 gap-5 sm:grid-cols-2 xl:order-1 xl:flex xl:w-66.5 xl:shrink-0 xl:grid-cols-none xl:flex-col">
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
  const marqueeItems = [...normalizedTexts, ...normalizedTexts, ...normalizedTexts];

  return (
    <div
      className="relative h-16 w-full overflow-hidden rounded-[15px] border border-[#D9D9D9] bg-white"
      dir="rtl"
    >
      <div
        className="fleet-dashboard-marquee absolute top-0 flex h-full w-max items-center whitespace-nowrap"
        style={{ animationDuration: `${speed}s` }}
      >
        {marqueeItems.map((text, index) => (
          <div key={`${text}-${index}`} className="flex h-full items-center py-2">
            <div
              className={`flex h-full items-center justify-center whitespace-nowrap px-5 text-center text-sm font-black ${
                index % 4 === 2 ? "text-[#E0C600]" : "text-[#222222]"
              }`}
            >
              {text}
            </div>
            <span className="h-full w-px shrink-0 bg-[#D9D9D9]" aria-hidden="true" />
          </div>
        ))}
      </div>
      <div className="absolute right-0 top-0 z-10 flex h-full w-[105px] items-center justify-center border-l border-[#D9D9D9] bg-white px-2.5">
        <span className="whitespace-nowrap text-xl font-medium text-[#222222]">اطلاعیه ها</span>
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
    <div className="flex h-full min-h-0 w-full flex-col items-start justify-between gap-3" dir="rtl">
      <ErrorAlert message={error} />

      <div className="flex w-full items-center justify-between gap-4 overflow-x-auto">
        {topCardsConfig.map((card) => (
          <DcardInfo
            key={card.key}
            icon={card.icon}
            text={card.text}
            value={getCardValue(cards, card.sourceKey, 0)}
          />
        ))}
      </div>

      <div className="flex w-full items-center justify-center gap-4 overflow-x-auto">
        {fuelCards.map((card, index) => (
          <FuelCard key={`${card.title}-${index}`} {...card} />
        ))}
      </div>

      <div className="w-full h-full flex-1 items-center justify-center">
        <ChartWithDetails chart={dashboardData.chart} />
      </div>

      <div className="w-full">
        <ScrollingText texts={announcements} />
      </div>
    </div>
  );
}
