import type {
  AdminAccountInfo,
  AdminAuditLogEntry,
  AdminChangeRequestInfo,
  AliasInfo,
  AutoreplyInfo,
  ContactInfo,
  DraftInfo,
  FolderInfo,
  ForwarderInfo,
  HostingerMailboxInfo,
  MailAccount,
  MailChangeRequestInfo,
  MailMessageDetail,
  MailMessageList,
  MailRuleInfo,
  MobileSession,
  SendMailRequest,
  SnoozeInfo,
} from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.novarisesa.com/api/v1";
export const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://api.novarisesa.com";

const ACCOUNTS_KEY = "novamail.accounts";
const ACTIVE_KEY = "novamail.active";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface StoredAccount {
  address: string;
  refresh_token: string;
  display_name: string;
  avatar_url: string | null;
}

function readAccounts(): StoredAccount[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(ACCOUNTS_KEY) ?? "[]") as StoredAccount[];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: StoredAccount[]): void {
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function savedAccounts(): StoredAccount[] {
  return readAccounts();
}

export function activeAddress(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_KEY);
}

function setActiveAddress(address: string): void {
  window.localStorage.setItem(ACTIVE_KEY, address);
}

function rememberAccount(address: string, refreshToken: string, account: MailAccount): void {
  const accounts = readAccounts().filter((item) => item.address !== address);
  accounts.push({
    address,
    refresh_token: refreshToken,
    display_name: account.display_name,
    avatar_url: account.avatar_url,
  });
  writeAccounts(accounts);
}

export function forgetAccount(address: string): void {
  writeAccounts(readAccounts().filter((item) => item.address !== address));
  if (activeAddress() === address) {
    window.localStorage.removeItem(ACTIVE_KEY);
    accessToken = null;
  }
}

let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;
let onSessionChange: ((account: MailAccount | null) => void) | null = null;

export function setSessionListener(callback: (account: MailAccount | null) => void): void {
  onSessionChange = callback;
}

async function timedFetch(input: string, init: RequestInit = {}, timeoutMs = 25_000): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(408, "The request timed out. Please try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
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

async function performRefresh(): Promise<boolean> {
  const address = activeAddress();
  const stored = readAccounts().find((item) => item.address === address);
  if (!stored) return false;
  try {
    const response = await timedFetch(`${API_URL}/mail/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: stored.refresh_token }),
    });
    if (!response.ok) return false;
    const session = (await response.json()) as MobileSession;
    accessToken = session.access_token;
    rememberAccount(stored.address, session.refresh_token, session.account);
    onSessionChange?.(session.account);
    return true;
  } catch {
    return false;
  }
}

function refreshSession(): Promise<boolean> {
  return (refreshInFlight ??= performRefresh().finally(() => {
    refreshInFlight = null;
  }));
}

export async function ensureSession(): Promise<MailAccount | null> {
  const address = activeAddress();
  if (!address) return null;
  if (accessToken) {
    try {
      return await getAccount();
    } catch {
      // fall through to refresh
    }
  }
  const ok = await refreshSession();
  if (!ok) return null;
  try {
    return await getAccount();
  } catch {
    return null;
  }
}

export async function login(
  email: string,
  password: string,
): Promise<MailAccount> {
  const response = await timedFetch(`${API_URL}/mail/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      credential_type: "mailbox_password",
      device_name: "Novamail Web",
      platform: "web",
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, resolveDetail(body));
  const session = body as MobileSession;
  accessToken = session.access_token;
  rememberAccount(email.toLowerCase(), session.refresh_token, session.account);
  setActiveAddress(email.toLowerCase());
  onSessionChange?.(session.account);
  return session.account;
}

export async function switchAccount(address: string): Promise<MailAccount | null> {
  accessToken = null;
  setActiveAddress(address);
  return ensureSession();
}

export async function logout(): Promise<void> {
  try {
    await api("/mail/auth/logout", { method: "POST" });
  } catch {
    // ignore network errors on logout
  }
  const address = activeAddress();
  if (address) forgetAccount(address);
  accessToken = null;
  onSessionChange?.(null);
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (!isFormData && init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await timedFetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 401 && retry) {
    const refreshed = await refreshSession();
    if (refreshed) return api<T>(path, init, false);
  }
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json().catch(() => ({})) : null;
  if (!response.ok) {
    throw new ApiError(response.status, resolveDetail(body));
  }
  return body as T;
}

async function apiBlob(path: string, retry = true): Promise<{ blob: Blob; filename: string }> {
  const headers = new Headers();
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await timedFetch(`${API_URL}${path}`, { headers }, 60_000);
  if (response.status === 401 && retry) {
    const refreshed = await refreshSession();
    if (refreshed) return apiBlob(path, false);
  }
  if (!response.ok) throw new ApiError(response.status, "Could not download the attachment");
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const filename = match ? decodeURIComponent(match[1]) : "attachment";
  return { blob: await response.blob(), filename };
}

export function wsUrl(): string {
  const origin = API_ORIGIN.replace(/^http/, "ws");
  return `${origin}/api/v1/mail/ws?access_token=${encodeURIComponent(accessToken ?? "")}`;
}

export function hasAccessToken(): boolean {
  return accessToken !== null;
}

// ---- Account ----
export const getAccount = () => api<MailAccount>("/mail/account");
export const updateAccount = (payload: { display_name: string; cache_ttl_days: number; signature: string | null }) =>
  api<MailAccount>("/mail/account", { method: "PATCH", body: JSON.stringify(payload) });
export const changePassword = (payload: { current_password: string; new_password: string }) =>
  api<void>("/mail/account/password", { method: "POST", body: JSON.stringify(payload) });
export const uploadAvatar = (file: File) => {
  const form = new FormData();
  form.append("avatar", file);
  return api<MailAccount>("/mail/account/avatar", { method: "POST", body: form });
};

// ---- Change requests (member self-service, needs admin approval) ----
export const requestChange = (requestType: "password" | "display_name", value: string) =>
  api<MailChangeRequestInfo>("/mail/account/change-request", {
    method: "POST",
    body: JSON.stringify({ request_type: requestType, value }),
  });
export const myChangeRequests = () => api<MailChangeRequestInfo[]>("/mail/account/change-requests");

// ---- Admin panel ----
export const adminListAccounts = () => api<AdminAccountInfo[]>("/mail/admin/accounts");
export const adminSetPassword = (accountId: string, newPassword: string) =>
  api<void>(`/mail/admin/accounts/${accountId}/password`, {
    method: "POST",
    body: JSON.stringify({ new_password: newPassword }),
  });
export const adminSetProfile = (accountId: string, displayName: string) =>
  api<AdminAccountInfo>(`/mail/admin/accounts/${accountId}/profile`, {
    method: "PATCH",
    body: JSON.stringify({ display_name: displayName }),
  });
export const adminSetAvatar = (accountId: string, file: File) => {
  const form = new FormData();
  form.append("avatar", file);
  return api<AdminAccountInfo>(`/mail/admin/accounts/${accountId}/avatar`, { method: "POST", body: form });
};
export const adminListChangeRequests = (status: "pending" | "all" = "pending") =>
  api<AdminChangeRequestInfo[]>(`/mail/admin/change-requests?status=${status}`);
export const adminApproveChangeRequest = (requestId: string) =>
  api<void>(`/mail/admin/change-requests/${requestId}/approve`, { method: "POST" });
export const adminRejectChangeRequest = (requestId: string, reason?: string) =>
  api<void>(`/mail/admin/change-requests/${requestId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason: reason ?? null }),
  });
export const adminAuditLog = (limit = 100) => api<AdminAuditLogEntry[]>(`/mail/admin/audit-log?limit=${limit}`);

/** The rarer, explicit action that changes the real Hostinger mailbox
 * password (unlike adminSetPassword, which only ever resets the
 * Novamail-only login) - the backend itself refuses this without
 * confirm: true, so the 3-step UI confirmation isn't the only guard. */
export const adminSetHostingerPassword = (accountId: string, newPassword: string) =>
  api<void>(`/mail/admin/accounts/${accountId}/hostinger-password`, {
    method: "POST",
    body: JSON.stringify({ new_password: newPassword, confirm: true }),
  });
export const adminViewHostingerPassword = (accountId: string) =>
  api<{ address: string; password: string }>(`/mail/admin/accounts/${accountId}/hostinger-password`);
export const adminHostingerMailboxes = () => api<HostingerMailboxInfo[]>("/mail/admin/hostinger-mailboxes");

/** Switches the active session into a member mailbox without its
 * password - the same "saved account" storage the manual switch-account
 * flow already uses, so AccountSwitcherMenu and everything else just
 * works afterward. */
export async function adminSwitchToAccount(accountId: string): Promise<MailAccount> {
  const session = await api<MobileSession>(`/mail/admin/accounts/${accountId}/switch`, { method: "POST" });
  accessToken = session.access_token;
  rememberAccount(session.account.address, session.refresh_token, session.account);
  setActiveAddress(session.account.address);
  onSessionChange?.(session.account);
  return session.account;
}

// ---- Folders / Messages ----
export const listFolders = () => api<FolderInfo[]>("/mail/folders");

export interface MessageQuery {
  folder?: string;
  limit?: number;
  before_uid?: number;
  q?: string;
  from_contains?: string;
  since?: string;
  before?: string;
  has_attachment?: boolean;
  starred?: boolean;
}
export function listMessages(query: MessageQuery): Promise<MailMessageList> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  return api<MailMessageList>(`/mail/messages?${params.toString()}`);
}
export const getMessage = (folder: string, uid: number) =>
  api<MailMessageDetail>(`/mail/messages/${uid}?folder=${encodeURIComponent(folder)}`);
export const downloadAttachment = (folder: string, uid: number, part: string) =>
  apiBlob(`/mail/messages/${uid}/attachments/${encodeURIComponent(part)}?folder=${encodeURIComponent(folder)}`);
export const setRead = (folder: string, uid: number, value: boolean) =>
  api<void>(`/mail/messages/${uid}/read?folder=${encodeURIComponent(folder)}`, {
    method: "PUT",
    body: JSON.stringify({ value }),
  });
export const setStar = (folder: string, uid: number, value: boolean) =>
  api<void>(`/mail/messages/${uid}/star?folder=${encodeURIComponent(folder)}`, {
    method: "PUT",
    body: JSON.stringify({ value }),
  });
export const moveMessage = (folder: string, uid: number, destination: string) =>
  api<void>(`/mail/messages/${uid}/move?folder=${encodeURIComponent(folder)}`, {
    method: "POST",
    body: JSON.stringify({ destination }),
  });
export const deleteMessage = (folder: string, uid: number) =>
  api<void>(`/mail/messages/${uid}?folder=${encodeURIComponent(folder)}`, { method: "DELETE" });
export const sendMessage = (payload: SendMailRequest) =>
  api<{ status: string; message_id: string }>("/mail/messages/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });

// ---- Snooze ----
export const snoozeMessage = (folder: string, uid: number, wakeAt: string) =>
  api<SnoozeInfo>(`/mail/messages/${uid}/snooze?folder=${encodeURIComponent(folder)}`, {
    method: "POST",
    body: JSON.stringify({ wake_at: wakeAt }),
  });
export const listSnoozes = () => api<SnoozeInfo[]>("/mail/snoozes");
export const cancelSnooze = (id: string) => api<void>(`/mail/snoozes/${id}`, { method: "DELETE" });

// ---- Contacts ----
export const listContacts = () => api<ContactInfo[]>("/mail/contacts");
export const createContact = (payload: Partial<ContactInfo>) =>
  api<ContactInfo>("/mail/contacts", { method: "POST", body: JSON.stringify(payload) });
export const updateContact = (id: string, payload: Partial<ContactInfo>) =>
  api<ContactInfo>(`/mail/contacts/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const deleteContact = (id: string) => api<void>(`/mail/contacts/${id}`, { method: "DELETE" });

// ---- Drafts ----
export const listDrafts = () => api<DraftInfo[]>("/mail/drafts");
export const createDraft = (payload: Partial<DraftInfo>) =>
  api<DraftInfo>("/mail/drafts", { method: "POST", body: JSON.stringify(payload) });
export const updateDraft = (id: string, payload: Partial<DraftInfo>) =>
  api<DraftInfo>(`/mail/drafts/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const deleteDraft = (id: string) => api<void>(`/mail/drafts/${id}`, { method: "DELETE" });

// ---- Management ----
export const listAliases = () => api<AliasInfo[]>("/mail/management/aliases");
export const createAlias = (localPart: string) =>
  api<AliasInfo>("/mail/management/aliases", { method: "POST", body: JSON.stringify({ local_part: localPart }) });
export const deleteAlias = (id: string) => api<void>(`/mail/management/aliases/${id}`, { method: "DELETE" });

export const listForwarders = () => api<ForwarderInfo[]>("/mail/management/forwarders");
export const createForwarder = (destination: string, keepCopy: boolean) =>
  api<ForwarderInfo>("/mail/management/forwarders", {
    method: "POST",
    body: JSON.stringify({ destination, keep_copy: keepCopy }),
  });
export const deleteForwarder = (id: string) => api<void>(`/mail/management/forwarders/${id}`, { method: "DELETE" });

export const listAutoreplies = () => api<AutoreplyInfo[]>("/mail/management/autoreplies");
export const createAutoreply = (payload: Partial<AutoreplyInfo>) =>
  api<AutoreplyInfo>("/mail/management/autoreplies", { method: "POST", body: JSON.stringify(payload) });
export const updateAutoreply = (id: string, payload: Partial<AutoreplyInfo>) =>
  api<AutoreplyInfo>(`/mail/management/autoreplies/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const deleteAutoreply = (id: string) => api<void>(`/mail/management/autoreplies/${id}`, { method: "DELETE" });

// ---- Rules ----
export interface MailRuleUpsert {
  name: string;
  from_contains: string | null;
  subject_contains: string | null;
  destination_folder: string;
  is_enabled: boolean;
}
export const listRules = () => api<MailRuleInfo[]>("/mail/rules");
export const createRule = (payload: MailRuleUpsert) =>
  api<MailRuleInfo>("/mail/rules", { method: "POST", body: JSON.stringify(payload) });
export const updateRule = (id: string, payload: MailRuleUpsert) =>
  api<MailRuleInfo>(`/mail/rules/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const deleteRule = (id: string) => api<void>(`/mail/rules/${id}`, { method: "DELETE" });
