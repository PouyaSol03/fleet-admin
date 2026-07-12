import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertCircle, RefreshCw, WifiOff } from "lucide-react";

export type SplashState = "loading" | "error" | "success";

type SplashScreenProps = {
  state?: SplashState;
  progress?: number;
  onRetry?: () => void;
  onComplete?: () => void;
};

export default function SplashScreen({
  state = "loading",
  progress,
  onRetry,
  onComplete,
}: SplashScreenProps) {
  const shouldReduceMotion = useReducedMotion();

  const [isOffline, setIsOffline] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [internalProgress, setInternalProgress] = useState(5);
  const [animationKey, setAnimationKey] = useState(0);

  /*
   * Detect internet connection.
   */
  useEffect(() => {
    const updateConnectionStatus = () => {
      setIsOffline(!navigator.onLine);
    };

    updateConnectionStatus();

    window.addEventListener("online", updateConnectionStatus);
    window.addEventListener("offline", updateConnectionStatus);

    return () => {
      window.removeEventListener("online", updateConnectionStatus);
      window.removeEventListener("offline", updateConnectionStatus);
    };
  }, []);

  /*
   * Detect mobile screen for the logo movement distance.
   */
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px)");

    const updateScreenSize = () => {
      setIsMobile(mediaQuery.matches);
    };

    updateScreenSize();
    mediaQuery.addEventListener("change", updateScreenSize);

    return () => {
      mediaQuery.removeEventListener("change", updateScreenSize);
    };
  }, []);

  /*
   * Lightweight simulated progress.
   *
   * If you provide the progress prop, this simulation is disabled.
   */
  useEffect(() => {
    if (
      progress !== undefined ||
      state !== "loading" ||
      isOffline
    ) {
      return;
    }

    setInternalProgress(5);

    const interval = window.setInterval(() => {
      setInternalProgress((currentProgress) => {
        if (currentProgress >= 92) {
          return 92;
        }

        const increase = Math.floor(Math.random() * 5) + 2;

        return Math.min(currentProgress + increase, 92);
      });
    }, 350);

    return () => {
      window.clearInterval(interval);
    };
  }, [progress, state, isOffline, animationKey]);

  /*
   * Complete splash when the application becomes ready.
   */
  useEffect(() => {
    if (state !== "success" || isOffline) {
      return;
    }

    const timer = window.setTimeout(() => {
      onComplete?.();
    }, shouldReduceMotion ? 100 : 650);

    return () => {
      window.clearTimeout(timer);
    };
  }, [state, isOffline, onComplete, shouldReduceMotion]);

  const displayedProgress =
    state === "success"
      ? 100
      : Math.min(
          Math.max(progress ?? internalProgress, 0),
          100,
        );

  const hasProblem = isOffline || state === "error";
  const logoShift = isMobile ? -125 : -220;

  const retry = () => {
    setInternalProgress(5);
    setAnimationKey((current) => current + 1);
    onRetry?.();
  };

  return (
    <main
      dir="rtl"
      className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-[#F7F9FF] px-5"
    >
      {/* Lightweight static background */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#FFFFFF_0%,#F2F5FF_100%)]" />

      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#1C39BB]/5" />

      <motion.section
        key={animationKey}
        className="relative z-10 flex w-full max-w-[760px] flex-col items-center"
        initial={
          shouldReduceMotion
            ? false
            : {
                opacity: 0,
              }
        }
        animate={{
          opacity: 1,
        }}
        transition={{
          duration: 0.25,
        }}
      >
        {/* Logo animation stage */}
        <div
          className="relative flex h-[260px] w-full items-center justify-center sm:h-[310px]"
          dir="ltr"
        >
          {/* Small logo */}
          <motion.img
            src="/ExirLogoSmall.png"
            alt=""
            aria-hidden="true"
            className="absolute z-20 h-[105px] w-auto object-contain sm:h-[135px]"
            initial={
              shouldReduceMotion
                ? {
                    opacity: 0,
                  }
                : {
                    opacity: 0,
                    scale: 0.65,
                    x: 0,
                  }
            }
            animate={
              shouldReduceMotion
                ? {
                    opacity: 0,
                  }
                : {
                    opacity: [0, 1, 1, 1, 0],
                    scale: [0.65, 1, 1.28, 1, 1],
                    x: [0, 0, 0, logoShift, logoShift],
                  }
            }
            transition={{
              duration: 2.65,
              times: [0, 0.16, 0.4, 0.68, 1],
              ease: [0.22, 1, 0.36, 1],
            }}
          />

          {/* Full logo revealed from left to right */}
          <motion.div
            className="relative w-[min(580px,88vw)] overflow-hidden"
            initial={
              shouldReduceMotion
                ? false
                : {
                    opacity: 0,
                    clipPath: "inset(0 100% 0 0)",
                  }
            }
            animate={{
              opacity: 1,
              clipPath: "inset(0 0% 0 0)",
            }}
            transition={{
              opacity: {
                duration: 0.12,
                delay: shouldReduceMotion ? 0 : 1.72,
              },
              clipPath: {
                duration: shouldReduceMotion ? 0 : 1.05,
                delay: shouldReduceMotion ? 0 : 1.72,
                ease: [0.22, 1, 0.36, 1],
              },
            }}
          >
            <img
              src="/ExirLogo.png"
              alt="Exir"
              className="block h-auto w-full object-contain"
            />
          </motion.div>
        </div>

        {/* Loading and error area */}
        <motion.div
          className="flex min-h-[135px] w-full max-w-[460px] flex-col items-center justify-start"
          initial={
            shouldReduceMotion
              ? false
              : {
                  opacity: 0,
                  y: 8,
                }
          }
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.35,
            delay: shouldReduceMotion ? 0 : 2.65,
          }}
        >
          <AnimatePresence mode="wait">
            {!hasProblem ? (
              <motion.div
                key="loading"
                className="w-full"
                initial={{
                  opacity: 0,
                  y: 5,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -5,
                }}
                transition={{
                  duration: 0.2,
                }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-600">
                    {state === "success"
                      ? "آماده ورود"
                      : "در حال آماده‌سازی..."}
                  </span>

                  <span className="text-sm font-black tabular-nums text-[#1C39BB]">
                    {Math.round(displayedProgress)}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#1C39BB]/10">
                  <div
                    className="h-full origin-left rounded-full bg-[#1C39BB]"
                    style={{
                      transform: `scaleX(${
                        displayedProgress / 100
                      })`,
                      transition:
                        "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={isOffline ? "offline" : "error"}
                className="flex flex-col items-center text-center"
                initial={{
                  opacity: 0,
                  scale: 0.96,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.96,
                }}
                transition={{
                  duration: 0.25,
                }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1C39BB]/10 text-[#1C39BB]">
                  {isOffline ? (
                    <WifiOff className="h-6 w-6" />
                  ) : (
                    <AlertCircle className="h-6 w-6" />
                  )}
                </div>

                <h2 className="text-base font-black text-slate-800">
                  {isOffline
                    ? "اتصال اینترنت خود را بررسی کنید"
                    : "مشکلی پیش آمده"}
                </h2>

                <p className="mt-2 max-w-[330px] text-xs font-medium leading-6 text-slate-500">
                  {isOffline
                    ? "پس از اتصال مجدد به اینترنت، دوباره تلاش کنید."
                    : "امکان دریافت اطلاعات وجود ندارد. لطفاً دوباره تلاش کنید."}
                </p>

                <motion.button
                  type="button"
                  onClick={retry}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1C39BB] px-5 py-2.5 text-xs font-bold text-white shadow-[0_8px_24px_rgba(28,57,187,0.2)] transition-colors hover:bg-[#172F9E] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1C39BB]/20"
                  whileTap={
                    shouldReduceMotion
                      ? undefined
                      : {
                          scale: 0.97,
                        }
                  }
                >
                  <RefreshCw className="h-4 w-4" />
                  تلاش دوباره
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.section>
    </main>
  );
}
