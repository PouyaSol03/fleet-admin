import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { router } from "./app/router";
import { AppToaster } from "./components/shared/AppToaster";
import SplashScreen, { type SplashState } from "./pages/SplashTest";
import "./index.css";

const SPLASH_DURATION_MS = 3000;

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [splashState, setSplashState] = useState<SplashState>("loading");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSplashState("success");
    }, SPLASH_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <SplashScreen
        state={splashState}
        onComplete={() => setShowSplash(false)}
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
