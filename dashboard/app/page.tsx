"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import { LockKeyhole, LoaderCircle } from "lucide-react";

type User = { full_name: string; email: string };

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("info@novarisesa.com");
  const [password, setPassword] = useState("");
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
      <section className="login-brand">
        <Image src="/logo-white-full.png" alt="NOVARISE" width={190} height={52} priority />
        <div>
          <p className="eyebrow light">Private operations workspace</p>
          <h1>One calm place to run your digital presence.</h1>
          <p>Content, enquiries, recruitment and site controls — secured for your team.</p>
        </div>
        <small>© 2026 NOVARISE SA</small>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <div className="mark"><LockKeyhole size={21} /></div>
          <p className="eyebrow">Control Center</p>
          <h2>Welcome back</h2>
          <p className="muted">Sign in with your authorized company account.</p>
          <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} /></label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" disabled={busy}>
            {busy && <LoaderCircle size={17} className="spin" />} Sign in securely
          </button>
          <p className="secure-note">Protected by encrypted, HTTP-only sessions.</p>
        </form>
      </section>
    </main>
  );
}
