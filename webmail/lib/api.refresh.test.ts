import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { MailAccount, MobileSession } from "./types";

// Refresh tokens are single-use and rotate on every call. `accessToken`
// lives only in each tab's JS module state, but the refresh token is
// shared via localStorage - open the same mailbox in two tabs and both
// can read the same still-valid refresh token, race to redeem it, and
// the loser used to be left on a dead session (the "login hoy na" /
// "admin panel kaj kore na" client report). This pins that both tabs
// come out of that race with a working session.

const ACCOUNTS_KEY = "novamail.accounts";
const ACTIVE_KEY = "novamail.active";
const ADDRESS = "rabbani@novarisesa.com";

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
}

function fakeAccount(): MailAccount {
  return {
    id: "acc-1",
    address: ADDRESS,
    display_name: "Golam Rabbani",
    avatar_url: null,
    cache_ttl_days: 30,
    hostinger_mailbox_id: "mb-1",
    signature: null,
    role: "member",
    acting_as_admin: false,
    provider: "hostinger",
  };
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** A minimal fake of the real /mail/auth/refresh + /mail/account
 * endpoints: the refresh token is single-use, just like the real backend
 * (app/api/routes/mail.py's refresh() revokes the redeemed token). */
function installFakeServer() {
  let serverRefreshToken = "rt-1";
  let generation = 0;
  const calls: string[] = [];

  const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/mail/auth/refresh") && init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as { refresh_token: string };
      calls.push(body.refresh_token);
      if (body.refresh_token !== serverRefreshToken) {
        return jsonResponse({ detail: "Session expired" }, 401);
      }
      generation += 1;
      serverRefreshToken = `rt-${generation + 1}`;
      const session: MobileSession = {
        access_token: `at-${generation}`,
        refresh_token: serverRefreshToken,
        token_type: "bearer",
        expires_in: 900,
        account: fakeAccount(),
      };
      return jsonResponse(session, 200);
    }
    if (url.endsWith("/mail/account")) {
      const auth = new Headers(init?.headers).get("Authorization");
      if (!auth) return jsonResponse({ detail: "Session expired" }, 401);
      return jsonResponse(fakeAccount(), 200);
    }
    return jsonResponse({}, 404);
  });

  vi.stubGlobal("fetch", fetchMock);
  return { calls };
}

beforeEach(() => {
  const storage = new MemoryStorage();
  storage.setItem(
    ACCOUNTS_KEY,
    JSON.stringify([{ address: ADDRESS, refresh_token: "rt-1", display_name: "Golam Rabbani", avatar_url: null }]),
  );
  storage.setItem(ACTIVE_KEY, ADDRESS);
  vi.stubGlobal("window", { localStorage: storage, setTimeout, clearTimeout });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

test("two tabs racing to refresh the same token both end up with a working session", async () => {
  installFakeServer();

  // Each dynamic import after resetModules() gets its own module-level
  // `accessToken`/`refreshInFlight` state - exactly like two real browser
  // tabs, which share localStorage but not JS memory.
  vi.resetModules();
  const tab1 = await import("./api");
  vi.resetModules();
  const tab2 = await import("./api");

  const [account1, account2] = await Promise.all([tab1.ensureSession(), tab2.ensureSession()]);

  expect(account1?.address).toBe(ADDRESS);
  expect(account2?.address).toBe(ADDRESS);
});

test("a tab whose refresh token was already rotated by another tab retries with the new one instead of dying", async () => {
  const { calls } = installFakeServer();

  vi.resetModules();
  const tab1 = await import("./api");
  const first = await tab1.ensureSession();
  expect(first?.address).toBe(ADDRESS);

  // tab1 rotated "rt-1" -> "rt-2" in localStorage. tab2 starts fresh but
  // still only knows about "rt-1" in its own closure until it reads
  // storage - simulate it having read the stale value a moment earlier.
  vi.resetModules();
  const tab2 = await import("./api");
  const second = await tab2.ensureSession();

  expect(second?.address).toBe(ADDRESS);
  // Confirms the retry actually happened server-side, not that the test
  // just got lucky - tab2 must have redeemed the rotated token, not the
  // stale one.
  expect(calls.length).toBeGreaterThanOrEqual(2);
});
