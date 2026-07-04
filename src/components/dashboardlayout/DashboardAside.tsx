import { type ComponentType } from "react";
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
  HiOutlineArrowRightOnRectangle,
  HiXMark,
  HiChevronLeft,
  HiChevronRight,
} from "react-icons/hi2";
import type { AuthUser } from "../../context/AuthContext";
import { getProfileDetails } from "../../utils/formatters";

type MenuItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  permission: string;
};

const menuItems: MenuItem[] = [
  { to: "/dashboard", label: "داشبورد", icon: HiOutlineHome, permission: "dashboard.view" },
  { to: "/users", label: "کاربران", icon: HiOutlineUsers, permission: "users.view" },
  { to: "/access-groups", label: "گروه دسترسی", icon: HiOutlineKey, permission: "access_groups.view" },
  { to: "/drivers", label: "رانندگان", icon: HiOutlineUserGroup, permission: "drivers.view" },
  { to: "/vehicles", label: "خودروها", icon: HiOutlineTruck, permission: "vehicles.view" },
  { to: "/tracking", label: "ردیابی خودروها", icon: HiOutlineMap, permission: "map.view" },
  { to: "/vehicle-map", label: "نقشه خودروها", icon: HiOutlineGlobeAsiaAustralia, permission: "map.view" },
  { to: "/vehicle-groups", label: "گروه خودرو", icon: HiOutlineShieldCheck, permission: "vehicle_groups.view" },
  { to: "/vehicle-types", label: "نوع خودرو", icon: HiOutlineWrenchScrewdriver, permission: "vehicle_types.view" },
  { to: "/inspections", label: "بازرسی ها", icon: HiOutlineClipboardDocumentList, permission: "inspections.view" },
  { to: "/missions", label: "ماموریت ها", icon: HiOutlineClipboardDocumentList, permission: "missions.view" },
  { to: "/missions-calendar", label: "تقویم ماموریت", icon: HiOutlineCalendarDays, permission: "missions.view" },
  { to: "/requests", label: "درخواست خودرو", icon: HiOutlineClipboardDocumentList, permission: "mission_requests.view" },
  { to: "/reports", label: "گزارش عملکرد", icon: HiOutlineChartBar, permission: "reports.operational.view" },
];

type DashboardAsideProps = {
  permissions?: string[];
  isOpen?: boolean;
  isCollapsed?: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
  user: AuthUser | null;
  onLogout: () => void;
  isLoggingOut?: boolean;
};

export function DashboardAside({
  permissions = [],
  isOpen = false,
  isCollapsed = false,
  onClose,
  onToggleCollapse,
  user,
  onLogout,
  isLoggingOut = false,
}: DashboardAsideProps) {
  const visibleMenuItems = user?.isSuperuser
    ? menuItems
    : menuItems.filter((item) => permissions.includes(item.permission));

  const { displayName, avatarLetter, jalaliDate } = getProfileDetails(user);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed right-0 top-0 z-50 h-screen w-72 border-l border-(--fleet-border) bg-white shadow-2xl shadow-slate-900/10 transition-all duration-300 ease-in-out lg:translate-x-0 lg:shadow-none ${
          isCollapsed ? "lg:w-20" : "lg:w-72"
        } ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex h-full flex-col">
          <div className="relative top-0 z-10 w-full border-b border-(--fleet-border) bg-white py-2">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="absolute -left-3 top-5 hidden h-7 w-7 items-center justify-center rounded-full border border-(--fleet-border) bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-[#206AB4] lg:flex"
              title={isCollapsed ? "باز کردن منو" : "کوچک کردن منو"}
              aria-label={isCollapsed ? "باز کردن منو" : "کوچک کردن منو"}
            >
              {isCollapsed ? <HiChevronLeft className="h-4 w-4" /> : <HiChevronRight className="h-4 w-4" />}
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="absolute left-4 top-5 flex h-9 w-9 items-center justify-center rounded-xl border border-(--fleet-border) bg-slate-50/50 text-slate-400 transition-all duration-200 hover:border-red-100 hover:bg-red-50 hover:text-red-500 active:scale-95 lg:hidden"
                title="بستن منو"
              >
                <HiXMark className="h-5 w-5" />
              </button>
            )}

            <div className="hidden w-full items-center justify-center lg:flex">
              <img
                src={isCollapsed ? 'ExirLogoSmall.png' : 'ExirLogo.png'}
                alt="Exir Logo"
                className={`h-16 w-auto object-contain select-none transition-all duration-300`}
              />
            </div>

            <div className="flex items-center gap-3 pl-8 lg:hidden">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#206AB4] text-sm font-bold text-white shadow-sm">
                {avatarLetter}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">{jalaliDate}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center px-6 pt-4 lg:hidden">
            <img
              src="/ExirLogo.png"
              alt="Exir Logo"
              className="h-9 w-auto object-contain opacity-40 select-none"
            />
          </div>

          <nav className={`flex-1 space-y-1 overflow-y-auto py-4 scrollbar-none ${isCollapsed ? "lg:px-3" : "px-4"}`}>
            {visibleMenuItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs leading-6 text-slate-500">
                هنوز دسترسی فعالی برای نمایش منو وجود ندارد.
              </div>
            ) : (
              visibleMenuItems.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/dashboard"}
                    onClick={onClose}
                    title={item.label}
                    className={({ isActive }) =>
                      `group flex items-center rounded-lg py-3 text-sm font-medium transition-all duration-150 active:scale-[0.98] ${
                        isCollapsed ? "lg:justify-center lg:px-0" : "gap-3.5 px-4"
                      } ${
                        isActive
                          ? "bg-[#206AB4] font-semibold text-white shadow-md shadow-[#206AB4]/10"
                          : "text-slate-600 hover:bg-slate-50 hover:text-[#206AB4]"
                      }`
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105" />
                    <span className={isCollapsed ? "lg:hidden" : ""}>{item.label}</span>
                  </NavLink>
                );
              })
            )}
          </nav>

          <div className={`shrink-0 border-t border-(--fleet-border) bg-white/95 py-4 ${isCollapsed ? "lg:px-3" : "px-4"}`}>
            <button
              type="button"
              onClick={onLogout}
              disabled={isLoggingOut}
              className={`group flex w-full items-center justify-center gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition-all duration-150 hover:border-red-200 hover:bg-red-100 hover:text-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 ${
                isCollapsed ? "lg:px-0" : ""
              }`}
              title="خروج از حساب کاربری"
            >
              <HiOutlineArrowRightOnRectangle className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" />
              <span className={isCollapsed ? "lg:hidden" : ""}>
                {isLoggingOut ? "در حال خروج..." : "خروج از حساب"}
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
