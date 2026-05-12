import { HiOutlineBell } from "react-icons/hi2";
import { ErrorAlert } from "../shared/UI";
import type { AuthUser } from "../../context/AuthContext";
import { formatDate } from "../../utils/formatters";

type Notification = {
  id: number | string;
  title?: string;
  message?: string;
  isRead?: boolean;
  actorName?: string;
  createdAt?: string;
};

type DashboardHeaderProps = {
  user: AuthUser | null;
  notifications: Notification[];
  unreadCount: number;
  panelOpen: boolean;
  loadingNotifications: boolean;
  notificationError?: string;
  onToggleNotifications: () => void;
  onDismissNotificationError?: () => void;
  onMarkRead: (notificationId: number | string) => void;
  onMarkAllRead: () => void;
};

export function DashboardHeader({
  user,
  notifications,
  unreadCount,
  panelOpen,
  loadingNotifications,
  notificationError,
  onToggleNotifications,
  onDismissNotificationError,
  onMarkRead,
  onMarkAllRead,
}: DashboardHeaderProps) {
  const jalaliDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-latn", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const displayName = user?.fullName || user?.userName || "مدیر سیستم";
  const avatarLetter = displayName.trim().charAt(0) || "م";

  return (
    <header className="sticky top-0 z-30 h-20 border-b border-sky-100 bg-white/80 backdrop-blur">
      <div className="relative flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#206AB4] text-base font-bold text-white">
            {avatarLetter}
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">{displayName}</p>
            <p className="mt-1 text-xs text-slate-500">{jalaliDate}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleNotifications}
          className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-100 bg-white text-sky-800 transition hover:bg-sky-50"
          title="اعلان‌ها"
        >
          <HiOutlineBell className="h-5 w-5" />
          {unreadCount ? (
            <span className="absolute -left-2 -top-2 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-xs font-bold text-white">
              {unreadCount}
            </span>
          ) : null}
        </button>

        {notificationError ? (
          <div className="absolute right-6 top-full mt-2 w-[min(440px,calc(100vw-2rem))]">
            <ErrorAlert
              message={notificationError}
              title="مشکل در اعلان ها"
              onDismiss={onDismissNotificationError}
            />
          </div>
        ) : null}

        {panelOpen ? (
          <div className="absolute left-6 top-full mt-2 w-[min(440px,calc(100vw-2rem))] rounded-3xl bg-white p-4 shadow-xl ring-1 ring-sky-100">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-sky-950">اعلان‌ها</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {loadingNotifications
                    ? "در حال بارگذاری..."
                    : `${notifications.length} اعلان`}
                </p>
              </div>

              <button
                type="button"
                onClick={onMarkAllRead}
                disabled={!unreadCount}
                className="rounded-xl border border-sky-100 bg-white px-3 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                خواندن همه
              </button>
            </div>

            <div className="max-h-96 space-y-3 overflow-y-auto">
              {!notifications.length ? (
                <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/60 px-4 py-6 text-center text-sm text-slate-500">
                  اعلانی وجود ندارد.
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-2xl border px-4 py-3 ${
                      item.isRead
                        ? "border-sky-100 bg-white"
                        : "border-sky-200 bg-sky-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {item.title || "اعلان"}
                        </p>
                        <p className="text-sm text-slate-600">{item.message}</p>
                        <p className="text-xs text-slate-400">
                          {item.actorName ? `${item.actorName} | ` : ""}
                          {formatDate(item.createdAt, true)}
                        </p>
                      </div>

                      {!item.isRead ? (
                        <button
                          type="button"
                          onClick={() => onMarkRead(item.id)}
                          className="shrink-0 rounded-xl border border-sky-100 bg-white px-3 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-50"
                        >
                          خواندم
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
