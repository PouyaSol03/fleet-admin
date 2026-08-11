import { StrictMode, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { clearAuthTokens, getAccessToken } from "./api/client";
import { getValidatedAuthenticatedPath } from "./app/authRoutes";
import { router } from "./app/router";
import {
  clearProfileSession,
  loadCurrentProfile,
} from "./auth/profileSession";
import { AppToaster } from "./components/shared/AppToaster";
import SplashScreen, { type SplashState } from "./pages/SplashTest";
import "./index.css";

const SPLASH_DURATION_MS = 1500;
const splashStartedAt = Date.now();
let splashFinished = false;

function isUnauthorizedError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    (error as { response?: { status?: number } }).response?.status === 401
  );
}

function App() {
  const isSplashTestRoute = window.location.pathname === "/splash-test";
  const [showSplash, setShowSplash] = useState(
    !splashFinished && !isSplashTestRoute,
  );
  const [splashState, setSplashState] = useState<SplashState>(
    splashFinished ? "success" : "loading",
  );

  const bootstrapSession = useCallback(async () => {
    if (isSplashTestRoute || splashFinished) {
      setSplashState("success");
      setShowSplash(false);
      return;
    }

    setSplashState("loading");

    let targetPath = window.location.pathname;

    try {
      const token = getAccessToken();

      if (!token) {
        clearProfileSession();
        targetPath = targetPath === "/unauthorized" ? "/unauthorized" : "/login";
      } else {
        const profile = await loadCurrentProfile();

        if (profile?.isDriver) {
          clearAuthTokens();
          clearProfileSession();
        }

        targetPath = getValidatedAuthenticatedPath(
          profile,
          window.location.pathname,
        );
      }
    } catch (error) {
      if (isUnauthorizedError(error) || !getAccessToken()) {
        clearAuthTokens();
        clearProfileSession();
        targetPath = "/login";
      } else {
        setSplashState("error");
        return;
      }
    }

    const elapsed = Date.now() - splashStartedAt;
    const remaining = Math.max(0, SPLASH_DURATION_MS - elapsed);

    if (remaining > 0) {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, remaining);
      });
    }

    if (window.location.pathname !== targetPath) {
      window.history.replaceState(null, "", targetPath);
    }

    setSplashState("success");
  }, [isSplashTestRoute]);

  useEffect(() => {
    void bootstrapSession();
  }, [bootstrapSession]);

  if (showSplash) {
    return (
      <SplashScreen
        state={splashState}
        onRetry={() => {
          void bootstrapSession();
        }}
        onComplete={() => {
          splashFinished = true;
          setShowSplash(false);
        }}
      />
    );
  }

  return (
    <>
      <RouterProvider router={router} />
      <AppToaster />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
