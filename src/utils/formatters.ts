const defaultError = "خطایی رخ داد. دوباره تلاش کنید.";

type ApiError = {
  response?: {
    data?: unknown;
  };
};

export function normalizeCollection<T = Record<string, unknown>>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { results?: unknown }).results)
  ) {
    return (payload as { results: T[] }).results;
  }

  return [];
}

export function extractApiError(error: unknown, fallback = defaultError) {
  const data = (error as ApiError)?.response?.data;
  if (!data) return fallback;

  let extracted: string | null = null;

  if (typeof data === "string") {
    extracted = data;
  } else if (typeof data === "object") {
    const record = data as Record<string, unknown>;

    if (typeof record.message === "string") {
      extracted = record.message;
    } else if (typeof record.detail === "string") {
      extracted = record.detail;
    } else {
      const firstKey = Object.keys(record)[0];
      if (firstKey) {
        const firstValue = record[firstKey];

        if (Array.isArray(firstValue) && firstValue.length) {
          extracted = String(firstValue[0]);
        } else if (typeof firstValue === "string") {
          extracted = firstValue;
        }
      }
    }
  }

  if (extracted) {
    const extractedStr = String(extracted).trim();
    const isHtml = extractedStr.startsWith('<') || extractedStr.includes('<html');
    const isTooLong = extractedStr.length > 150;
    const hasPersian = /[\u0600-\u06FF]/.test(extractedStr);
    const isDjangoError = extractedStr.includes('IntegrityError') || extractedStr.includes('Django Version') || extractedStr.includes('Python Executable') || extractedStr.includes('Traceback');

    if (!isHtml && !isTooLong && hasPersian && !isDjangoError) {
      return extractedStr;
    }
  }

  return fallback;
}

export function formatDate(value: unknown, withTime = false) {
  if (!value) return "-";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value).replaceAll("-", "/");
  }

  return new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-latn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

export function formatNumber(value: unknown) {
  return new Intl.NumberFormat("fa-IR").format(Number(value || 0));
}

export function formatCurrency(value: unknown) {
  return `${formatNumber(value)} تومان`;
}

export function toBooleanLabel(value: unknown) {
  return value ? "بله" : "خیر";
}

type AuthUserMinimal = {
  fullName?: string;
  userName?: string;
  [key: string]: unknown;
};

export function getProfileDetails(user: AuthUserMinimal | null) {
  const jalaliDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-latn", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const displayName = user?.fullName || user?.userName || "مدیر سیستم";

  const avatarLetter = displayName.trim().charAt(0) || "م";

  return {
    jalaliDate,
    displayName,
    avatarLetter,
  };
}