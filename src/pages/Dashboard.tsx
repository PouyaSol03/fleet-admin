import { type ComponentType, useEffect, useMemo, useState } from "react";
import {
  HiOutlineCalendarDays,
  HiOutlineChartBar,
  HiOutlineInformationCircle,
  HiOutlineTruck,
  HiOutlineUserGroup,
  HiOutlineUsers,
} from "react-icons/hi2";
import { usersAPI } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import { extractApiError, formatNumber } from "../utils/formatters";
import { AccessDenied, ErrorAlert, LoadingState } from "../components/shared/UI";

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

function TrendIcon({ positive }: { positive: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
      {positive ? (
        <>
          <path d="M19 19H8C4.7 19 3.05 19 2.02 17.97C1 16.95 1 15.3 1 12V1" stroke="#00992E" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M5 15C11.5 15 15.75 11.25 15.75 5M13.5 5H15.75V7.25" stroke="#00992E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <path d="M19 19H8C4.7 19 3.05 19 2.02 17.97C1 16.95 1 15.3 1 12V1" stroke="#A30000" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M5 4C11.5 4 15.75 7.75 15.75 14M13.5 14H15.75V11.75" stroke="#A30000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
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
      className="relative flex h-[100px] w-full min-w-[220px] max-w-[326px] items-center justify-between overflow-hidden rounded-[15px] border border-[#D9D9D9] bg-white px-4 py-2"
      style={{ boxShadow: "2px 2px 7px 0px rgba(0, 0, 0, 0.08)" }}
      dir="rtl"
    >
      <div
        className="absolute left-[-12px] top-[-15px] h-[50px] w-[50px]"
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
  const normalizedPercent = Number(percent || 0);
  const positive = normalizedPercent >= 0;

  return (
    <div
      className="flex h-[134px] w-full min-w-[240px] flex-col items-start justify-center gap-4 rounded-2xl border border-[#D9D9D9] px-4 py-2"
      style={{ boxShadow: "2px 2px 7px 0px rgba(0, 0, 0, 0.08)" }}
      title={desc}
      dir="rtl"
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex w-fit items-center justify-start gap-1">
          <p className="text-xl font-bold text-black">{title}</p>
          <HiOutlineInformationCircle className="h-4 w-4 cursor-pointer text-[#222222]" />
        </div>
        <div
          className="flex min-w-[26%] items-center justify-center rounded-[10px] border border-[#D9D9D9] px-2 py-1"
          style={{
            background: "rgba(255, 255, 255, 0.60)",
            backdropFilter: "blur(2px)",
          }}
        >
          <select className="w-full border-0 bg-transparent text-black outline-none" defaultValue="month">
            <option value="month">ماهانه</option>
            <option value="year">سالانه</option>
            <option value="daily">روزانه</option>
          </select>
        </div>
      </div>

      <div className="flex w-full flex-row items-center justify-between">
        <div className="flex items-center justify-center gap-2">
          <TrendIcon positive={positive} />
          <span className={`text-xl font-bold ${positive ? "text-green-500" : "text-[#A30000]"}`}>
            {Math.abs(normalizedPercent)}%
          </span>
        </div>
        <span className="text-2xl font-bold text-black">{formatNumber(price)}</span>
      </div>

      <div className="flex w-full items-center justify-center gap-2">
        <button type="button" className="text-sm">
          نمایش چارت
        </button>
        <HiOutlineChartBar className="h-4 w-4 text-[#222222]" />
      </div>
    </div>
  );
}

function LineChart({ chart }: { chart: DashboardChart }) {
  const fallbackCategories = fallbackDashboard.chart.categories ?? [];
  const fallbackIncome = fallbackDashboard.chart.income ?? [];
  const fallbackCost = fallbackDashboard.chart.cost ?? [];
  const categories = chart.categories?.length ? chart.categories : fallbackCategories;
  const income = toNumericArray(chart.income, fallbackIncome);
  const cost = toNumericArray(chart.cost, fallbackCost);
  const maxValue = Math.max(...income, ...cost, 850);
  const ticks = [0, 170, 340, 510, 680, 850];
  const width = 760;
  const height = 332;
  const left = 56;
  const top = 14;
  const plotWidth = 700;
  const plotHeight = 270;
  const count = Math.max(categories.length, income.length, cost.length, 2);

  const makePoints = (values: number[]) =>
    values.slice(0, count).map((value, index) => ({
      x: left + (plotWidth / (count - 1)) * index,
      y: top + plotHeight - (Number(value || 0) / maxValue) * plotHeight,
    }));

  const incomePoints = makePoints(income);
  const costPoints = makePoints(cost);

  return (
    <div className="min-h-[390px] w-full bg-transparent px-2 pb-2 pt-6" dir="ltr">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[350px] min-w-[760px] w-full" role="img" aria-label="نمودار درآمد و هزینه">
        {ticks.map((tick) => {
          const y = top + plotHeight - (tick / 850) * plotHeight;
          return (
            <g key={tick}>
              <line x1={left} x2={left + plotWidth} y1={y} y2={y} stroke="#e5e7eb" strokeDasharray="4 4" />
              <text x={left - 10} y={y + 4} textAnchor="end" className="fill-[#6b7280] text-xs">
                {tick}
              </text>
            </g>
          );
        })}

        {categories.slice(0, count).map((label, index) => {
          const x = left + (plotWidth / (count - 1)) * index;
          return (
            <g key={`${label}-${index}`}>
              <text x={x} y={top + plotHeight + 28} textAnchor="middle" className="fill-[#6b7280] text-xs">
                {label}
              </text>
            </g>
          );
        })}

        <path d={buildSmoothPath(incomePoints)} fill="none" stroke="#206AB4" strokeWidth="2" />
        <path d={buildSmoothPath(costPoints)} fill="none" stroke="#9D3400" strokeWidth="2" />

        {incomePoints.map((point, index) => (
          <circle key={`income-${index}`} cx={point.x} cy={point.y} r="5" fill="#ffffff" stroke="#206AB4" strokeWidth="2" />
        ))}
        {costPoints.map((point, index) => (
          <circle key={`cost-${index}`} cx={point.x} cy={point.y} r="5" fill="#ffffff" stroke="#9D3400" strokeWidth="2" />
        ))}

        <g transform={`translate(${width / 2 - 62} ${height - 8})`}>
          <line x1="0" x2="16" y1="0" y2="0" stroke="#206AB4" strokeWidth="2" />
          <circle cx="8" cy="0" r="4" fill="#ffffff" stroke="#206AB4" />
          <text x="24" y="4" className="fill-[#222222] text-xs">
            درآمد
          </text>
          <line x1="70" x2="86" y1="0" y2="0" stroke="#9D3400" strokeWidth="2" />
          <circle cx="78" cy="0" r="4" fill="#ffffff" stroke="#9D3400" />
          <text x="94" y="4" className="fill-[#222222] text-xs">
            هزینه
          </text>
        </g>
      </svg>
    </div>
  );
}

function ChartWithDetails({ chart = fallbackDashboard.chart }: { chart?: DashboardChart }) {
  const details = Array.isArray(chart?.details) ? chart.details : fallbackDashboard.chart.details ?? [];

  return (
    <div
      className="flex w-full min-w-[70%] flex-col gap-4 rounded-[15px] border border-[#D9D9D9] px-4 py-2"
      style={{ boxShadow: "2px 2px 7px 0px rgba(0, 0, 0, 0.08)" }}
      dir="rtl"
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex min-w-fit items-center justify-start gap-2">
          <h2 className="text-lg font-bold">نمودار بر اساس تاریخ</h2>
          <HiOutlineInformationCircle className="h-4 w-4 text-[#222222]" />
        </div>
        <div className="mb-4 flex w-full items-center justify-end">
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border px-3 py-1">
              <span className="text-sm text-gray-600">انتخاب تاریخ</span>
            </div>
            <span className="text-2xl font-bold text-[#222]">تا</span>
            <div className="flex items-center rounded-lg border px-3 py-1">
              <span className="text-sm text-gray-600">انتخاب تاریخ</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-between gap-4">
        <div className="flex w-[24%] min-w-[220px] flex-col items-start justify-start gap-1">
          {details.map((item, index) => (
            <div key={item?.key || index} className="flex w-full items-center justify-between rounded-lg border bg-white p-4 shadow-md">
              <div>
                <h3 className="text-sm font-semibold">{detailLabels[String(item?.key || "")] || item?.key}</h3>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-lg font-bold">{formatNumber(item?.value)}</span>
                <span className="text-sm text-gray-500">{item?.unit}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="w-[70%] overflow-x-auto">
          <LineChart chart={chart} />
        </div>
      </div>
    </div>
  );
}

function ScrollingText({ texts, speed = 15 }: { texts: string[]; speed?: number }) {
  const scrollingText = texts.join(" | ");

  return (
    <div className="flex items-center overflow-hidden rounded-[15px] border text-black" dir="rtl">
      <p className="z-10 h-full border-l-2 bg-white p-2 py-3 text-xl">اطلاعیه ها</p>
      <div
        className="fleet-dashboard-marquee ml-4 whitespace-nowrap text-lg"
        style={{ animationDuration: `${speed}s` }}
      >
        {scrollingText} | {scrollingText}
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
    <div className="flex h-full w-full flex-col items-start justify-between gap-3" dir="rtl">
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

      <div className="w-full items-center justify-center">
        <ChartWithDetails chart={dashboardData.chart} />
      </div>

      <div className="w-full">
        <ScrollingText texts={announcements} speed={15} />
      </div>
    </div>
  );
}
