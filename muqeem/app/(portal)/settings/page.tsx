"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, LogOut, Plus, RotateCcw, Save, Search, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import { useAuth } from "@/components/Auth";
import { ApiError, team } from "@/lib/api";
import { DEFAULT_KEYS, loadDefaults, saveDefaults, type DefaultKey, type EntryDefaults } from "@/lib/defaults";
import { usePrefs, type Lang } from "@/lib/prefs";
import type { TeamOverview, TeamRole, TeamUser } from "@/lib/types";

type Tab = "profile" | "team" | "roles" | "defaults" | "appearance";

const DEFAULT_LABELS: Record<DefaultKey, string> = {
  operator_id: "Operator ID",
  location: "Location",
  religion: "Religion",
  marital_status: "Marital status",
  entry_location: "Entry location",
  passport_issue_location: "Passport issue location",
  iqama_issue_location: "Iqama issue location",
  employer_number: "Employer number",
  employer_name: "Employer name (Arabic)",
};

function strongPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => chars[n % chars.length]).join("") + "!7";
}

function when(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "Never";
}

function PasswordField({ value, onChange, label, required = true }: { value: string; onChange: (v: string) => void; label: string; required?: boolean }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <label className="field">
      <span>{label}</span>
      <div className="with-btn">
        <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} minLength={required ? 8 : undefined} autoComplete="new-password" required={required} />
        <button type="button" className="btn" title="Show / hide" onClick={() => setShow((v) => !v)}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
        <button type="button" className="btn" title="Generate a strong password" onClick={() => { onChange(strongPassword()); setShow(true); }}>
          <KeyRound size={16} />
        </button>
        <button
          type="button"
          className="btn"
          title="Copy"
          disabled={!value}
          onClick={() => {
            void navigator.clipboard.writeText(value).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
    </label>
  );
}

function RoleSelect({ roles, value, onChange }: { roles: TeamRole[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="role-pick">
      {roles.map((role) => (
        <button
          type="button"
          key={role.name}
          className={`role-card${value === role.name ? " on" : ""}`}
          disabled={!role.assignable}
          onClick={() => onChange(role.name)}
          title={role.assignable ? role.description : "Only a Super Admin can give this role"}
        >
          <b>{role.label}</b>
          <span>{role.description.replace(/^Muqeem Control [A-Za-z ]+: /, "")}</span>
        </button>
      ))}
    </div>
  );
}

function AddUserModal({ roles, onClose, onDone }: { roles: TeamRole[]; onClose: () => void; onDone: (message: string) => void }) {
  const firstAssignable = roles.filter((r) => r.assignable).at(-1)?.name ?? "muqeem_editor";
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: firstAssignable, is_active: true });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (form.password && form.password.length < 8) throw new ApiError(422, "Password must be at least 8 characters");
      const created = await team.create({ ...form, email: form.email.trim() });
      onDone(created.existing_account ? `${created.full_name} now has Muqeem access as ${created.role_label}. Their password was not changed.` : `${created.full_name} can now sign in as ${created.role_label}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add the user");
      setBusy(false);
    }
  }

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <form className="modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <h3>Add user</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="alert error" style={{ margin: 0 }}>{error}</div>}
          <label className="field">
            <span>Full name</span>
            <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required minLength={2} autoFocus />
          </label>
          <label className="field">
            <span>Email (they sign in with this)</span>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="off" />
          </label>
          <PasswordField label="Password (new people only, at least 8 characters)" value={form.password} onChange={(password) => setForm({ ...form, password })} required={false} />
          <div className="field">
            <span>Role</span>
            <RoleSelect roles={roles} value={form.role} onChange={(role) => setForm({ ...form, role })} />
          </div>
          <label className="toggle">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active immediately
          </label>
        </div>
        <div className="form-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>
            <UserPlus size={16} /> {busy ? "Adding…" : "Add user"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ManageModal({ user, roles, isSelf, onClose, onChanged }: { user: TeamUser; roles: TeamRole[]; isSelf: boolean; onClose: () => void; onChanged: (message: string) => void }) {
  const [name, setName] = useState(user.full_name);
  const [role, setRole] = useState(user.role ?? "muqeem_editor");
  const [active, setActive] = useState(user.status === "active");
  const [newPassword, setNewPassword] = useState("");
  const [myPassword, setMyPassword] = useState("");
  const [activity, setActivity] = useState<{ id: string; action: string; at: string }[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const removed = user.status === "deleted";

  useEffect(() => {
    team.activity(user.id).then(setActivity).catch(() => setActivity([]));
  }, [user.id]);

  async function run<T>(label: string, job: () => Promise<T>, done: string) {
    setBusy(label);
    setError("");
    try {
      await job();
      onChanged(done);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That did not work");
      setBusy("");
    }
  }

  const dirty = name.trim() !== user.full_name || role !== user.role || active !== (user.status === "active");

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>{user.full_name}</h3>
            <div className="cell-sub">{user.email}</div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="alert error" style={{ margin: 0 }}>{error}</div>}
          {isSelf && <div className="alert warn" style={{ margin: 0 }}>This is you. You cannot change your own role or suspend yourself.</div>}

          {removed ? (
            <button className="btn" disabled={!!busy} onClick={() => void run("restore", () => team.restore(user.id), "User restored (suspended until you activate them).")}>
              <RotateCcw size={16} /> Restore this user
            </button>
          ) : (
            <>
              {user.dashboard && (
                <div className="alert warn" style={{ margin: 0 }}>
                  Dashboard team member. You can set their Muqeem level here. Their name, password, suspension and removal are managed in the NOVARISE Control Center.
                </div>
              )}
              <label className="field">
                <span>Full name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} disabled={user.dashboard} />
              </label>
              <div className="field">
                <span>Role</span>
                <RoleSelect roles={isSelf ? roles.filter((r) => r.name === user.role) : roles} value={role} onChange={setRole} />
              </div>
              <label className="toggle">
                <input type="checkbox" checked={active} disabled={isSelf || user.dashboard} onChange={(e) => setActive(e.target.checked)} /> Account active (can sign in)
              </label>
              <div>
                <button
                  className="btn primary"
                  disabled={!dirty || !!busy}
                  onClick={() => void run("save", () => team.update(user.id, { full_name: name.trim(), role, is_active: active }), "Changes saved.")}
                >
                  <Save size={16} /> {busy === "save" ? "Saving…" : "Save changes"}
                </button>
              </div>

              {!isSelf && user.dashboard && user.source === "override" && (
                <button
                  className="btn"
                  disabled={!!busy}
                  onClick={() => void run("fallback", () => team.resetAccess(user.id), "Back to the level their dashboard role gives.")}
                >
                  <RotateCcw size={16} /> Use their dashboard level again
                </button>
              )}

              {!isSelf && !user.dashboard && (
                <fieldset className="danger-zone">
                  <legend>Password &amp; sessions</legend>
                  <PasswordField label="New password for this person" value={newPassword} onChange={setNewPassword} />
                  <label className="field">
                    <span>Your own password (to confirm)</span>
                    <input type="password" value={myPassword} onChange={(e) => setMyPassword(e.target.value)} autoComplete="current-password" />
                  </label>
                  <div className="detail-bar">
                    <button
                      className="btn"
                      disabled={!!busy || newPassword.length < 8 || !myPassword}
                      onClick={() => void run("reset", () => team.resetPassword(user.id, myPassword, newPassword), "Password changed and the person was signed out everywhere.")}
                    >
                      <KeyRound size={16} /> Set new password
                    </button>
                    <button
                      className="btn"
                      disabled={!!busy || !myPassword}
                      onClick={() => void run("revoke", () => team.revokeSessions(user.id, myPassword), "Signed out everywhere.")}
                    >
                      <LogOut size={16} /> Sign out everywhere ({user.active_sessions})
                    </button>
                    <button
                      className="btn danger"
                      disabled={!!busy}
                      onClick={() => {
                        if (window.confirm(`Remove ${user.full_name}? They lose access immediately; you can restore them later.`)) void run("remove", () => team.remove(user.id), "User removed.");
                      }}
                    >
                      <Trash2 size={16} /> Remove
                    </button>
                  </div>
                </fieldset>
              )}
            </>
          )}

          <div>
            <div className="group-title">Recent Muqeem activity</div>
            {activity === null ? (
              <div className="skeleton" style={{ height: 60 }} />
            ) : activity.length === 0 ? (
              <p className="cell-sub">Nothing yet. Last sign-in: {when(user.last_login_at)}</p>
            ) : (
              <ul className="activity">
                {activity.slice(0, 8).map((entry) => (
                  <li key={entry.id}>
                    <b>{entry.action.replace("muqeem.", "").replace(/_/g, " ")}</b>
                    <span>{when(entry.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamTab({ data, reload }: { data: TeamOverview; reload: () => Promise<void> }) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<TeamUser | null>(null);
  const [notice, setNotice] = useState("");

  const rows = useMemo(() => {
    const text = query.trim().toLowerCase();
    return data.users.filter((u) => !text || u.full_name.toLowerCase().includes(text) || u.email.toLowerCase().includes(text));
  }, [data.users, query]);

  async function changed(message: string) {
    setNotice(message);
    setAdding(false);
    setOpen(null);
    await reload();
  }

  return (
    <div className="panel">
      {notice && <div className="alert ok" style={{ margin: 16 }}>{notice}</div>}
      <div className="toolbar">
        <div className="search">
          <Search size={16} />
          <input placeholder="Search name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <span className="count">{rows.length} people</span>
        <button className="btn primary" onClick={() => setAdding(true)}>
          <Plus size={16} /> Add user
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last sign-in</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} onClick={() => u.editable && setOpen(u)} style={{ cursor: u.editable ? "pointer" : "default" }}>
                <td>
                  <div className="cell-name">{u.full_name}</div>
                  <div className="cell-sub">{u.email}</div>
                </td>
                <td>
                  <span className={`role-badge r-${u.role ?? "dash"}`}>{u.role_label}</span>
                  {u.dashboard && <div className="cell-sub">Dashboard team{u.source === "override" ? " · Muqeem level set" : ""}</div>}
                </td>
                <td>
                  <span className={`badge${u.status === "active" ? "" : " off"}`}>{u.status}</span>
                </td>
                <td>{when(u.last_login_at)}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="actions">
                    {u.editable ? (
                      <button className="btn small" onClick={() => setOpen(u)}>
                        Manage
                      </button>
                    ) : (
                      <span className="cell-sub">Super Admin only</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {adding && <AddUserModal roles={data.roles} onClose={() => setAdding(false)} onDone={(m) => void changed(m)} />}
      {open && <ManageModal user={open} roles={data.roles} isSelf={open.id === data.me.id} onClose={() => setOpen(null)} onChanged={(m) => void changed(m)} />}
    </div>
  );
}

function RolesTab({ data }: { data: TeamOverview }) {
  const codes = Object.keys(data.permissions).sort();
  return (
    <div className="panel panel-pad">
      <h2>
        <i /> What each role can do
      </h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Permission</th>
              {data.roles.map((r) => (
                <th key={r.name} style={{ textAlign: "center" }}>
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {codes.map((code) => (
              <tr key={code} style={{ cursor: "default" }}>
                <td style={{ whiteSpace: "normal" }}>
                  <div className="cell-name">{code.replace("muqeem.", "").replace(/^\w/, (c) => c.toUpperCase())}</div>
                  <div className="cell-sub">{data.permissions[code]}</div>
                </td>
                {data.roles.map((r) => (
                  <td key={r.name} style={{ textAlign: "center" }}>
                    {r.permissions.includes(code) ? <Check size={18} color="var(--success)" /> : <span className="cell-sub">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="cell-sub" style={{ marginTop: 14 }}>
        <ShieldCheck size={14} style={{ verticalAlign: "-2px" }} /> A Super Admin can add Super Admins, Admins and Editors. An Admin can add Admins and Editors but never a Super Admin. Editors cannot manage people.
      </p>
    </div>
  );
}

function DefaultsTab() {
  const [values, setValues] = useState<EntryDefaults>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    // Read once on the client: localStorage does not exist while rendering on the server.
    const stored = loadDefaults();
    const timer = window.setTimeout(() => setValues(stored), 0);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div className="panel panel-pad">
      <h2>
        <i /> Entry defaults
      </h2>
      <p className="cell-sub" style={{ marginTop: -6 }}>
        These are pre-filled on every new Entry Muqeem form on this browser, so repeat details are never typed twice.
      </p>
      <div className="grid" style={{ marginTop: 16 }}>
        {DEFAULT_KEYS.map((key) => (
          <label className="field" key={key}>
            <span>{DEFAULT_LABELS[key]}</span>
            <input
              value={values[key] ?? ""}
              dir={key === "employer_name" ? "rtl" : undefined}
              onChange={(e) => {
                setSaved(false);
                setValues({ ...values, [key]: e.target.value });
              }}
            />
          </label>
        ))}
      </div>
      <button
        className="btn primary"
        onClick={() => {
          saveDefaults(values);
          setSaved(true);
        }}
      >
        <Save size={16} /> {saved ? "Saved" : "Save defaults"}
      </button>
    </div>
  );
}

function ProfileTab() {
  const { user, setDisplayName } = useAuth();
  const [name, setName] = useState(user.full_name);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");
  const clean = name.replace(/\s+/g, " ").trim();

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setState("saving");
    setError("");
    try {
      const updated = await team.updateMyName(clean);
      setDisplayName(updated.full_name);
      setName(updated.full_name);
      setState("saved");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your name");
      setState("idle");
    }
  }

  return (
    <form className="panel panel-pad" onSubmit={save} style={{ maxWidth: 560 }}>
      <h2>
        <i /> My profile
      </h2>
      {error && <div className="alert error">{error}</div>}
      {state === "saved" && <div className="alert ok">Your name was updated.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label className="field">
          <span>Your name (shown to your team)</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setState("idle");
            }}
            minLength={2}
            maxLength={160}
            required
          />
        </label>
        <label className="field">
          <span>Sign-in email (cannot be changed here)</span>
          <input value={user.email} disabled />
        </label>
        <div>
          <button className="btn primary" disabled={state === "saving" || clean.length < 2 || clean === user.full_name}>
            <Save size={16} /> {state === "saving" ? "Saving…" : "Save name"}
          </button>
        </div>
      </div>
    </form>
  );
}

function AppearanceTab() {
  const { lang, setLang, theme, toggleTheme, t } = usePrefs();
  const langs: [Lang, string][] = [["en", "English"], ["bn", "বাংলা"], ["ar", "العربية"]];
  return (
    <div className="panel panel-pad">
      <h2>
        <i /> Appearance &amp; language
      </h2>
      <div className="field">
        <span>Language</span>
        <div className="tabs" style={{ alignSelf: "flex-start" }}>
          {langs.map(([code, label]) => (
            <button key={code} className={lang === code ? "on" : ""} onClick={() => setLang(code)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="field" style={{ marginTop: 18 }}>
        <span>Theme</span>
        <div className="tabs" style={{ alignSelf: "flex-start" }}>
          <button className={theme === "light" ? "on" : ""} onClick={() => theme !== "light" && toggleTheme()}>
            {t("theme.light")}
          </button>
          <button className={theme === "dark" ? "on" : ""} onClick={() => theme !== "dark" && toggleTheme()}>
            {t("theme.dark")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { canSuper, user } = useAuth();
  const [tab, setTab] = useState<Tab>(canSuper ? "team" : "profile");
  const [data, setData] = useState<TeamOverview | null>(null);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setData(await team.overview());
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load the team");
    }
  }, []);

  useEffect(() => {
    if (!canSuper) return;
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [canSuper, reload]);

  const tabs: [Tab, string][] = [
    ["profile", "My profile"],
    ...(canSuper ? ([["team", "Team"], ["roles", "Roles & access"]] as [Tab, string][]) : []),
    ["defaults", "Entry defaults"],
    ["appearance", "Appearance"],
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{user.full_name}</p>
          <h1>Settings</h1>
        </div>
        <div className="tabs">
          {tabs.map(([key, label]) => (
            <button key={key} className={tab === key ? "on" : ""} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {error && <div className="alert error">{error}</div>}
      {tab === "team" && canSuper && (data ? <TeamTab data={data} reload={reload} /> : !error && <div className="skeleton" style={{ height: 260 }} />)}
      {tab === "roles" && canSuper && (data ? <RolesTab data={data} /> : !error && <div className="skeleton" style={{ height: 260 }} />)}
      {tab === "profile" && <ProfileTab />}
      {tab === "defaults" && <DefaultsTab />}
      {tab === "appearance" && <AppearanceTab />}
    </>
  );
}
