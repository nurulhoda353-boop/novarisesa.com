"use client";

import { useState, type FormEvent } from "react";
import { ApiError, login } from "@/lib/api";
import type { MailAccount } from "@/lib/types";

export function LoginScreen({
  onSuccess,
  onCancel,
  compact = false,
}: {
  onSuccess: (account: MailAccount) => void;
  onCancel?: () => void;
  compact?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      const account = await login(email.trim(), password);
      onSuccess(account);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const card = (
    <div className="login-card">
      <div className="logo">
        <img src="/novamail-icon.png" alt="Novamail" />
        <h1>Novamail</h1>
        <p>Sign in with your @novarisesa.com mailbox</p>
      </div>
      <form onSubmit={handleSubmit}>
        <input
          className="form-input"
          type="email"
          placeholder="you@novarisesa.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoFocus
          autoComplete="username"
        />
        <input
          className="form-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />
        {error && <div className="login-error">{error}</div>}
        <button type="submit" className="btn btn-primary" disabled={loading || !email || !password}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel} style={{ alignSelf: "center" }}>
            Cancel
          </button>
        )}
      </form>
      {!compact && <p className="login-footer">The NOVARISE email workspace</p>}
    </div>
  );

  if (compact) return card;
  return <div className="login-screen">{card}</div>;
}
