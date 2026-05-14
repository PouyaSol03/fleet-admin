import { Toaster } from "react-hot-toast";

export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      gutter={8}
      containerStyle={{
        top: 16,
      }}
      toastOptions={{
        duration: 4500,
        style: {
          direction: "rtl",
          width: "fit-content",
          maxWidth: "min(360px, calc(100vw - 2rem))",
          borderRadius: "12px",
          background: "transparent",
          color: "inherit",
          padding: "0",
          boxShadow: "none",
          fontFamily: "inherit",
        },
      }}
    />
  );
}
