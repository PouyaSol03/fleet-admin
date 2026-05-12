import { Outlet } from "react-router";
import fleetLoginImage from "../assets/images/fleetLoginImage.webp";

export function AuthLayout() {
  return (
    <main
      className="min-h-screen bg-[radial-gradient(circle_at_top,#ffffff_0%,#F0F6FB_35%,#E5F1FA_70%,#DCECF7_100%)]"
      dir="rtl"
    >
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="flex items-center justify-center px-6 py-12">
          <Outlet />
        </section>

        <section className="hidden items-center justify-center bg-white px-10 py-12 lg:flex">
          <div className="max-w-lg text-center">
            <img
              src={fleetLoginImage}
              alt="Fleet management"
              width={900}
              className="mx-auto h-auto object-contain"
            />

            <h1 className="mt-8 text-3xl font-bold leading-tight text-sky-950">
              داشبورد مدیریت ناوگان
            </h1>

            <p className="mt-4 text-base leading-8 text-sky-800">
              مدیریت خودروها، رانندگان، مسیرها و گزارش‌ها در یک پنل ساده، سریع و
              کاربردی.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
