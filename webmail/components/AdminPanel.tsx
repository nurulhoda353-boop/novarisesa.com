"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ClipboardList,
  Copy,
  Eye,
  EyeOff,
  History,
  KeyRound,
  Mail,
  Pencil,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
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
  const [accounts, setAccounts] = useState<AdminAccountInfo[] | null>(null);
  const [hostingerMailboxes, setHostingerMailboxes] = useState<HostingerMailboxInfo[] | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  const navIcon: Record<Tab, typeof Mail> = { accounts: Mail, requests: ClipboardList, audit: History };

  return (
    <div className="admin-page-overlay">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <div className="admin-sidebar-brand-icon">
            <ShieldCheck size={18} />
          </div>
          <h1>Admin panel</h1>
        </div>
        <span className="admin-sidebar-sub">Signed in as {currentAccount.address}</span>
        <nav className="admin-sidebar-nav">
          {(["accounts", "requests", "audit"] as Tab[]).map((item) => {
            const Icon = navIcon[item];
            return (
              <button key={item} className={`admin-nav-item ${tab === item ? "active" : ""}`} onClick={() => setTab(item)}>
                <Icon size={16} />
                {labelFor(item)}
                {item === "requests" && !!pendingCount && <span className="admin-nav-badge">{pendingCount}</span>}
              </button>
            );
          })}
        </nav>
        <button className="admin-sidebar-close" onClick={onClose}>
          <ArrowLeft size={16} /> Back to Novamail
        </button>
      </aside>

      <div className="admin-main">
        <StatTiles accounts={accounts} hostingerMailboxes={hostingerMailboxes} pendingCount={pendingCount} />

        {tab === "accounts" && (
          <AccountsTab
            currentAddress={currentAccount.address}
            onSwitchedAccount={onSwitchedAccount}
            accounts={accounts}
            setAccounts={setAccounts}
            hostingerMailboxes={hostingerMailboxes}
            setHostingerMailboxes={setHostingerMailboxes}
          />
        )}
        {tab === "requests" && <RequestsTab onPendingCountChange={setPendingCount} />}
        {tab === "audit" && <AuditTab />}
      </div>
    </div>
  );
}

function labelFor(tab: Tab): string {
  return { accounts: "Mailboxes", requests: "Pending requests", audit: "Audit log" }[tab];
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: typeof Mail; title: string; subtitle?: string }) {
  return (
    <div className="admin-empty-state">
      <div className="admin-empty-icon">
        <Icon size={20} />
      </div>
      <strong>{title}</strong>
      {subtitle && <span>{subtitle}</span>}
    </div>
  );
}

function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div className="admin-skeleton-row" key={index}>
          <div className="admin-skeleton-block" style={{ width: 36, height: 36, borderRadius: "50%" }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="admin-skeleton-block" style={{ width: "38%", height: 12 }} />
            <div className="admin-skeleton-block" style={{ width: "58%", height: 10 }} />
          </div>
          <div className="admin-skeleton-block" style={{ width: 96, height: 30, borderRadius: "var(--r-md)" }} />
        </div>
      ))}
    </>
  );
}

function StatTiles({
  accounts,
  hostingerMailboxes,
  pendingCount,
}: {
  accounts: AdminAccountInfo[] | null;
  hostingerMailboxes: HostingerMailboxInfo[] | null;
  pendingCount: number | null;
}) {
  const totalMailboxes = (hostingerMailboxes ?? accounts ?? []).length;
  const adminCount = (accounts ?? []).filter((row) => row.role === "admin").length;
  const totalStorage = (hostingerMailboxes ?? []).reduce((sum, row) => sum + (row.storage_used ?? 0), 0);

  return (
    <div className="admin-stat-tiles">
      <div className="admin-stat-tile">
        <span className="stat-value">{totalMailboxes || "—"}</span>
        <span className="stat-label">Mailboxes</span>
      </div>
      <div className="admin-stat-tile accent">
        <span className="stat-value">{pendingCount ?? "—"}</span>
        <span className="stat-label">Pending requests</span>
      </div>
      <div className="admin-stat-tile">
        <span className="stat-value">{adminCount || "—"}</span>
        <span className="stat-label">Admins</span>
      </div>
      <div className="admin-stat-tile">
        <span className="stat-value">{totalStorage ? formatKb(totalStorage) : "—"}</span>
        <span className="stat-label">Storage used</span>
      </div>
    </div>
  );
}

function formatKb(kb: number): string {
  if (kb >= 1024 * 1024) return `${(kb / (1024 * 1024)).toFixed(1)} GB`;
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb} KB`;
}

function lastActiveLabel(iso: string | null): string {
  if (!iso) return "Never logged in";
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Active just now";
  if (minutes < 60) return `Active ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Active ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Active ${days}d ago`;
  return `Active ${new Date(iso).toLocaleDateString()}`;
}

function AccountsTab({
  currentAddress,
  onSwitchedAccount,
  accounts,
  setAccounts,
  hostingerMailboxes,
  setHostingerMailboxes,
}: {
  currentAddress: string;
  onSwitchedAccount: (account: MailAccount) => void;
  accounts: AdminAccountInfo[] | null;
  setAccounts: (rows: AdminAccountInfo[] | null) => void;
  hostingerMailboxes: HostingerMailboxInfo[] | null;
  setHostingerMailboxes: (rows: HostingerMailboxInfo[] | null) => void;
}) {
  const [editing, setEditing] = useState<AdminAccountInfo | null>(null);
  const [creating, setCreating] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const toast = useToast();
  // The initial page-load fetch (a live, multi-order Hostinger listing) can
  // still be in flight when a provision action fires its own reload() a few
  // seconds later - without this guard, the slower *older* response can
  // resolve last and overwrite the fresh one with stale "not connected"
  // data (exactly what made a just-provisioned mailbox reappear as
  // unconnected). Only the most recently *initiated* reload's results are
  // ever applied.
  const reloadSeq = useRef(0);

  function reload() {
    const seq = ++reloadSeq.current;
    api
      .adminListAccounts()
      .then((rows) => { if (seq === reloadSeq.current) setAccounts(rows); })
      .catch(() => { if (seq === reloadSeq.current) setAccounts([]); });
    api
      .adminHostingerMailboxes()
      .then((rows) => { if (seq === reloadSeq.current) setHostingerMailboxes(rows); })
      .catch(() => { if (seq === reloadSeq.current) setHostingerMailboxes([]); });
  }

  useEffect(reload, []);

  const usageByAddress = useMemo(() => {
    const map = new Map<string, HostingerMailboxInfo>();
    (hostingerMailboxes ?? []).forEach((row) => map.set(row.address.toLowerCase(), row));
    return map;
  }, [hostingerMailboxes]);

  const unconnected = (hostingerMailboxes ?? []).filter((row) => !row.connected);
  const q = query.trim().toLowerCase();
  const visibleAccounts = (accounts ?? []).filter(
    (account) => !q || account.address.toLowerCase().includes(q) || account.display_name.toLowerCase().includes(q)
  );

  function copyAddress(address: string) {
    navigator.clipboard?.writeText(address).then(() => {
      setCopied(address);
      setTimeout(() => setCopied((prev) => (prev === address ? null : prev)), 1500);
    });
  }

  async function handleProvision(address: string) {
    setProvisioning(address);
    try {
      await api.adminProvisionMailbox(address);
      toast.show(`${address} is now manageable from here`);
      reload();
    } catch {
      toast.show(`Could not bring ${address} under management`);
    } finally {
      setProvisioning(null);
    }
  }

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

  return (
    <div>
      <p className="form-hint" style={{ marginBottom: 16 }}>
        Switch into any mailbox instantly, no password needed — or reset its password, name, or photo directly.
      </p>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
        <div className="admin-search-box" style={{ marginBottom: 0, flex: 1 }}>
          <Search size={15} />
          <input placeholder="Search mailboxes…" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <button className="btn btn-primary sm" onClick={() => setCreating(true)}>
          <Plus size={14} /> New mailbox
        </button>
        <button className="btn btn-secondary sm" onClick={() => setConnectingGoogle(true)}>
          <Plus size={14} /> Connect Google mailbox
        </button>
      </div>
      {accounts === null && <SkeletonRows />}
      {accounts !== null &&
        visibleAccounts.map((account) => {
          const usage = usageByAddress.get(account.address.toLowerCase());
          const pct =
            usage && usage.storage_quota
              ? Math.min(100, Math.round(((usage.storage_used ?? 0) / usage.storage_quota) * 100))
              : null;
          const storageClass = pct === null ? "" : pct >= 85 ? "storage-high" : pct >= 60 ? "storage-mid" : "storage-low";
          return (
            <div className="admin-account-row" key={account.id}>
              <div className="avatar lg">
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
                  {account.provider === "google" && <span className="role-chip">Google</span>}
                </strong>
                <span>{account.address}</span>
                <div className="admin-account-meta">
                  {pct !== null && (
                    <>
                      <div className="admin-storage-bar">
                        <div className={storageClass} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="admin-storage-text">
                        {formatKb(usage?.storage_used ?? 0)} / {formatKb(usage?.storage_quota ?? 0)}
                      </span>
                    </>
                  )}
                  <span className="admin-lastactive-text">{lastActiveLabel(account.last_connected_at)}</span>
                </div>
              </div>
              <button className="icon-btn" title="Copy address" onClick={() => copyAddress(account.address)}>
                {copied === account.address ? <Check size={15} color="var(--success)" /> : <Copy size={15} />}
              </button>
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
          );
        })}
      {accounts !== null && visibleAccounts.length === 0 && (
        <EmptyState icon={Search} title={`No mailboxes match "${query}"`} subtitle="Try a different name or address." />
      )}
      {unconnected.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <p className="form-hint" style={{ marginBottom: 10 }}>
            Also on Hostinger, but never logged into Novamail yet — bring one under management directly
            (this resets its real Hostinger password, since there's no other way to get a known one):
          </p>
          {unconnected.map((row) => (
            <div className="admin-account-row" key={row.address}>
              <div className="avatar lg">{row.address.slice(0, 1).toUpperCase()}</div>
              <div className="grow">
                <span>{row.address}</span>
              </div>
              <button
                className="btn btn-primary sm"
                disabled={provisioning === row.address}
                onClick={() => handleProvision(row.address)}
              >
                {provisioning === row.address ? "Provisioning…" : "Bring under management"}
              </button>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <EditAccountModal account={editing} onClose={() => setEditing(null)} onSaved={reload} />
      )}
      {creating && (
        <CreateMailboxModal onClose={() => setCreating(false)} onCreated={reload} />
      )}
      {connectingGoogle && (
        <ConnectGoogleMailboxModal onClose={() => setConnectingGoogle(false)} onConnected={reload} />
      )}
    </div>
  );
}

function CreateMailboxModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [localPart, setLocalPart] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"admin" | "member">("member");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function create() {
    if (!localPart.trim() || password.length < 8) {
      toast.show("Enter a mailbox name and a password of at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      const account = await api.adminCreateMailbox(localPart.trim(), password, role);
      toast.show(`${account.address} created`);
      onCreated();
      onClose();
    } catch {
      toast.show("Could not create that mailbox — it may already exist");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>New mailbox</h2>
          <div className="spacer" />
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Mailbox name</label>
            <div className="form-row" style={{ alignItems: "center" }}>
              <input
                className="form-input"
                placeholder="e.g. sumonrayhan"
                value={localPart}
                onChange={(event) => setLocalPart(event.target.value)}
              />
              <span style={{ color: "var(--muted)", fontSize: 13 }}>@novarisesa.com</span>
            </div>
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="password-field">
              <input
                className="form-input"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>Role</label>
            <div className="form-row">
              <button
                className={`btn ${role === "member" ? "btn-primary" : "btn-secondary"} sm`}
                style={{ flex: 1 }}
                onClick={() => setRole("member")}
              >
                Member
              </button>
              <button
                className={`btn ${role === "admin" ? "btn-primary" : "btn-secondary"} sm`}
                style={{ flex: 1 }}
                onClick={() => setRole("admin")}
              >
                Admin
              </button>
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={create} disabled={saving}>
            {saving ? "Creating…" : "Create mailbox"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConnectGoogleMailboxModal({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) {
  const [address, setAddress] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"admin" | "member">("member");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function connect() {
    if (!address.trim() || appPassword.replace(/\s/g, "").length < 8) {
      toast.show("Enter the mailbox address and its 16-character app password");
      return;
    }
    setSaving(true);
    try {
      const account = await api.adminConnectGoogleMailbox(address.trim(), appPassword, role);
      toast.show(`${account.address} connected`);
      onConnected();
      onClose();
    } catch {
      toast.show("Could not connect — check the address and app password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>Connect Google mailbox</h2>
          <div className="spacer" />
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p className="form-hint" style={{ marginBottom: 16 }}>
            For a mailbox that already exists on Google Workspace, not Hostinger — its owner needs
            2-Step Verification on and an App Password generated first (myaccount.google.com → Security
            → App passwords).
          </p>
          <div className="form-group">
            <label>Mailbox address</label>
            <input
              className="form-input"
              placeholder="e.g. ceo@novarisesa.com"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </div>
          <div className="form-group">
            <label>App password</label>
            <div className="password-field">
              <input
                className="form-input"
                type={showPassword ? "text" : "password"}
                placeholder="abcd efgh ijkl mnop"
                value={appPassword}
                onChange={(event) => setAppPassword(event.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>Role</label>
            <div className="form-row">
              <button
                className={`btn ${role === "member" ? "btn-primary" : "btn-secondary"} sm`}
                style={{ flex: 1 }}
                onClick={() => setRole("member")}
              >
                Member
              </button>
              <button
                className={`btn ${role === "admin" ? "btn-primary" : "btn-secondary"} sm`}
                style={{ flex: 1 }}
                onClick={() => setRole("admin")}
              >
                Admin
              </button>
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={connect} disabled={saving}>
            {saving ? "Connecting…" : "Connect mailbox"}
          </button>
        </div>
      </div>
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
  const [role, setRole] = useState<"admin" | "member">((account.role as "admin" | "member") ?? "member");
  const [savingRole, setSavingRole] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [hostingerStep, setHostingerStep] = useState(0);
  const [hostingerPassword, setHostingerPassword] = useState("");
  const [showHostingerPassword, setShowHostingerPassword] = useState(false);
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

  async function toggleRole() {
    const next = role === "admin" ? "member" : "admin";
    setSavingRole(true);
    try {
      await api.adminSetRole(account.id, next);
      setRole(next);
      toast.show(next === "admin" ? `${account.address} is now an admin` : `${account.address} is now a member`);
      onSaved();
    } catch (error) {
      const message = error instanceof api.ApiError ? error.message : "Could not change the role";
      toast.show(message);
    } finally {
      setSavingRole(false);
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
      <div className="modal admin-edit-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div className="avatar lg">
            {account.avatar_url ? <img src={account.avatar_url} alt="" /> : account.display_name.slice(0, 1).toUpperCase() || account.address.slice(0, 1).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{account.address}</h2>
            {role === "admin" && (
              <span className="role-chip" style={{ marginTop: 4 }}>
                <Shield size={11} /> Admin
              </span>
            )}
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="modal-section">
            <div className="modal-section-title">
              <User size={13} /> Profile
            </div>
            <div className="form-row" style={{ alignItems: "flex-end" }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label>Display name</label>
                <input className="form-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
              </div>
              <button className="btn btn-secondary" onClick={saveProfile} disabled={saving}>
                Save
              </button>
            </div>
            <div className="form-row" style={{ marginTop: 10 }}>
              <label className="btn btn-secondary sm" style={{ cursor: "pointer", width: "fit-content" }}>
                <Pencil size={13} /> Change photo
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
              <button className="btn btn-secondary sm" style={{ width: "fit-content" }} onClick={toggleRole} disabled={savingRole}>
                <Shield size={13} /> {role === "admin" ? "Remove admin" : "Make admin"}
              </button>
            </div>
          </div>

          <div className="modal-section">
            <div className="modal-section-title">
              <KeyRound size={13} /> Novamail password
            </div>
            <div className="form-row">
              <div className="password-field" style={{ flex: 1 }}>
                <input
                  className="form-input"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  tabIndex={-1}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowNewPassword((value) => !value)}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button className="btn btn-primary" onClick={savePassword} disabled={saving}>
                Set password
              </button>
            </div>
          </div>

          <div className="modal-section modal-danger-zone">
            <div className="modal-section-title">
              <AlertTriangle size={13} />
              {account.provider === "google" ? "Google app password" : "Hostinger mailbox password"}
            </div>
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
            {account.provider === "google" && (
              <p className="form-hint" style={{ marginTop: 8 }}>
                This is managed by Google, not us — to change it, generate a new App Password from this
                mailbox's Google Account and reconnect it here.
              </p>
            )}

            {account.provider !== "google" && hostingerStep === 0 && (
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
                <div className="password-field">
                  <input
                    className="form-input"
                    type={showHostingerPassword ? "text" : "password"}
                    placeholder="New Hostinger password (8+ characters)"
                    value={hostingerPassword}
                    onChange={(event) => setHostingerPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    tabIndex={-1}
                    aria-label={showHostingerPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowHostingerPassword((value) => !value)}
                  >
                    {showHostingerPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
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
                  Step 2 of 3 — sure? {account.address}'s real mailbox password changes immediately.
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
                  Final confirmation — change it now?
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

function RequestsTab({ onPendingCountChange }: { onPendingCountChange: (count: number) => void }) {
  const [requests, setRequests] = useState<AdminChangeRequestInfo[] | null>(null);
  const toast = useToast();
  const reloadSeq = useRef(0);

  function reload() {
    const seq = ++reloadSeq.current;
    api
      .adminListChangeRequests("pending")
      .then((rows) => {
        if (seq !== reloadSeq.current) return;
        setRequests(rows);
        onPendingCountChange(rows.length);
      })
      .catch(() => { if (seq === reloadSeq.current) setRequests([]); });
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

  if (requests === null) return <SkeletonRows count={3} />;

  return (
    <div>
      {requests.length === 0 && (
        <EmptyState icon={ClipboardList} title="No pending requests" subtitle="Member requests for a new name, password, or photo show up here." />
      )}
      {requests.map((request) => (
        <div className="list-item-row" key={request.id}>
          <User size={16} />
          <div className="grow">
            <strong>{request.account_address}</strong>
            <span>
              {request.request_type === "delete_message"
                ? request.preview ?? requestLabel(request.request_type)
                : `${requestLabel(request.request_type)}${request.preview ? ` → "${request.preview}"` : ""}`}
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
  return {
    password: "wants a new password",
    display_name: "wants to change their name",
    avatar: "wants a new photo",
    delete_message: "wants a message deleted",
  }[type] ?? type;
}

function AuditTab() {
  const [entries, setEntries] = useState<AdminAuditLogEntry[] | null>(null);
  const [actorFilter, setActorFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    api.adminAuditLog(500).then(setEntries).catch(() => setEntries([]));
  }, []);

  const actors = useMemo(
    () => Array.from(new Set((entries ?? []).map((row) => row.actor_address).filter((v): v is string => !!v))).sort(),
    [entries]
  );
  const actions = useMemo(
    () => Array.from(new Set((entries ?? []).map((row) => row.action))).sort(),
    [entries]
  );

  const filtered = (entries ?? []).filter((entry) => {
    if (actorFilter !== "all" && entry.actor_address !== actorFilter) return false;
    if (actionFilter !== "all" && entry.action !== actionFilter) return false;
    const created = new Date(entry.created_at).getTime();
    if (fromDate && created < new Date(fromDate).getTime()) return false;
    if (toDate && created > new Date(toDate).getTime() + 24 * 60 * 60 * 1000) return false;
    return true;
  });

  if (entries === null) return <SkeletonRows count={5} />;

  return (
    <div>
      <div className="admin-audit-filters">
        <select value={actorFilter} onChange={(event) => setActorFilter(event.target.value)}>
          <option value="all">Everyone</option>
          {actors.map((address) => (
            <option key={address} value={address}>{address}</option>
          ))}
        </select>
        <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
          <option value="all">Every action</option>
          {actions.map((action) => (
            <option key={action} value={action}>{action.replace(/_/g, " ")}</option>
          ))}
        </select>
        <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
      </div>
      {filtered.length === 0 && (
        <EmptyState icon={History} title="No matching activity" subtitle="Try widening the actor, action, or date filters." />
      )}
      {filtered.map((entry) => (
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
