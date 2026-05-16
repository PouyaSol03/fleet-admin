import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
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

function buildWebsocketUrl(token: string | null) {
  if (!token || typeof window === "undefined") return null;

  const apiUrl = new URL(API_BASE_URL, window.location.origin);
  const protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";

  return `${protocol}//${apiUrl.host}/ws/notifications/?token=${encodeURIComponent(token)}`;
}

export function DashboardLayout() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

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
    if (!user) return undefined;

    let mounted = true;

    async function loadNotifications() {
      try {
        setLoadingNotifications(true);
        const response = await notificationsAPI.list();
        if (mounted) setNotifications(normalizeCollection<Notification>(response.data));
      } catch (err) {
        if (mounted) {
          setNotificationError(extractApiError(err, "بارگذاری اعلان ها انجام نشد."));
        }
      } finally {
        if (mounted) setLoadingNotifications(false);
      }
    }

    loadNotifications();

    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

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
      setNotificationError("ارتباط بلادرنگ اعلان ها برقرار نشد.");
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [user]);

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

  const contextValue = useMemo(() => ({ user, setUser }), [user]);
  const visiblePermissions = user?.isSuperuser ? [] : user?.permissions || [];
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
          onClose={() => setSidebarOpen(false)}
          user={user}
        />

        <div className="flex min-h-screen flex-col bg-[#FAFBFC] lg:mr-72">
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
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>
    </AuthContext.Provider>
  );
}