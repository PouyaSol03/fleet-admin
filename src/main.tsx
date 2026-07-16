import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { router } from "./app/router";
import { AppToaster } from "./components/shared/AppToaster";
import SplashScreen, { type SplashState } from "./pages/SplashTest";
import "./index.css";

const SPLASH_DURATION_MS = 3000;
const splashStartedAt = Date.now();
let splashFinished = false;

function App() {
  const isSplashTestRoute = window.location.pathname === "/splash-test";
  const [showSplash, setShowSplash] = useState(!splashFinished && !isSplashTestRoute);
  const [splashState, setSplashState] = useState<SplashState>(
    splashFinished ? "success" : "loading",
  );

  useEffect(() => {
    if (isSplashTestRoute || splashFinished) {
      setSplashState("success");
      setShowSplash(false);
      return;
    }

    const elapsed = Date.now() - splashStartedAt;
    const remaining = Math.max(0, SPLASH_DURATION_MS - elapsed);

    const timer = window.setTimeout(() => {
      splashFinished = true;
      setSplashState("success");
    }, remaining);

    return () => window.clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <SplashScreen
        state={splashState}
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
