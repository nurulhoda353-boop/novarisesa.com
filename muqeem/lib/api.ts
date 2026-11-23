import type {
  Facets,
  HistoryEntry,
  ImportResult,
  MuqeemFields,
  MuqeemRecord,
  PublicVerify,
  RecordFilters,
  SessionUser,
  Stats,
} from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.novarisesa.com/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let refreshRequest: Promise<boolean> | null = null;

async function timedFetch(input: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 20_000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(408, "The request timed out. Please try again.");
    }
    throw new ApiError(0, "Could not reach the server. Check your connection.");
  } finally {
    window.clearTimeout(timer);
  }
}

function refreshSession(): Promise<boolean> {
  if (!refreshRequest) {
    refreshRequest = timedFetch(`${API_URL}/auth/refresh`, { method: "POST", credentials: "include" })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshRequest = null;
      });
  }
  return refreshRequest;
}

function detailOf(body: unknown): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const msg = typeof item === "object" && item && "msg" in item ? String((item as { msg: unknown }).msg) : String(item);
        const loc = typeof item === "object" && item && "loc" in item ? (item as { loc: unknown[] }).loc.slice(1).join(".") : "";
        return loc ? `${loc}: ${msg.replace(/^Value error, /, "")}` : msg;
      })
      .join("; ");
  }
  return "Something went wrong";
}

async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await timedFetch(`${API_URL}${path}`, { ...init, credentials: "include", headers });
  if (response.status === 401 && retry && path !== "/auth/login" && path !== "/auth/refresh") {
    if (await refreshSession()) return api<T>(path, init, false);
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, detailOf(body));
  return body as T;
}

export const auth = {
  me: () => api<SessionUser>("/auth/me"),
  login: (email: string, password: string) =>
    api<{ user: SessionUser }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => api<void>("/auth/logout", { method: "POST" }),
};

function query(filters: RecordFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === "" || value === false) continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

export const records = {
  list: (filters: RecordFilters = {}) => api<MuqeemRecord[]>(`/muqeem/records${query(filters)}`),
  get: (id: string) => api<MuqeemRecord>(`/muqeem/records/${id}`),
  create: (body: MuqeemFields) => api<MuqeemRecord>("/muqeem/records", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: MuqeemFields) =>
    api<MuqeemRecord>(`/muqeem/records/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  /** Archives the record (reversible). */
  archive: (id: string) => api<void>(`/muqeem/records/${id}`, { method: "DELETE" }),
  /** Erases the record for good (admin only). */
  removePermanently: (id: string) => api<void>(`/muqeem/records/${id}?permanent=true`, { method: "DELETE" }),
  bulk: (ids: string[], action: "archive" | "restore") =>
    api<{ changed: number }>("/muqeem/records/bulk", { method: "POST", body: JSON.stringify({ ids, action }) }),
  history: (id: string) => api<HistoryEntry[]>(`/muqeem/records/${id}/history`),
  importRows: (rows: Record<string, string>[]) =>
    api<ImportResult>("/muqeem/records/import", { method: "POST", body: JSON.stringify({ rows, skip_duplicates: true }) }),
  stats: () => api<Stats>("/muqeem/stats"),
  facets: () => api<Facets>("/muqeem/facets"),
  verify: (code: string) => api<PublicVerify>(`/muqeem/verify/${encodeURIComponent(code)}`),
};
