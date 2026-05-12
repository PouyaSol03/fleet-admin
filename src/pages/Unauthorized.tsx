// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { Link } from 'react-router';

export default function Unauthorized() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#eff6ff,#f1f5f9_60%)] p-6" dir="rtl">
      <div className="max-w-lg rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl">
        <p className="text-sm font-semibold text-slate-400">403</p>
        <h1 className="mt-3 text-3xl font-black text-slate-900">دسترسی غیرمجاز</h1>
        <p className="mt-4 text-sm leading-7 text-slate-500">
          حساب شما مجوز لازم برای این صفحه را ندارد. از منوی اصلی بخش های مجاز را باز کنید.
        </p>
        <Link to="/dashboard" className="mt-8 inline-flex rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
          بازگشت به داشبورد
        </Link>
      </div>
    </div>
  );
}
