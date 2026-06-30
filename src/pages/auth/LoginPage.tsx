import { type FormEvent, useEffect, useState } from "react";
import { FaRegEye, FaRegEyeSlash, FaUser } from "react-icons/fa";
import { FiPhone, FiUserCheck } from "react-icons/fi";
import { RiLockPasswordLine } from "react-icons/ri";
import { useNavigate } from "react-router";
import { authAPI } from "../../api/auth";
import { ErrorAlert } from "../../components/shared/UI";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { extractApiError } from "../../utils/formatters";

type LoginForm = {
  username: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  nationalCode: string;
};

type LoginErrors = Partial<LoginForm>;

type AuthResponse = {
  access?: string;
  refresh?: string;
};

export function LoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<LoginForm>({
    username: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    nationalCode: "",
  });

  const [errors , setErrors] = useState<LoginErrors>({});
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [requiresSetup, setRequiresSetup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkBootstrapStatus() {
      try {
        const response = await authAPI.getBootstrapStatus();
        const data = response.data as { requiresSetup?: boolean };
        if (mounted) setRequiresSetup(Boolean(data?.requiresSetup));
      } catch {
        if (mounted) setRequiresSetup(false);
      } finally {
        if (mounted) setCheckingSetup(false);
      }
    }

    checkBootstrapStatus();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: LoginErrors = {};
    if (!form.username.trim()) nextErrors.username = "نام کاربری را وارد کنید.";
    if (!form.password.trim()) nextErrors.password = "رمز عبور را وارد کنید.";
    if (requiresSetup && form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = "تکرار رمز عبور با رمز اصلی یکسان نیست.";
    }
    if (requiresSetup && form.phone && !/^09\d{9}$/.test(form.phone.trim())) {
      nextErrors.phone = "شماره موبایل را به صورت 09123456789 وارد کنید.";
    }
    if (requiresSetup && form.nationalCode && !/^\d{10}$/.test(form.nationalCode.trim())) {
      nextErrors.nationalCode = "کد ملی باید ۱۰ رقم باشد.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setApiError("");
    setIsLoading(true);

    try {
      const request = requiresSetup ? authAPI.bootstrap : authAPI.login;
      const response = await request({
        username: form.username.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        nationalCode: form.nationalCode.trim(),
      });
      const data = response.data as AuthResponse;

      if (data.access) {
        localStorage.setItem("token", data.access);
        localStorage.setItem("fleet_admin_token", data.access);
      }

      if (data.refresh) {
        localStorage.setItem("refresh", data.refresh);
      }

      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      setErrors(err as LoginErrors);
      setApiError(
        extractApiError(
          err,
          requiresSetup ? "راه‌اندازی اولیه انجام نشد." : "ورود انجام نشد.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (checkingSetup) {
    return (
      <div className="w-full max-w-md rounded-3xl bg-white/80 p-8 text-center text-sm text-sky-800 shadow-sm ring-1 ring-sky-100">
        در حال بررسی وضعیت سامانه...
      </div>
    );
  }

  return (
    <div className={`w-full ${requiresSetup ? "max-w-2xl" : "max-w-md"}`} dir="rtl">
      <div className="mb-10 text-center">
        <img
          src="/ExirLogo.png"
          alt="Exir Logo"
          className="mx-auto h-34 w-auto object-contain"
        />

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-sky-950">
          {requiresSetup ? "ثبت مالک سامانه" : "ورود به پنل مدیریت"}
        </h1>

        <p className="mt-3 text-sm leading-7 text-sky-800">
          {requiresSetup
            ? "برای شروع، حساب مالک اصلی سامانه را بسازید. این فرم فقط یک بار نمایش داده می‌شود."
            : "برای دسترسی به داشبورد مدیریت ناوگان، نام کاربری و رمز عبور خود را وارد کنید."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <ErrorAlert message={apiError} />

        {requiresSetup ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="نام"
              type="text"
              placeholder="نام"
              value={form.firstName}
              error={errors.firstName}
              startIcon={<FiUserCheck size={18} />}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, firstName: event.target.value }))
              }
            />
            <Input
              label="نام خانوادگی"
              type="text"
              placeholder="نام خانوادگی"
              value={form.lastName}
              error={errors.lastName}
              startIcon={<FiUserCheck size={18} />}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, lastName: event.target.value }))
              }
            />
            <Input
              label="شماره موبایل"
              type="tel"
              inputMode="tel"
              dir="ltr"
              placeholder="09123456789"
              value={form.phone}
              error={errors.phone}
              startIcon={<FiPhone size={18} />}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, phone: event.target.value }))
              }
            />
            <Input
              label="کد ملی"
              type="text"
              inputMode="numeric"
              dir="ltr"
              maxLength={10}
              placeholder="0012345678"
              value={form.nationalCode}
              error={errors.nationalCode}
              startIcon={<FiUserCheck size={18} />}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, nationalCode: event.target.value }))
              }
            />
          </div>
        ) : null}

        <Input
          label={requiresSetup ? "نام کاربری مالک" : "نام کاربری"}
          type="text"
          dir="ltr"
          placeholder={requiresSetup ? "مثلا owner" : "نام کاربری"}
          value={form.username}
          error={errors.username}
          startIcon={<FaUser size={18} />}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, username: event.target.value }))
          }
        />

        <div className={requiresSetup ? "grid gap-4 sm:grid-cols-2" : ""}>
          <Input
            label="رمز عبور"
            type={showPassword ? "text" : "password"}
            dir="ltr"
            placeholder="رمز عبور"
            value={form.password}
            error={errors.password}
            startIcon={<RiLockPasswordLine size={22} />}
            endIcon={
              showPassword ? <FaRegEyeSlash size={18} /> : <FaRegEye size={18} />
            }
            onEndIconClick={() => setShowPassword((prev) => !prev)}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, password: event.target.value }))
            }
          />

          {requiresSetup ? (
            <Input
              label="تکرار رمز عبور"
              type={showPassword ? "text" : "password"}
              dir="ltr"
              placeholder="تکرار رمز عبور"
              value={form.confirmPassword}
              error={errors.confirmPassword}
              startIcon={<RiLockPasswordLine size={22} />}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
              }
            />
          ) : null}
        </div>

        {!requiresSetup ? (
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-sky-900">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-sky-300 bg-white text-sky-600"
              />
              مرا به خاطر بسپار
            </label>

            <button
              type="button"
              className="font-medium text-sky-700 transition hover:text-sky-900 hover:underline"
            >
              فراموشی رمز عبور؟
            </button>
          </div>
        ) : null}

        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? requiresSetup
              ? "در حال راه‌اندازی..."
              : "در حال ورود..."
            : requiresSetup
              ? "ساخت مالک و ورود"
              : "ورود"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm leading-7 text-sky-700">
        {requiresSetup
          ? "بعد از ساخت مالک، ورود عمومی بسته می‌شود و کاربران بعدی از داخل پنل ساخته می‌شوند."
          : "اطلاعات ورود از سرویس احراز هویت سامانه ناوگان بررسی می‌شود."}
      </p>
    </div>
  );
}
