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
} from "react-icons/hi2";
import type { AuthUser } from "../../context/AuthContext";
import { getProfileDetails } from "../../utils/formatters";

type MenuItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
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
  onClose?: () => void;
  user: AuthUser | null;
  onLogout: () => void;
  isLoggingOut?: boolean;
};

export function DashboardAside({
  permissions = [],
  isOpen = false,
  onClose,
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
        className={`fixed right-0 top-0 z-50 h-screen w-72 border-l border-(--fleet-border) bg-white shadow-2xl shadow-slate-900/10 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:shadow-none ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">

          <div className="w-full border-b border-(--fleet-border) bg-white relative top-0 z-10 px-6 py-5">
            
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="absolute left-4 top-5 flex h-9 w-9 items-center justify-center rounded-xl border border-(--fleet-border) bg-slate-50/50 text-slate-400 transition-all duration-200 hover:bg-red-50 hover:text-red-500 hover:border-red-100 active:scale-95 lg:hidden"
                title="بستن منو"
              >
                <HiXMark className="h-5 w-5" />
              </button>
            )}

            <div className="hidden lg:flex w-full justify-center items-center">
              <img
                src="/ExirLogo.png"
                alt="Exir Logo"
                className="h-16 w-auto object-contain select-none"
              />
            </div>

            <div className="flex lg:hidden items-center gap-3 pl-8">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#206AB4] text-sm font-bold text-white shadow-sm">
                {avatarLetter}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
                <p className="mt-0.5 text-[11px] text-slate-400 font-medium">{jalaliDate}</p>
              </div>
            </div>

          </div>

          <div className="flex lg:hidden justify-center items-center pt-4 px-6">
            <img
              src="/ExirLogo.png"
              alt="Exir Logo"
              className="h-9 w-auto opacity-40 object-contain select-none"
            />
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4 scrollbar-none">
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
                    className={({ isActive }) =>
                      `flex items-center gap-3.5 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-150 active:scale-[0.98] group ${
                        isActive
                          ? "bg-[#206AB4] text-white shadow-md shadow-[#206AB4]/10 font-semibold"
                          : "text-slate-600 hover:bg-slate-50 hover:text-[#206AB4]"
                      }`
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })
            )}
          </nav>

          <div className="shrink-0 border-t border-(--fleet-border) bg-white/95 px-4 py-4">
            <button
              type="button"
              onClick={onLogout}
              disabled={isLoggingOut}
              className="group flex w-full items-center justify-center gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition-all duration-150 hover:border-red-200 hover:bg-red-100 hover:text-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
              title="خروج از حساب کاربری"
            >
              <HiOutlineArrowRightOnRectangle className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" />
              <span>{isLoggingOut ? "در حال خروج..." : "خروج از حساب"}</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
