import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { MailAccount, MobileSession } from "./types";
import { resolveSystemFolders, resetSystemFolders, toImapFolder, toLogicalFolder, SYSTEM_FOLDERS } from "./types";

// "Could not switch accounts" report: switchAccount used to wipe the access
// token and flip the active account *before* knowing the target's saved
// sign-in still worked, so a failed switch left the app half-switched.

const ACCOUNTS_KEY = "novamail.accounts";
const ACTIVE_KEY = "novamail.active";
const ADMIN = "admin@novarisesa.com";
const MEMBER = "member@novarisesa.com";

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

function account(address: string): MailAccount {
  return {
    id: address,
    address,
    display_name: address,
    avatar_url: null,
    cache_ttl_days: 30,
    hostinger_mailbox_id: null,
    signature: null,
    role: "member",
    acting_as_admin: false,
    provider: "hostinger",
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** `valid` maps address -> its still-good refresh token; anything else 401s,
 * exactly like a revoked/expired token on the real server. */
function installServer(valid: Record<string, string>, mode: "normal" | "down" = "normal") {
  const logoutBodies: unknown[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (mode === "down") return json({ detail: "bad gateway" }, 502);
      if (url.endsWith("/mail/auth/refresh")) {
        const { refresh_token } = JSON.parse(String(init?.body)) as { refresh_token: string };
        const address = Object.keys(valid).find((key) => valid[key] === refresh_token);
        if (!address) return json({ detail: "Session expired" }, 401);
        valid[address] = `${refresh_token}-next`;
        const session: MobileSession = {
          access_token: `at-${address}`,
          refresh_token: valid[address],
          token_type: "bearer",
          expires_in: 900,
          account: account(address),
        };
        return json(session, 200);
      }
      if (url.endsWith("/mail/account")) {
        const auth = new Headers(init?.headers).get("Authorization") ?? "";
        return auth ? json(account(auth.replace("Bearer at-", "")), 200) : json({ detail: "x" }, 401);
      }
      if (url.endsWith("/mail/auth/logout")) {
        logoutBodies.push(JSON.parse(String(init?.body ?? "null")));
        return new Response(null, { status: 204 });
      }
      return json({}, 404);
    }),
  );
  return { logoutBodies };
}

beforeEach(() => {
  const storage = new MemoryStorage();
  storage.setItem(
    ACCOUNTS_KEY,
    JSON.stringify([
      { address: ADMIN, refresh_token: "rt-admin", display_name: "Admin", avatar_url: null },
      { address: MEMBER, refresh_token: "rt-member", display_name: "Member", avatar_url: null },
    ]),
  );
  storage.setItem(ACTIVE_KEY, ADMIN);
  vi.stubGlobal("window", { localStorage: storage, setTimeout, clearTimeout });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

test("switching works when the target's saved sign-in is valid", async () => {
  installServer({ [ADMIN]: "rt-admin", [MEMBER]: "rt-member" });
  const api = await import("./api");
  expect((await api.ensureSession())?.address).toBe(ADMIN);
  const next = await api.switchAccount(MEMBER);
  expect(next.address).toBe(MEMBER);
  expect(api.activeAddress()).toBe(MEMBER);
});

test("a revoked saved sign-in leaves the current account active and drops the dead entry", async () => {
  installServer({ [ADMIN]: "rt-admin" }); // member's token no longer valid server-side
  const api = await import("./api");
  await api.ensureSession();

  await expect(api.switchAccount(MEMBER)).rejects.toThrow(/expired/);

  expect(api.activeAddress()).toBe(ADMIN);
  expect(api.hasAccessToken()).toBe(true);
  expect(api.savedAccounts().map((item) => item.address)).toEqual([ADMIN]);
  // and the app is still fully usable as the admin
  expect((await api.getAccount()).address).toBe(ADMIN);
});

test("a server outage is reported as such and keeps the saved sign-in", async () => {
  installServer({ [ADMIN]: "rt-admin", [MEMBER]: "rt-member" });
  const api = await import("./api");
  await api.ensureSession();
  installServer({}, "down");

  await expect(api.switchAccount(MEMBER)).rejects.toThrow(/connection/);

  expect(api.activeAddress()).toBe(ADMIN);
  expect(api.savedAccounts().map((item) => item.address)).toContain(MEMBER);
});

test("logout sends only this session's refresh token", async () => {
  const { logoutBodies } = installServer({ [ADMIN]: "rt-admin", [MEMBER]: "rt-member" });
  const api = await import("./api");
  await api.ensureSession();
  await api.logout();
  expect(logoutBodies).toHaveLength(1);
  expect((logoutBodies[0] as { refresh_token: string }).refresh_token).toBe("rt-admin-next");
});

test("system folders resolve to Gmail's special-use names, and keep Hostinger's own", () => {
  const folder = (name: string, flags: string[] = []) => ({ name, delimiter: "/", flags, unseen: 0, total: 0 });
  resolveSystemFolders([
    folder("INBOX"),
    folder("[Gmail]/Sent Mail", ["\\Sent", "\\HasNoChildren"]),
    folder("[Gmail]/Trash", ["\\Trash"]),
    folder("[Gmail]/Spam", ["\\Junk"]),
    folder("[Gmail]/All Mail", ["\\All"]),
  ]);
  expect(toImapFolder(SYSTEM_FOLDERS.sent)).toBe("[Gmail]/Sent Mail");
  expect(toImapFolder(SYSTEM_FOLDERS.trash)).toBe("[Gmail]/Trash");
  expect(toImapFolder(SYSTEM_FOLDERS.spam)).toBe("[Gmail]/Spam");
  expect(toImapFolder(SYSTEM_FOLDERS.archive)).toBe("[Gmail]/All Mail");
  expect(toLogicalFolder("[Gmail]/Sent Mail")).toBe(SYSTEM_FOLDERS.sent);
  expect(toImapFolder(SYSTEM_FOLDERS.starred)).toBe("INBOX");

  resolveSystemFolders([
    folder("INBOX"),
    folder("INBOX.Sent", ["\\Sent"]),
    folder("INBOX.Trash", ["\\Trash"]),
    folder("INBOX.Junk", ["\\Junk"]),
    folder("INBOX.Archive"),
  ]);
  expect(toImapFolder(SYSTEM_FOLDERS.sent)).toBe("INBOX.Sent");
  expect(toImapFolder(SYSTEM_FOLDERS.archive)).toBe("INBOX.Archive");
  resetSystemFolders();
});
