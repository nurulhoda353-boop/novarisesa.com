"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import { Eye, EyeOff, LockKeyhole, LoaderCircle, Mail } from "lucide-react";

type User = { full_name: string; email: string; must_change_password?: boolean };
type Session = { user: User; expires_in: number };

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<User>("/auth/me")
      .then((user) => router.replace(user.must_change_password ? "/change-password" : "/overview"))
      .catch(() => setChecking(false));
  }, [router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await api<Session>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.replace(session.user.must_change_password ? "/change-password" : "/overview");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Unable to sign in");
      setBusy(false);
    }
  }

  if (checking) {
    return <main className="center-screen"><LoaderCircle className="spin" /></main>;
  }

  return (
    <main className="login-page">
      <div className="login-backdrop" />
      <section className="login-shell">
        <aside className="login-showcase">
          <div className="login-logo">
            <Image src="/logo-white-full.png" alt="NOVARISE" width={190} height={52} priority />
            <span>CONTROL CENTER</span>
          </div>
          <div className="login-console-art" aria-hidden="true"><div className="login-console-head"><i /><i /><i /></div><div className="login-console-body"><span /><span /><span /><b /><b /><em /></div></div>
          <div className="login-showcase-copy"><p className="eyebrow">Secure operations</p><h2>Everything important, clearly in one place.</h2><p>Manage NOVARISE content, enquiries and team workflows with clarity and control.</p></div>
          <div className="login-showcase-rule"><i /><i /><i /></div>
        </aside>
        <form className="login-card" onSubmit={submit}>
          <div className="login-card-top">
            <span><i /> Secure workspace</span>
          </div>
          <p className="eyebrow">Authorized access only</p>
          <h1>Sign in</h1>
          <p className="muted">Enter your work email and password to open the Control Center.</p>
          <label>
            Work email
            <div className="login-field">
              <Mail size={17} />
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required />
            </div>
          </label>
          <label>
            Password
            <div className="login-field">
              <LockKeyhole size={17} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                minLength={8}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                <span>{showPassword ? "Hide" : "Show"}</span>
              </button>
            </div>
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" disabled={busy}>
            {busy && <LoaderCircle size={17} className="spin" />} Sign in securely
          </button>
          <div className="secure-note">
            <ShieldMark />
            <span>Encrypted session · Monitored access · NOVARISE SA</span>
          </div>
          <p className="login-help">Need access help? <a href="mailto:official@novarisesa.com">Contact the administrator</a></p>
        </form>
      </section>
    </main>
  );
}

function ShieldMark() {
  return <span className="shield-mark"><LockKeyhole size={13} /></span>;
}
