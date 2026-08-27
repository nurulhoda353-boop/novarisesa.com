"use client";

import {
  Activity,
  Check,
  Clock3,
  KeyRound,
  Laptop,
  LockKeyhole,
  MoreHorizontal,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserRoundCog,
  UserX,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";

type CurrentUser = {
  id: string;
  full_name: string;
  email: string;
  roles: string[];
};

type Role = {
  id: string;
  name: string;
  label: string;
  description: string;
  permissions: string[];
};

type TeamUser = {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
  role_label: string;
  permissions: string[];
  status: "active" | "suspended" | "password_change_required" | "deleted";
  is_active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
  password_changed_at: string | null;
  suspended_at: string | null;
  created_at: string;
  deleted_at: string | null;
  active_sessions: number;
};

type Session = {
  id: string;
  created_at: string;
  expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
};

type AuditItem = {
  id: string;
  action: string;
  actor_name: string;
  created_at: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
};

type TeamUserDetail = TeamUser & { sessions: Session[]; activity: AuditItem[] };
type Summary = { total: number; active: number; suspended: number; super_admins: number };
type DetailTab = "profile" | "access" | "security" | "activity";
type SensitiveMode = "password" | "sessions" | null;

const emptySummary: Summary = { total: 0, active: 0, suspended: 0, super_admins: 0 };
const permissionCopy: Record<string, string> = {
  "cms.view": "Dashboard access",
  "cms.publish": "Publish website content",
  "cms.manage_content": "Create and edit content",
  "cms.manage_media": "Manage media library",
  "cms.manage_inbox": "Manage enquiries",
  "cms.manage_settings": "Change site settings",
  "cms.manage_users": "Manage team and roles",
  "cms.manage_security": "Reset passwords and sessions",
  "cms.view_audit": "View security activity",
};

export function TeamAccessManager({ currentUser }: { currentUser: CurrentUser }) {
  const [items, setItems] = useState<TeamUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<TeamUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const canManageSuperAdmins = currentUser.roles.includes("super_admin");
  const manageableRoles = useMemo(
    () => roles.filter((role) => canManageSuperAdmins || role.name !== "super_admin"),
    [canManageSuperAdmins, roles],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [users, roleData] = await Promise.all([
        api<{ items: TeamUser[]; summary: Summary }>("/cms/users"),
        api<{ items: Role[] }>("/cms/roles"),
      ]);
      setItems(users.items);
      setSummary(users.summary);
      setRoles(roleData.items);
    } catch (error) {
      setNotice(message(error, "Could not load team access."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    document.body.style.overflow = creating || selected ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [creating, selected]);

  const openUser = useCallback(async (id: string) => {
    setSelected(id);
    setDetail(null);
    try {
      setDetail(await api<TeamUserDetail>(`/cms/users/${id}`));
    } catch (error) {
      setNotice(message(error, "Could not load this account."));
      setSelected(null);
    }
  }, []);

  const refreshSelected = useCallback(async () => {
    await load();
    if (selected) setDetail(await api<TeamUserDetail>(`/cms/users/${selected}`));
  }, [load, selected]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery = !needle || `${item.full_name} ${item.email} ${item.role_label}`.toLowerCase().includes(needle);
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesRole = roleFilter === "all" || item.roles.includes(roleFilter);
      return matchesQuery && matchesStatus && matchesRole;
    });
  }, [items, query, roleFilter, statusFilter]);

  return <>
    <header className="team-page-head">
      <div>
        <p className="eyebrow">Identity & access control</p>
        <h1>Team & access</h1>
        <p>{canManageSuperAdmins ? "Control every dashboard account, role and security action." : "Create and manage Admin and Editor accounts. Super Admin accounts remain protected."}</p>
      </div>
      <button className="primary-button team-create-button" onClick={() => setCreating(true)}><Plus size={16} />Add team member</button>
    </header>

    {notice && <div className="team-notice"><ShieldCheck size={15} /><span>{notice}</span><button onClick={() => setNotice("")}><X size={14} /></button></div>}

    <section className="team-summary-grid">
      <SummaryCard icon={Users} label="Team accounts" value={summary.total} detail="Non-deleted users" />
      <SummaryCard icon={UserCheck} label="Active access" value={summary.active} detail="Can sign in now" tone="green" />
      <SummaryCard icon={UserX} label="Suspended" value={summary.suspended} detail="Access fully blocked" tone="red" />
      <SummaryCard icon={ShieldCheck} label={canManageSuperAdmins ? "Super admins" : "Manageable roles"} value={canManageSuperAdmins ? summary.super_admins : manageableRoles.length} detail={canManageSuperAdmins ? "Protected system owners" : "Admin and Editor accounts"} tone="gold" />
    </section>

    <section className="team-role-strip">
      <div className="team-role-intro"><Shield size={18} /><div><b>Access architecture</b><span>Three fixed roles keep responsibilities clear and auditable.</span></div></div>
      <div className="team-role-miniatures">
        {manageableRoles.map((role) => <div key={role.name}><i className={role.name}>{role.name === "super_admin" ? "SA" : role.name[0].toUpperCase()}</i><span><b>{role.label}</b><small>{role.permissions.length} permissions</small></span></div>)}
      </div>
    </section>

    <section className="team-directory panel">
      <header>
        <div><h2>Account directory</h2><p>{filtered.length} of {items.length} accounts shown</p></div>
        <div className="team-filters">
          <label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" /></label>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filter by role"><option value="all">All roles</option>{manageableRoles.map((role) => <option key={role.name} value={role.name}>{role.label}</option>)}</select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status"><option value="all">All statuses</option><option value="active">Active</option><option value="password_change_required">Password change required</option><option value="suspended">Suspended</option><option value="deleted">Deleted</option></select>
        </div>
      </header>
      <div className="team-table">
        <div className="team-table-head"><span>Member</span><span>Role</span><span>Status</span><span>Last sign-in</span><span>Sessions</span><span /></div>
        {loading ? <div className="team-loading"><i /><i /><i /></div> : filtered.map((item) => (
          <button className="team-row" key={item.id} onClick={() => void openUser(item.id)}>
            <span className="team-member-cell"><i>{initials(item.full_name)}</i><span><b>{item.full_name}{item.id === currentUser.id && <em>You</em>}</b><small>{item.email}</small></span></span>
            <span><RolePill role={item.roles[0] ?? "editor"} label={item.role_label} /></span>
            <span><StatusPill status={item.status} /></span>
            <span className="team-muted-cell">{dateTime(item.last_login_at, "Never")}</span>
            <span className="team-session-cell"><Laptop size={14} />{item.active_sessions}</span>
            <span><MoreHorizontal size={17} /></span>
          </button>
        ))}
        {!loading && filtered.length === 0 && <div className="team-empty"><Users size={23} /><b>No matching accounts</b><span>Change the search or filters to see other team members.</span></div>}
      </div>
    </section>

    {creating && <CreateUserModal roles={manageableRoles} onClose={() => setCreating(false)} onCreated={async () => { setCreating(false); setNotice("Team member created. Their initial password is active immediately."); await load(); }} />}
    {selected && <UserDetailPanel currentUser={currentUser} detail={detail} roles={manageableRoles} canManageSecurity={canManageSuperAdmins} onClose={() => { setSelected(null); setDetail(null); }} onChanged={refreshSelected} onNotice={setNotice} />}
  </>;
}

function SummaryCard({ icon: Icon, label, value, detail, tone = "navy" }: { icon: typeof Users; label: string; value: number; detail: string; tone?: string }) {
  return <article className={`team-summary-card ${tone}`}><i><Icon size={18} /></i><span><small>{label}</small><b>{value}</b><em>{detail}</em></span></article>;
}

function RolePill({ role, label }: { role: string; label: string }) {
  return <em className={`team-role-pill ${role}`}><Shield size={11} />{label}</em>;
}

function StatusPill({ status }: { status: TeamUser["status"] }) {
  const label = { active: "Active", suspended: "Suspended", password_change_required: "Password change", deleted: "Deleted" }[status];
  return <em className={`team-status-pill ${status}`}><i />{label}</em>;
}

function CreateUserModal({ roles, onClose, onCreated }: { roles: Role[]; onClose: () => void; onCreated: () => Promise<void> }) {
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "editor", is_active: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selectedRole = roles.find((role) => role.name === form.role);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/cms/users", { method: "POST", body: JSON.stringify(form) });
      await onCreated();
    } catch (reason) {
      setError(message(reason, "Could not create this account."));
      setBusy(false);
    }
  }

  return <div className="team-modal-backdrop" onMouseDown={onClose}><form className="team-create-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
    <header><div><p className="eyebrow">New dashboard account</p><h2>Add team member</h2><span>Set their identity, permanent sign-in password and exact responsibility.</span></div><button type="button" onClick={onClose}><X size={19} /></button></header>
    <div className="team-modal-body">
      <section className="team-form-section"><div className="team-section-title"><i>1</i><span><b>Account identity</b><small>Use the team member&apos;s work information.</small></span></div><div className="team-form-grid"><label>Full name<input autoFocus value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} required minLength={2} /></label><label>Work email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required autoComplete="off" /></label><label className="full">Initial password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength={12} autoComplete="new-password" /><small>Use at least 12 characters. This is the member&apos;s active password; they can change it anytime from My security.</small></label></div></section>
      <section className="team-form-section"><div className="team-section-title"><i>2</i><span><b>Choose responsibility</b><small>Permissions are fixed to prevent accidental privilege drift.</small></span></div><div className="team-role-picker">{roles.map((role) => <label className={form.role === role.name ? "selected" : ""} key={role.name}><input type="radio" name="role" value={role.name} checked={form.role === role.name} onChange={() => setForm({ ...form, role: role.name })} /><i className={role.name}><Shield size={16} /></i><span><b>{role.label}</b><small>{role.description}</small></span>{form.role === role.name && <Check size={16} />}</label>)}</div>{selectedRole && <div className="team-permission-preview">{selectedRole.permissions.map((permission) => <span key={permission}><Check size={11} />{permissionCopy[permission] ?? permission}</span>)}</div>}</section>
      <section className="team-startup-options"><label><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /><span><b>Activate account now</b><small>Turn this off to prepare access without allowing sign-in yet.</small></span></label></section>
      {error && <p className="team-form-error">{error}</p>}
    </div>
    <footer><span><LockKeyhole size={13} />Account creation is recorded in the security audit.</span><div><button type="button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? "Creating…" : "Create account"}</button></div></footer>
  </form></div>;
}

function UserDetailPanel({ currentUser, detail, roles, canManageSecurity, onClose, onChanged, onNotice }: { currentUser: CurrentUser; detail: TeamUserDetail | null; roles: Role[]; canManageSecurity: boolean; onClose: () => void; onChanged: () => Promise<void>; onNotice: (value: string) => void }) {
  const [tab, setTab] = useState<DetailTab>("profile");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sensitive, setSensitive] = useState<SensitiveMode>(null);
  const isSelf = detail?.id === currentUser.id;
  const tabs = (canManageSecurity
    ? [['profile', 'Profile', UserRoundCog], ['access', 'Access', ShieldCheck], ['security', 'Security', KeyRound], ['activity', 'Activity', Activity]]
    : [['profile', 'Profile', UserRoundCog], ['access', 'Access', ShieldCheck], ['activity', 'Activity', Activity]]) as [DetailTab, string, typeof Users][];

  useEffect(() => { if (detail) setName(detail.full_name); }, [detail]);

  async function patch(payload: Record<string, unknown>, success: string) {
    if (!detail) return;
    setBusy(true); setError("");
    try {
      await api(`/cms/users/${detail.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      await onChanged(); onNotice(success);
    } catch (reason) { setError(message(reason, "Could not update this account.")); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!detail || !window.confirm(`Delete ${detail.full_name}'s dashboard account? This can be restored later.`)) return;
    setBusy(true);
    try { await api(`/cms/users/${detail.id}`, { method: "DELETE" }); onClose(); await onChanged(); onNotice("Account deleted and all active sessions revoked."); }
    catch (reason) { setError(message(reason, "Could not delete this account.")); setBusy(false); }
  }

  async function restore() {
    if (!detail) return;
    setBusy(true);
    try { await api(`/cms/users/${detail.id}/restore`, { method: "POST" }); await onChanged(); onNotice("Account restored in suspended state. Reset its password before activation."); }
    catch (reason) { setError(message(reason, "Could not restore this account.")); }
    finally { setBusy(false); }
  }

  return <div className="team-panel-backdrop" onMouseDown={onClose}><aside className="team-detail-panel" onMouseDown={(event) => event.stopPropagation()}>
    {detail ? <>
      <header><div className="team-panel-kicker"><p className="eyebrow">Account control</p><button onClick={onClose}><X size={19} /></button></div><div className="team-panel-identity"><i>{initials(detail.full_name)}</i><span><h2>{detail.full_name}</h2><p>{detail.email}</p><div><RolePill role={detail.roles[0] ?? "editor"} label={detail.role_label} /><StatusPill status={detail.status} /></div></span></div></header>
      <nav>{tabs.map(([key, label, Icon]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => { setTab(key); setError(""); }}><Icon size={15} />{label}</button>)}</nav>
      <div className="team-panel-body">
        {tab === "profile" && <div className="team-detail-stack"><section className="team-detail-card"><div className="team-section-title"><i><UserRoundCog size={15} /></i><span><b>Identity</b><small>The name shown across assignments and audit records.</small></span></div><label>Full name<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>Work email<input value={detail.email} disabled /><small>Email is the permanent sign-in identifier.</small></label><button className="primary-button compact" disabled={busy || name.trim().length < 2 || name === detail.full_name} onClick={() => void patch({ full_name: name.trim() }, "Profile name updated.")}>Save profile</button></section><section className="team-facts"><div><span>Created</span><b>{dateTime(detail.created_at)}</b></div><div><span>Last sign-in</span><b>{dateTime(detail.last_login_at, "Never signed in")}</b></div><div><span>Password changed</span><b>{dateTime(detail.password_changed_at, "Not recorded")}</b></div><div><span>Active sessions</span><b>{detail.active_sessions}</b></div></section></div>}
        {tab === "access" && <div className="team-detail-stack"><section className="team-detail-card"><div className="team-section-title"><i><ShieldCheck size={15} /></i><span><b>Role & permissions</b><small>Changing a role signs the member out of every device.</small></span></div><div className="team-role-picker compact">{roles.map((role) => <button className={detail.roles.includes(role.name) ? "selected" : ""} key={role.name} disabled={busy || isSelf || detail.status === "deleted"} onClick={() => void patch({ role: role.name }, `Role changed to ${role.label}.`)}><i className={role.name}><Shield size={15} /></i><span><b>{role.label}</b><small>{role.description}</small></span>{detail.roles.includes(role.name) && <Check size={15} />}</button>)}</div>{isSelf && <p className="team-inline-note">For safety, you cannot change your own role.</p>}</section><section className="team-detail-card"><div className="team-section-title"><i><UserCheck size={15} /></i><span><b>Account state</b><small>Suspension immediately blocks API and dashboard access.</small></span></div>{detail.status === "deleted" ? <button className="team-safe-action" disabled={busy} onClick={() => void restore()}><UserCheck size={15} /><span><b>Restore account</b><small>Restores it as suspended and requires a password reset.</small></span></button> : <button className={detail.is_active ? "team-danger-action" : "team-safe-action"} disabled={busy || isSelf} onClick={() => void patch({ is_active: !detail.is_active }, detail.is_active ? "Account suspended and sessions revoked." : "Account reactivated.")}>{detail.is_active ? <UserX size={15} /> : <UserCheck size={15} />}<span><b>{detail.is_active ? "Suspend dashboard access" : "Reactivate dashboard access"}</b><small>{detail.is_active ? "The user is signed out immediately." : "The user can sign in again."}</small></span></button>}</section>{detail.status !== "deleted" && !isSelf && <button className="team-delete-link" disabled={busy} onClick={() => void remove()}><Trash2 size={14} />Delete account</button>}</div>}
        {tab === "security" && <div className="team-detail-stack"><section className="team-security-hero"><LockKeyhole size={20} /><div><b>{detail.must_change_password ? "Password change is required" : "Password policy is satisfied"}</b><span>{detail.must_change_password ? "Only the password-change screen is available after sign-in." : "This user can access the permissions assigned to their role."}</span></div></section><section className="team-security-actions"><button disabled={detail.status === "deleted" || isSelf} onClick={() => setSensitive("password")}><KeyRound size={17} /><span><b>{isSelf ? "Use your password-change screen" : "Set temporary password"}</b><small>{isSelf ? "Administrative reset is disabled for your own account." : "Revoke sessions and require a new private password."}</small></span></button><button disabled={detail.status === "deleted" || detail.active_sessions === 0} onClick={() => setSensitive("sessions")}><Laptop size={17} /><span><b>Revoke all sessions</b><small>Sign out {detail.active_sessions} active browser session{detail.active_sessions === 1 ? "" : "s"}.</small></span></button></section><section className="team-session-list"><header><b>Active sessions</b><span>{detail.sessions.length}</span></header>{detail.sessions.map((session) => <article key={session.id}><i><Laptop size={15} /></i><span><b>{deviceName(session.user_agent)}</b><small>{session.ip_address ?? "IP unavailable"} · Started {dateTime(session.created_at)}</small></span><em>Expires {dateTime(session.expires_at)}</em></article>)}{detail.sessions.length === 0 && <p>No active dashboard sessions.</p>}</section></div>}
        {tab === "activity" && <section className="team-activity-list"><header><div><b>Security & account timeline</b><span>Immutable administrative and authentication events</span></div><em>{detail.activity.length} events</em></header>{detail.activity.map((entry) => <article key={entry.id}><i><Clock3 size={14} /></i><span><b>{activityLabel(entry.action)}</b><small>{entry.actor_name} · {dateTime(entry.created_at)}</small></span></article>)}{detail.activity.length === 0 && <p>No account activity has been recorded yet.</p>}</section>}
        {error && <p className="team-form-error">{error}</p>}
      </div>
      <footer><span><ShieldCheck size={13} />Every change is written to the audit trail.</span><button onClick={onClose}>Close</button></footer>
      {sensitive && <SensitiveDialog mode={sensitive} user={detail} onClose={() => setSensitive(null)} onDone={async (copy) => { setSensitive(null); await onChanged(); onNotice(copy); }} />}
    </> : <div className="team-panel-loading"><i /><i /><i /></div>}
  </aside></div>;
}

function SensitiveDialog({ mode, user, onClose, onDone }: { mode: Exclude<SensitiveMode, null>; user: TeamUserDetail; onClose: () => void; onDone: (copy: string) => Promise<void> }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (mode === "password") {
        await api(`/cms/users/${user.id}/reset-password`, { method: "POST", body: JSON.stringify({ current_password: currentPassword, new_password: newPassword, require_password_change: true }) });
        await onDone("Temporary password set. All sessions were revoked and a private password is required at next sign-in.");
      } else {
        const result = await api<{ sessions_revoked: number }>(`/cms/users/${user.id}/revoke-sessions`, { method: "POST", body: JSON.stringify({ current_password: currentPassword }) });
        await onDone(`${result.sessions_revoked} active session${result.sessions_revoked === 1 ? "" : "s"} revoked.`);
      }
    } catch (reason) { setError(message(reason, "Security action failed.")); setBusy(false); }
  }
  return <div className="team-sensitive-backdrop" onMouseDown={onClose}><form className="team-sensitive-dialog" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><header><i><LockKeyhole size={19} /></i><div><b>{mode === "password" ? "Set temporary password" : "Revoke active sessions"}</b><span>{user.full_name}</span></div><button type="button" onClick={onClose}><X size={17} /></button></header><p>{mode === "password" ? "The member will be signed out everywhere and must choose a new private password at their next sign-in." : "This signs the member out of every browser. Confirm the action with your own password."}</p>{mode === "password" && <label>New temporary password<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={12} required autoComplete="new-password" /><small>At least 12 characters.</small></label>}<label>Your Super Admin password<input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} minLength={8} required autoComplete="current-password" /></label>{error && <p className="team-form-error">{error}</p>}<footer><button type="button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? "Confirming…" : "Confirm securely"}</button></footer></form></div>;
}

function message(error: unknown, fallback: string) {
  return error instanceof ApiError || error instanceof Error ? error.message : fallback;
}
function initials(value: string) { return value.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase(); }
function dateTime(value: string | null, fallback = "—") { return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : fallback; }
function deviceName(agent: string | null) { if (!agent) return "Unknown browser"; if (agent.includes("Edg/")) return "Microsoft Edge"; if (agent.includes("Chrome/")) return "Google Chrome"; if (agent.includes("Firefox/")) return "Mozilla Firefox"; if (agent.includes("Safari/")) return "Safari"; return "Dashboard session"; }
function activityLabel(action: string) { return ({ "auth.login": "Signed in", "auth.password_changed": "Changed password", "cms.user_created": "Account created", "cms.user_updated": "Account access updated", "cms.user_password_reset": "Temporary password set", "cms.user_sessions_revoked": "Sessions revoked", "cms.user_deleted": "Account deleted", "cms.user_restored": "Account restored" } as Record<string, string>)[action] ?? action.replace(/[._]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
