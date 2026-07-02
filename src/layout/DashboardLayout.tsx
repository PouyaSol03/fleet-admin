import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import {
  HiOutlineArrowPath,
  HiOutlineArrowRightOnRectangle,
  HiOutlineShieldExclamation,
} from "react-icons/hi2";
import { authAPI } from "../api/auth";
import { API_BASE_URL, clearAuthTokens, getAccessToken } from "../api/client";
import { notificationsAPI } from "../api/notifications";
import { DashboardAside } from "../components/dashboardlayout/DashboardAside";
import { DashboardHeader } from "../components/dashboardlayout/DashboardHeader";
import { LoadingState } from "../components/shared/UI";
import { AuthContext, type AuthUser } from "../context/AuthContext";
import { extractApiError, normalizeCollection } from "../utils/formatters";

type Notification = {
  id: number | string;
  title?: string;
  message?: string;
  isRead?: boolean;
  actorName?: string;
  createdAt?: string;
  readAt?: string;
};

type LoadNotificationsOptions = {
  silent?: boolean;
};

type NoPermissionsStateProps = {
  user: AuthUser | null;
  refreshing: boolean;
  isLoggingOut: boolean;
  onRefresh: () => void;
  onLogout: () => void;
};

const NOTIFICATION_POLL_INTERVAL_MS = 60_000;

function appendTokenParam(url: string, token: string) {
  const websocketUrl = new URL(url, window.location.origin);
  websocketUrl.searchParams.set("token", token);
  return websocketUrl.toString();
}

function realtimeNotificationsEnabled() {
  return import.meta.env.VITE_ENABLE_NOTIFICATION_WS === "true";
}

function buildWebsocketUrl(token: string | null) {
  if (!token || typeof window === "undefined" || !realtimeNotificationsEnabled()) {
    return null;
  }

  const configuredUrl = import.meta.env.VITE_NOTIFICATION_WS_URL;
  if (configuredUrl) {
    return appendTokenParam(configuredUrl, token);
  }

  const apiUrl = new URL(API_BASE_URL, window.location.origin);
  const protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";

  return `${protocol}//${apiUrl.host}/ws/notifications/?token=${encodeURIComponent(token)}`;
}

function NoPermissionsState({
  user,
  refreshing,
  isLoggingOut,
  onRefresh,
  onLogout,
}: NoPermissionsStateProps) {
  const displayName = user?.fullName || user?.userName || "کاربر";
  const accessLabel = user?.accessGroupName || user?.userTypeLabel || "بدون گروه دسترسی";

  return (
    <div className="flex min-h-0 w-full items-center justify-center px-4 py-6">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm sm:px-10 sm:py-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <HiOutlineShieldExclamation className="h-9 w-9" />
        </div>
        <h1 className="mt-6 text-2xl font-bold leading-9 text-slate-950 sm:text-3xl">
          دسترسی برای حساب شما فعال نشده است
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
          برای استفاده از سامانه، از ابرمدیر بخواهید گروه دسترسی و مجوزهای لازم
          را برای حساب شما تنظیم کند.
        </p>
        <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-600">
          <span className="font-semibold text-slate-900">{displayName}</span>
          <span className="mx-2 text-slate-300">|</span>
          <span>{accessLabel}</span>
        </div>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing || isLoggingOut}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#206AB4] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#185692] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
          >
            <HiOutlineArrowPath className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "در حال بررسی..." : "بررسی دوباره دسترسی"}</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            disabled={refreshing || isLoggingOut}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-100 hover:text-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
          >
            <HiOutlineArrowRightOnRectangle className="h-5 w-5" />
            <span>{isLoggingOut ? "در حال خروج..." : "خروج از حساب"}</span>
          </button>
        </div>
      </section>
    </div>
  );
}

export function DashboardLayout() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingProfile, setRefreshingProfile] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const canUseProtectedFeatures = Boolean(
    user?.isSuperuser || (user?.permissions?.length ?? 0) > 0,
  );

  const loadNotifications = useCallback(
    async ({ silent = false }: LoadNotificationsOptions = {}) => {
      try {
        if (!silent) setLoadingNotifications(true);
        const response = await notificationsAPI.list();
        setNotifications(normalizeCollection<Notification>(response.data));
        setNotificationError("");
      } catch (err) {
        if (!silent) {
          setNotificationError(extractApiError(err, "بارگذاری اعلان ها انجام نشد."));
        }
      } finally {
        if (!silent) setLoadingNotifications(false);
      }
    },
    [],
  );

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        setLoading(true);
        const response = await authAPI.getProfile();
        const profile = response.data as AuthUser;

        if (!mounted) return;

        if (profile?.isDriver) {
          clearAuthTokens();
          navigate("/unauthorized", { replace: true });
          return;
        }

        setUser(profile);
        setNotificationError("");
      } catch {
        if (mounted) {
          clearAuthTokens();
          navigate("/login", { replace: true });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (!canUseProtectedFeatures) return undefined;

    const timeoutId = window.setTimeout(() => loadNotifications(), 0);
    const intervalId = window.setInterval(
      () => loadNotifications({ silent: true }),
      NOTIFICATION_POLL_INTERVAL_MS,
    );

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [canUseProtectedFeatures, loadNotifications]);

  useEffect(() => {
    if (!canUseProtectedFeatures) return undefined;

    const websocketUrl = buildWebsocketUrl(getAccessToken());
    if (!websocketUrl) return undefined;

    const socket = new WebSocket(websocketUrl);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const notification = payload?.notification as Notification | undefined;
        if (!notification?.id) return;

        setNotifications((current) => [
          notification,
          ...current.filter((item) => item.id !== notification.id),
        ]);
      } catch {
        setNotificationError("داده اعلان بلادرنگ قابل خواندن نبود.");
      }
    };

    socket.onerror = () => {
      socket.close();
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [canUseProtectedFeatures]);

  async function handleMarkRead(notificationId: number | string) {
    try {
      const response = await notificationsAPI.markRead(notificationId);
      const updated = response.data as Notification;

      setNotifications((current) =>
        current.map((item) => (item.id === notificationId ? updated : item)),
      );
    } catch (err) {
      setNotificationError(extractApiError(err, "به روزرسانی اعلان انجام نشد."));
    }
  }

  async function handleMarkAllRead() {
    try {
      await notificationsAPI.markAllRead();
      const now = new Date().toISOString();

      setNotifications((current) =>
        current.map((item) =>
          item.isRead ? item : { ...item, isRead: true, readAt: now },
        ),
      );
    } catch (err) {
      setNotificationError(extractApiError(err, "خواندن همه اعلان ها انجام نشد."));
    }
  }

  async function handleRefreshProfile() {
    if (refreshingProfile || isLoggingOut) return;

    setRefreshingProfile(true);

    try {
      const response = await authAPI.getProfile();
      const profile = response.data as AuthUser;

      if (profile?.isDriver) {
        clearAuthTokens();
        navigate("/unauthorized", { replace: true });
        return;
      }

      setUser(profile);
      setNotificationError("");
    } catch {
      clearAuthTokens();
      navigate("/login", { replace: true });
    } finally {
      setRefreshingProfile(false);
    }
  }

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    const refresh = localStorage.getItem("refresh");

    try {
      if (refresh) {
        await authAPI.logout(refresh);
      }
    } catch {
      // Local logout should still complete if the refresh token is already invalid.
    } finally {
      socketRef.current?.close();
      socketRef.current = null;
      clearAuthTokens();
      setUser(null);
      setNotifications([]);
      setSidebarOpen(false);
      navigate("/login", { replace: true });
    }
  }

  const contextValue = useMemo(() => ({ user, setUser }), [user]);
  const visiblePermissions = user?.permissions || [];
  const hasNoPermissions = Boolean(user && !canUseProtectedFeatures);
  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const fullBleedMain = location.pathname === "/vehicle-map" || location.pathname === "/missions-calendar";

  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AuthContext.Provider value={contextValue}>
      <div className="min-h-screen bg-[#FAFBFC]" dir="rtl">
        <DashboardAside
          permissions={visiblePermissions}
          isOpen={sidebarOpen}
          isCollapsed={sidebarCollapsed}
          onClose={() => setSidebarOpen(false)}
          onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
          user={user}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />

        <div
          className={`flex min-h-screen flex-col bg-[#FAFBFC] transition-all duration-300 ease-in-out ${
            sidebarCollapsed ? "lg:mr-20" : "lg:mr-72"
          }`}
        >
          <DashboardHeader
            user={user}
            notifications={notifications}
            unreadCount={unreadCount}
            panelOpen={notificationPanelOpen}
            loadingNotifications={loadingNotifications}
            notificationError={notificationError}
            onToggleNotifications={() =>
              setNotificationPanelOpen((current) => !current)
            }
            onDismissNotificationError={() => setNotificationError("")}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            onToggleSidebar={() => setSidebarOpen((current) => !current)}
          />
          <main className={`flex h-[calc(100vh-5rem)] min-h-0 bg-[#FAFBFC] ${fullBleedMain ? "p-0" : "p-6"}`}>
            {loading ? (
              <div className="flex min-h-0 w-full">
                <LoadingState message="در حال آماده سازی داشبورد..." />
              </div>
            ) : hasNoPermissions ? (
              <NoPermissionsState
                user={user}
                refreshing={refreshingProfile}
                isLoggingOut={isLoggingOut}
                onRefresh={handleRefreshProfile}
                onLogout={handleLogout}
              />
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>
    </AuthContext.Provider>
  );
}
