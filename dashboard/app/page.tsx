"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import { Eye, EyeOff, LockKeyhole, LoaderCircle, Mail } from "lucide-react";

type User = { full_name: string; email: string };

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("info@novarisesa.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<User>("/auth/me")
      .then(() => router.replace("/overview"))
      .catch(() => setChecking(false));
  }, [router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.replace("/overview");
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
      <div className="login-orbit orbit-one" />
      <div className="login-orbit orbit-two" />
      <section className="login-shell">
        <div className="login-logo">
          <Image src="/logo-white-full.png" alt="NOVARISE" width={190} height={52} priority />
          <span>CONTROL CENTER</span>
        </div>
        <form className="login-card" onSubmit={submit}>
          <div className="login-card-top">
            <div className="mark"><LockKeyhole size={20} /></div>
            <span><i /> Secure workspace</span>
          </div>
          <p className="eyebrow">Authorized access only</p>
          <h1>Welcome back.</h1>
          <p className="muted">Manage the NOVARISE website, enquiries and content from one place.</p>
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
        </form>
        <p className="login-help">Need access help? <a href="mailto:info@novarisesa.com">Contact the administrator</a></p>
      </section>
    </main>
  );
}

function ShieldMark() {
  return <span className="shield-mark"><LockKeyhole size={13} /></span>;
}
