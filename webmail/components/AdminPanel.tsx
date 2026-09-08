"use client";

import { useEffect, useState } from "react";
import { Check, Eye, Pencil, Shield, ShieldCheck, User, X } from "lucide-react";
import * as api from "@/lib/api";
import type {
  AdminAccountInfo,
  AdminAuditLogEntry,
  AdminChangeRequestInfo,
  HostingerMailboxInfo,
  MailAccount,
} from "@/lib/types";
import { useToast } from "@/lib/toast";

type Tab = "accounts" | "requests" | "audit";

/**
 * A separate full-page view (not another Settings tab) for the one admin
 * mailbox to control every other mailbox: switch into one without its
 * password, reset a password/name/photo directly, review pending member
 * change-requests, and see every mailbox's audit trail.
 */
export function AdminPanel({
  currentAccount,
  onClose,
  onSwitchedAccount,
}: {
  currentAccount: MailAccount;
  onClose: () => void;
  onSwitchedAccount: (account: MailAccount) => void;
}) {
  const [tab, setTab] = useState<Tab>("accounts");

  return (
    <div className="admin-page-overlay">
      <div className="admin-page">
        <div className="admin-page-head">
          <ShieldCheck size={20} />
          <h1>Admin panel</h1>
          <span className="admin-page-sub">Signed in as {currentAccount.address}</span>
          <div className="spacer" />
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-tabs" style={{ padding: "0 28px" }}>
          {(["accounts", "requests", "audit"] as Tab[]).map((item) => (
            <button key={item} className={`modal-tab ${tab === item ? "active" : ""}`} onClick={() => setTab(item)}>
              {labelFor(item)}
            </button>
          ))}
        </div>
        <div className="admin-page-body">
          {tab === "accounts" && (
            <AccountsTab currentAddress={currentAccount.address} onSwitchedAccount={onSwitchedAccount} />
          )}
          {tab === "requests" && <RequestsTab />}
          {tab === "audit" && <AuditTab />}
        </div>
      </div>
    </div>
  );
}

function labelFor(tab: Tab): string {
  return { accounts: "Mailboxes", requests: "Pending requests", audit: "Audit log" }[tab];
}

function AccountsTab({
  currentAddress,
  onSwitchedAccount,
}: {
  currentAddress: string;
  onSwitchedAccount: (account: MailAccount) => void;
}) {
  const [accounts, setAccounts] = useState<AdminAccountInfo[] | null>(null);
  const [hostingerMailboxes, setHostingerMailboxes] = useState<HostingerMailboxInfo[] | null>(null);
  const [editing, setEditing] = useState<AdminAccountInfo | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const toast = useToast();

  function reload() {
    api.adminListAccounts().then(setAccounts).catch(() => setAccounts([]));
    api.adminHostingerMailboxes().then(setHostingerMailboxes).catch(() => setHostingerMailboxes([]));
  }

  useEffect(reload, []);

  const unconnected = (hostingerMailboxes ?? []).filter((row) => !row.connected);

  async function handleSwitch(account: AdminAccountInfo) {
    setSwitching(account.id);
    try {
      const target = await api.adminSwitchToAccount(account.id);
      onSwitchedAccount(target);
      toast.show(`Switched to ${target.address}`);
    } catch {
      toast.show("Could not switch to that mailbox");
    } finally {
      setSwitching(null);
    }
  }

  if (accounts === null) return <p>Loading…</p>;

  return (
    <div>
      <p className="form-hint" style={{ marginBottom: 16 }}>
        Switch into any mailbox instantly, no password needed — or reset its password, name, or photo directly.
      </p>
      {accounts.map((account) => (
        <div className="admin-account-row" key={account.id}>
          <div className="avatar">
            {account.avatar_url ? <img src={account.avatar_url} alt="" /> : account.display_name.slice(0, 1).toUpperCase()}
          </div>
          <div className="grow">
            <strong>
              {account.display_name || account.address}
              {account.role === "admin" && (
                <span className="role-chip">
                  <Shield size={11} /> Admin
                </span>
              )}
            </strong>
            <span>{account.address}</span>
          </div>
          <button className="btn btn-secondary sm" onClick={() => setEditing(account)}>
            <Pencil size={14} /> Edit
          </button>
          {account.address !== currentAddress && (
            <button
              className="btn btn-primary sm"
              disabled={switching === account.id}
              onClick={() => handleSwitch(account)}
            >
              {switching === account.id ? "Switching…" : "Switch to this mailbox"}
            </button>
          )}
        </div>
      ))}
      {unconnected.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <p className="form-hint" style={{ marginBottom: 10 }}>
            Also on Hostinger, but never logged into Novamail yet (no Novamail access to manage from here
            until they do):
          </p>
          {unconnected.map((row) => (
            <div className="admin-account-row" key={row.address}>
              <div className="avatar">{row.address.slice(0, 1).toUpperCase()}</div>
              <div className="grow">
                <span>{row.address}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <EditAccountModal account={editing} onClose={() => setEditing(null)} onSaved={reload} />
      )}
    </div>
  );
}

function EditAccountModal({
  account,
  onClose,
  onSaved,
}: {
  account: AdminAccountInfo;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [displayName, setDisplayName] = useState(account.display_name);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [hostingerStep, setHostingerStep] = useState(0);
  const [hostingerPassword, setHostingerPassword] = useState("");
  const toast = useToast();

  async function saveProfile() {
    setSaving(true);
    try {
      await api.adminSetProfile(account.id, displayName);
      toast.show("Name updated");
      onSaved();
    } catch {
      toast.show("Could not update the name");
    } finally {
      setSaving(false);
    }
  }

  async function saveAvatar(file: File) {
    setSaving(true);
    try {
      await api.adminSetAvatar(account.id, file);
      toast.show("Photo updated");
      onSaved();
    } catch {
      toast.show("Could not update the photo");
    } finally {
      setSaving(false);
    }
  }

  async function savePassword() {
    if (newPassword.length < 8) {
      toast.show("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      await api.adminSetPassword(account.id, newPassword);
      toast.show(`Novamail password changed — ${account.address} is signed out everywhere`);
      setNewPassword("");
    } catch {
      toast.show("Could not change the password");
    } finally {
      setSaving(false);
    }
  }

  async function revealHostingerPassword() {
    setSaving(true);
    try {
      const result = await api.adminViewHostingerPassword(account.id);
      setRevealedPassword(result.password);
    } catch {
      toast.show("Could not fetch the Hostinger password");
    } finally {
      setSaving(false);
    }
  }

  async function confirmHostingerPasswordChange() {
    if (hostingerPassword.length < 8) {
      toast.show("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      await api.adminSetHostingerPassword(account.id, hostingerPassword);
      toast.show(`Real Hostinger password changed for ${account.address}`);
      setHostingerPassword("");
      setHostingerStep(0);
      setRevealedPassword(null);
    } catch {
      toast.show("Could not change the Hostinger password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>{account.address}</h2>
          <div className="spacer" />
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Display name</label>
            <div className="form-row">
              <input className="form-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
              <button className="btn btn-secondary" onClick={saveProfile} disabled={saving}>
                Save
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>Photo</label>
            <label className="btn btn-secondary sm" style={{ cursor: "pointer", width: "fit-content" }}>
              Choose photo
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) saveAvatar(file);
                }}
              />
            </label>
          </div>
          <div className="form-group">
            <label>Novamail password</label>
            <div className="form-row">
              <input
                className="form-input"
                type="password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <button className="btn btn-primary" onClick={savePassword} disabled={saving}>
                Set password
              </button>
            </div>
            <p className="form-hint">
              Only changes how {account.address} logs into Novamail — signs them out of every device
              immediately. The real Hostinger mailbox password is untouched.
            </p>
          </div>

          <div className="form-group" style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
            <label>Real Hostinger mailbox password</label>
            {revealedPassword ? (
              <div className="form-row">
                <input className="form-input" readOnly value={revealedPassword} />
                <button className="btn btn-secondary sm" onClick={() => setRevealedPassword(null)}>
                  Hide
                </button>
              </div>
            ) : (
              <button className="btn btn-secondary sm" onClick={revealHostingerPassword} disabled={saving}>
                <Eye size={14} /> Show current password
              </button>
            )}
            <p className="form-hint" style={{ marginTop: 8 }}>
              This is the account's actual mailbox password (IMAP/SMTP) — separate from its Novamail login.
            </p>

            {hostingerStep === 0 && (
              <button
                className="btn btn-danger sm"
                style={{ marginTop: 10 }}
                onClick={() => setHostingerStep(1)}
              >
                Change the real Hostinger password…
              </button>
            )}
            {hostingerStep === 1 && (
              <div style={{ marginTop: 10 }}>
                <p className="form-hint" style={{ color: "var(--danger)", marginBottom: 8 }}>
                  ⚠ This changes the actual mailbox password used for sending/receiving mail — rarely
                  needed. {account.address}'s Novamail login is unaffected.
                </p>
                <input
                  className="form-input"
                  type="password"
                  placeholder="New Hostinger password (8+ characters)"
                  value={hostingerPassword}
                  onChange={(event) => setHostingerPassword(event.target.value)}
                />
                <div className="form-row" style={{ marginTop: 8 }}>
                  <button className="btn btn-secondary sm" onClick={() => setHostingerStep(0)}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-danger sm"
                    disabled={hostingerPassword.length < 8}
                    onClick={() => setHostingerStep(2)}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}
            {hostingerStep === 2 && (
              <div style={{ marginTop: 10 }}>
                <p className="form-hint" style={{ color: "var(--danger)", marginBottom: 8 }}>
                  Are you sure? This is step 2 of 3 — the real mailbox password for {account.address} will
                  change immediately.
                </p>
                <div className="form-row">
                  <button className="btn btn-secondary sm" onClick={() => setHostingerStep(0)}>
                    Cancel
                  </button>
                  <button className="btn btn-danger sm" onClick={() => setHostingerStep(3)}>
                    Yes, I'm sure
                  </button>
                </div>
              </div>
            )}
            {hostingerStep === 3 && (
              <div style={{ marginTop: 10 }}>
                <p className="form-hint" style={{ color: "var(--danger)", marginBottom: 8 }}>
                  Final confirmation (step 3 of 3) — change {account.address}'s real Hostinger password now?
                </p>
                <div className="form-row">
                  <button className="btn btn-secondary sm" onClick={() => setHostingerStep(0)}>
                    Cancel
                  </button>
                  <button className="btn btn-danger sm" disabled={saving} onClick={confirmHostingerPasswordChange}>
                    Change it now
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestsTab() {
  const [requests, setRequests] = useState<AdminChangeRequestInfo[] | null>(null);
  const toast = useToast();

  function reload() {
    api.adminListChangeRequests("pending").then(setRequests).catch(() => setRequests([]));
  }

  useEffect(reload, []);

  async function approve(id: string) {
    try {
      await api.adminApproveChangeRequest(id);
      toast.show("Approved");
      reload();
    } catch {
      toast.show("Could not approve that request");
    }
  }

  async function reject(id: string) {
    try {
      await api.adminRejectChangeRequest(id);
      toast.show("Rejected");
      reload();
    } catch {
      toast.show("Could not reject that request");
    }
  }

  if (requests === null) return <p>Loading…</p>;

  return (
    <div>
      {requests.length === 0 && <p className="form-hint">No pending requests.</p>}
      {requests.map((request) => (
        <div className="list-item-row" key={request.id}>
          <User size={16} />
          <div className="grow">
            <strong>{request.account_address}</strong>
            <span>
              {requestLabel(request.request_type)}
              {request.preview ? ` → "${request.preview}"` : ""}
            </span>
          </div>
          <button className="icon-btn" onClick={() => approve(request.id)} title="Approve">
            <Check size={18} color="var(--success)" />
          </button>
          <button className="icon-btn" onClick={() => reject(request.id)} title="Reject">
            <X size={18} color="var(--danger)" />
          </button>
        </div>
      ))}
    </div>
  );
}

function requestLabel(type: string): string {
  return { password: "wants a new password", display_name: "wants to change their name", avatar: "wants a new photo" }[
    type
  ] ?? type;
}

function AuditTab() {
  const [entries, setEntries] = useState<AdminAuditLogEntry[] | null>(null);

  useEffect(() => {
    api.adminAuditLog(200).then(setEntries).catch(() => setEntries([]));
  }, []);

  if (entries === null) return <p>Loading…</p>;

  return (
    <div>
      {entries.length === 0 && <p className="form-hint">No activity yet.</p>}
      {entries.map((entry) => (
        <div className="list-item-row" key={entry.id}>
          <div className="grow">
            <strong>{describeAction(entry)}</strong>
            <span>{new Date(entry.created_at).toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function describeAction(entry: AdminAuditLogEntry): string {
  const actor = entry.actor_address ?? "Someone";
  switch (entry.action) {
    case "switched_in":
      return `${actor} switched into ${entry.target_address}`;
    case "password_reset":
      return `${actor} reset the password for ${entry.target_address}`;
    case "profile_changed":
      return `${actor} changed ${entry.target_address}'s ${entry.detail ?? "profile"}`;
    case "profile_change_requested":
      return `${entry.target_address ?? actor} requested a ${entry.detail ?? "profile"} change`;
    case "change_request_approved":
      return `${actor} approved ${entry.target_address}'s ${entry.detail ?? "request"}`;
    case "change_request_rejected":
      return `${actor} rejected ${entry.target_address}'s ${entry.detail ?? "request"}`;
    default:
      return `${actor} — ${entry.action}${entry.target_address ? ` (${entry.target_address})` : ""}`;
  }
}
