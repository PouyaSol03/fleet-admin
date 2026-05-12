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

  if (typeof data === "string") return data;

  if (typeof data === "object") {
    const record = data as Record<string, unknown>;

    if (typeof record.message === "string") return record.message;
    if (typeof record.detail === "string") return record.detail;

    const firstKey = Object.keys(record)[0];
    const firstValue = record[firstKey];

    if (Array.isArray(firstValue) && firstValue.length) {
      return String(firstValue[0]);
    }

    if (typeof firstValue === "string") return firstValue;
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
