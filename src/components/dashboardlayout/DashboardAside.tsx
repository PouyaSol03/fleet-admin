import { NavLink } from "react-router";
import {
  HiOutlineHome,
  HiOutlineUsers,
  HiOutlineKey,
  HiOutlineUserGroup,
  HiOutlineTruck,
  HiOutlineMap,
  HiOutlineGlobeAsiaAustralia,
  HiOutlineShieldCheck,
  HiOutlineWrenchScrewdriver,
  HiOutlineClipboardDocumentList,
  HiOutlineCalendarDays,
  HiOutlineChartBar,
} from "react-icons/hi2";

type MenuItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: string;
};

const menuItems: MenuItem[] = [
  {
    to: "/dashboard",
    label: "داشبورد",
    icon: HiOutlineHome,
    permission: "dashboard.view",
  },
  {
    to: "/users",
    label: "کاربران",
    icon: HiOutlineUsers,
    permission: "users.view",
  },
  {
    to: "/access-groups",
    label: "گروه دسترسی",
    icon: HiOutlineKey,
    permission: "access_groups.view",
  },
  {
    to: "/drivers",
    label: "رانندگان",
    icon: HiOutlineUserGroup,
    permission: "drivers.view",
  },
  {
    to: "/vehicles",
    label: "خودروها",
    icon: HiOutlineTruck,
    permission: "vehicles.view",
  },
  {
    to: "/tracking",
    label: "ردیابی خودروها",
    icon: HiOutlineMap,
    permission: "map.view",
  },
  {
    to: "/vehicle-map",
    label: "نقشه خودروها",
    icon: HiOutlineGlobeAsiaAustralia,
    permission: "map.view",
  },
  {
    to: "/vehicle-groups",
    label: "گروه خودرو",
    icon: HiOutlineShieldCheck,
    permission: "vehicle_groups.view",
  },
  {
    to: "/vehicle-types",
    label: "نوع خودرو",
    icon: HiOutlineWrenchScrewdriver,
    permission: "vehicle_types.view",
  },
  {
    to: "/inspections",
    label: "بازرسی ها",
    icon: HiOutlineClipboardDocumentList,
    permission: "inspections.view",
  },
  {
    to: "/missions",
    label: "ماموریت ها",
    icon: HiOutlineClipboardDocumentList,
    permission: "missions.view",
  },
  {
    to: "/missions-calendar",
    label: "تقویم ماموریت",
    icon: HiOutlineCalendarDays,
    permission: "missions.view",
  },
  {
    to: "/requests",
    label: "درخواست خودرو",
    icon: HiOutlineClipboardDocumentList,
    permission: "mission_requests.view",
  },
  {
    to: "/reports",
    label: "گزارش عملکرد",
    icon: HiOutlineChartBar,
    permission: "reports.operational.view",
  },
];

type DashboardAsideProps = {
  permissions?: string[];
};

export function DashboardAside({ permissions = [] }: DashboardAsideProps) {
  const visibleMenuItems =
    permissions.length > 0
      ? menuItems.filter((item) => permissions.includes(item.permission))
      : menuItems;

  return (
    <aside className="fixed right-0 top-0 z-40 hidden h-screen w-72 border-l border-sky-100 bg-white lg:block">
      <div className="flex h-full flex-col">
        <div className="w-full flex justify-center items-center p-5">
          <img
            src="/ExirLogo.png"
            alt="Exir Logo"
            className="mx-auto h-24 w-auto object-contain"
          />
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-5">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/dashboard"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-[#206AB4] text-white"
                      : "text-slate-600 hover:bg-sky-50 hover:text-sky-800"
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
