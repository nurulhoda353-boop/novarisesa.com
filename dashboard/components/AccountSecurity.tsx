"use client";

import { Check, Eye, EyeOff, KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";

type AccountUser = { full_name: string; email: string };

export function AccountSecurity({ user }: { user: AccountUser }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmation) {
      setError("The new passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/auth/change-password", { method: "POST", body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setNotice("Your password was changed successfully. Other active sessions were signed out.");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Could not change your password.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="account-security-page">
    <header className="page-head"><div><p className="eyebrow">Personal account</p><h1>My security</h1><p>Change your dashboard password whenever you need to. Your Super Admin cannot view this password.</p></div></header>
    <div className="account-security-grid">
      <form className="panel account-password-card" onSubmit={submit}>
        <header><i><KeyRound size={19} /></i><div><h2>Change password</h2><p>Use your current password to confirm this security change.</p></div></header>
        <label>Current password<input type={show ? "text" : "password"} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required minLength={8} /></label>
        <label>New password<div className="account-password-input"><input type={show ? "text" : "password"} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" required minLength={12} /><button type="button" onClick={() => setShow((value) => !value)} aria-label={show ? "Hide passwords" : "Show passwords"}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
        <label>Confirm new password<input type={show ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" required minLength={12} /></label>
        <div className="account-password-rules"><span className={newPassword.length >= 12 ? "met" : ""}><Check size={13} />At least 12 characters</span><span className={newPassword && newPassword === confirmation ? "met" : ""}><Check size={13} />Passwords match</span></div>
        {error && <p className="form-error">{error}</p>}
        {notice && <p className="account-success"><Check size={15} />{notice}</p>}
        <button className="primary-button" disabled={busy || newPassword.length < 12 || newPassword !== confirmation}>{busy && <LoaderCircle size={16} className="spin" />}Update password</button>
      </form>
      <aside className="panel account-security-summary"><i><ShieldCheck size={20} /></i><h2>{user.full_name}</h2><p>{user.email}</p><hr /><b>Password control</b><span>Your password is active until you decide to change it. A password update signs out your other devices for protection.</span></aside>
    </div>
  </section>;
}
