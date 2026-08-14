export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.novarisesa.com/api/v1";

/** Public site origin, used to embed the live preview iframe and validate postMessage origin. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://novarisesa.com";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let refreshRequest: Promise<boolean> | null = null;

async function timedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);
  const abort = () => controller.abort();
  init.signal?.addEventListener("abort", abort, { once: true });
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(408, "The request timed out. Please try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    init.signal?.removeEventListener("abort", abort);
  }
}

async function refreshSession(): Promise<boolean> {
  if (!refreshRequest) {
    refreshRequest = timedFetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((response) => response.ok)
      .finally(() => {
        refreshRequest = null;
      });
  }
  return refreshRequest;
}

function resolveDetail(body: unknown): string {
  if (!body || typeof body !== "object") return "Something went wrong";
  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) =>
        typeof item === "object" && item && "msg" in item
          ? String((item as { msg: unknown }).msg)
          : String(item),
      )
      .join(", ");
  }
  return "Something went wrong";
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await timedFetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });
  if (
    response.status === 401 &&
    retry &&
    path !== "/auth/login" &&
    path !== "/auth/refresh"
  ) {
    const refreshed = await refreshSession();
    if (refreshed) return api<T>(path, init, false);
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, resolveDetail(body));
  }
  return body as T;
}
