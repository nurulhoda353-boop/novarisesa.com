"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ApiError, auth } from "@/lib/api";
import type { SessionUser } from "@/lib/types";

interface AuthValue {
  user: SessionUser;
  canManage: boolean;
  canAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth outside provider");
  return value;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    auth
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setChecked(true));
  }, []);

  const signOut = useCallback(async () => {
    await auth.logout().catch(() => undefined);
    setUser(null);
  }, []);

  if (!checked) return <div className="center-note">Loading…</div>;
  if (!user) return <Login onSignedIn={setUser} />;

  const permissions = new Set(user.permissions);
  if (user.must_change_password) {
    return (
      <div className="login-page">
        <div className="panel login-card">
          <h1>Password change required</h1>
          <p style={{ textAlign: "center", color: "var(--muted)" }}>
            Please change your temporary password in the NOVARISE Control Center (my.novarisesa.com), then come back.
          </p>
          <button className="btn" onClick={signOut} style={{ width: "100%" }}>
            Sign out
          </button>
        </div>
      </div>
    );
  }
  if (!permissions.has("muqeem.view") && !permissions.has("muqeem.manage")) {
    return (
      <div className="login-page">
        <div className="panel login-card">
          <h1>No access</h1>
          <p style={{ textAlign: "center", color: "var(--muted)" }}>
            {user.email} is not allowed to use Muqeem Control. Ask an administrator for access.
          </p>
          <button className="btn" onClick={signOut} style={{ width: "100%" }}>
            Sign out
          </button>
        </div>
      </div>
    );
  }
  return (
    <AuthContext.Provider value={{ user, canManage: permissions.has("muqeem.manage"), canAdmin: permissions.has("muqeem.admin"), signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

function Login({ onSignedIn }: { onSignedIn: (user: SessionUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await auth.login(email.trim(), password);
      onSignedIn(session.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="panel login-card">
        <div className="logo-chip">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/novarise-white.png" alt="NOVARISE" />
        </div>
        <p className="eyebrow" style={{ textAlign: "center" }}>
          Muqeem Control
        </p>
        <h1>Sign in</h1>
        <form onSubmit={submit}>
          {error && <div className="alert error">{error}</div>}
          <label className="field">
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" autoFocus />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="current-password"
            />
          </label>
          <button className="btn primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
