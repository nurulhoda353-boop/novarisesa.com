"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api";

type User = { full_name: string; email: string; must_change_password: boolean };

export default function ChangePasswordPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<User>("/auth/me")
      .then((currentUser) => {
        if (!currentUser.must_change_password) router.replace("/overview");
        else setUser(currentUser);
      })
      .catch(() => router.replace("/"));
  }, [router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmation) {
      setError("The new passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      router.replace("/overview");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Could not change your password.");
      setBusy(false);
    }
  }

  if (!user) return <main className="center-screen"><LoaderCircle className="spin" /></main>;

  return <main className="login-page password-setup-page">
    <div className="login-backdrop" />
    <section className="login-shell">
      <div className="login-logo"><Image src="/logo-white-full.png" alt="NOVARISE" width={190} height={52} priority /><span>CONTROL CENTER</span></div>
      <form className="login-card password-setup-card" onSubmit={submit}>
        <div className="login-card-top"><div className="mark"><ShieldCheck size={20} /></div><span><i /> Protected first sign-in</span></div>
        <p className="eyebrow">Secure your account</p>
        <h1>Choose your private password.</h1>
        <p className="muted">Welcome, {user.full_name}. Replace the temporary password before entering the dashboard.</p>
        <label>Temporary password<div className="login-field"><LockKeyhole size={17} /><input type={show ? "text" : "password"} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required minLength={8} /></div></label>
        <label>New private password<div className="login-field"><LockKeyhole size={17} /><input type={show ? "text" : "password"} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" required minLength={12} /><button type="button" className="password-toggle" onClick={() => setShow((value) => !value)} aria-label={show ? "Hide passwords" : "Show passwords"}>{show ? <EyeOff size={17} /> : <Eye size={17} />}<span>{show ? "Hide" : "Show"}</span></button></div></label>
        <label>Confirm new password<div className="login-field"><Check size={17} /><input type={show ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" required minLength={12} /></div></label>
        <div className="password-rules"><span className={newPassword.length >= 12 ? "met" : ""}><Check size={12} />At least 12 characters</span><span className={newPassword && newPassword === confirmation ? "met" : ""}><Check size={12} />Both passwords match</span></div>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" disabled={busy || newPassword.length < 12 || newPassword !== confirmation}>{busy && <LoaderCircle size={17} className="spin" />}Save password & enter dashboard</button>
      </form>
    </section>
  </main>;
}
