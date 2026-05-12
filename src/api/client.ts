type RequestOptions = {
  params?: Record<string, unknown>;
  responseType?: "json" | "blob";
};

type ApiResponse<T = unknown> = {
  data: T;
  status: number;
  headers: Headers;
};

type ApiError = Error & {
  response?: {
    data: unknown;
    status: number;
  };
};

const rawApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/";

export const API_BASE_URL = rawApiBaseUrl.endsWith("/")
  ? rawApiBaseUrl
  : `${rawApiBaseUrl}/`;

export function getAccessToken() {
  return localStorage.getItem("token") || localStorage.getItem("fleet_admin_token");
}

export function clearAuthTokens() {
  localStorage.removeItem("token");
  localStorage.removeItem("refresh");
  localStorage.removeItem("fleet_admin_token");
}

function buildUrl(path: string, params?: Record<string, unknown>) {
  const url = new URL(path.replace(/^\/+/, ""), API_BASE_URL);

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

async function parseResponse(response: Response, responseType?: "json" | "blob") {
  if (responseType === "blob") {
    return response.blob();
  }

  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const token = getAccessToken();
  const response = await fetch(buildUrl(path, options.params), {
    method,
    headers: {
      Accept: "application/json",
      ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });

  const data = await parseResponse(response, options.responseType);

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthTokens();
      window.location.href = "/login";
    }

    const error = new Error("API request failed") as ApiError;
    error.response = { data, status: response.status };
    throw error;
  }

  return {
    data: data as T,
    status: response.status,
    headers: response.headers,
  };
}

const apiClient = {
  get: <T = unknown>(path: string, options?: RequestOptions) =>
    request<T>("GET", path, undefined, options),
  post: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),
  put: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PUT", path, body, options),
  patch: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, body, options),
  delete: <T = unknown>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, undefined, options),
};

export default apiClient;
