import { type FormEvent, useEffect, useState } from "react";
import { FaRegEye, FaRegEyeSlash, FaUser } from "react-icons/fa";
import { RiLockPasswordLine } from "react-icons/ri";
import { useNavigate } from "react-router";
import { authAPI } from "../../api/auth";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { extractApiError } from "../../utils/formatters";

type LoginForm = {
  username: string;
  password: string;
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
  });

  const [errors] = useState<LoginErrors>({});
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

    setIsLoading(true);
    setApiError("");

    try {
      const request = requiresSetup ? authAPI.bootstrap : authAPI.login;
      const response = await request(form);
      const data = response.data as AuthResponse;

      if (data.access) {
        localStorage.setItem("token", data.access);
        localStorage.setItem("fleet_admin_token", data.access);
      }

      if (data.refresh) {
        localStorage.setItem("refresh", data.refresh);
      }

      navigate("/dashboard", { replace: true });
    } catch (err:any) {
      setErrors(err)
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
    <div className="w-full max-w-md" dir="rtl">
      <div className="mb-10 text-center">
        <img
          src="/ExirLogo.png"
          alt="Exir Logo"
          className="mx-auto h-34 w-auto object-contain"
        />

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-sky-950">
          {requiresSetup ? "راه‌اندازی اولیه سامانه" : "ورود به پنل مدیریت"}
        </h1>

        <p className="mt-3 text-sm leading-7 text-sky-800">
          {requiresSetup
            ? "برای ساخت اولین مدیر سامانه، نام کاربری و رمز عبور را وارد کنید."
            : "برای دسترسی به داشبورد مدیریت ناوگان، نام کاربری و رمز عبور خود را وارد کنید."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {apiError ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {apiError}
          </div>
        ) : null}

        <Input
          label="نام کاربری"
          type="text"
          dir="ltr"
          placeholder="نام کاربری"
          value={form.username}
          error={errors.username}
          startIcon={<FaUser size={18} />}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, username: event.target.value }))
          }
        />

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
              ? "ساخت مدیر و ورود"
              : "ورود"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm leading-7 text-sky-700">
        اطلاعات ورود از سرویس احراز هویت سامانه ناوگان بررسی می‌شود.
      </p>
    </div>
  );
}
