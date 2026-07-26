"use client";

import {
  Activity,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  ChevronRight,
  CircleGauge,
  FileText,
  FolderKanban,
  Globe2,
  Inbox,
  LayoutTemplate,
  LogOut,
  Menu,
  MessageSquareText,
  Newspaper,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type User = { full_name: string; email: string; roles: string[] };
type ContentItem = {
  id: string; slug: string; title: string; status: string; summary?: string;
  updated_at: string; extra: Record<string, unknown>;
};
type ContentDetail = ContentItem & {
  body: Record<string, unknown>;
  meta_title?: string | null;
  meta_description?: string | null;
};
type Overview = {
  counts: Record<string, number>;
  inbox: Record<string, number>;
  activity: { id: string; action: string; entity_type: string; created_at: string }[];
  system: Record<string, string>;
};

const contentNav = [
  ["pages", "Pages", LayoutTemplate],
  ["services", "Services", BriefcaseBusiness],
  ["projects", "Projects", FolderKanban],
  ["posts", "Insights", Newspaper],
  ["requirements", "Requirements", Users],
] as const;
const inboxNav = [
  ["contact", "Contact", MessageSquareText],
  ["rfq", "RFQ", FileText],
  ["applications", "Applications", Inbox],
] as const;

export default function Dashboard({ route }: { route: string[] }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mobile, setMobile] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<User>("/auth/me")
      .then(setUser)
      .catch(() => router.replace("/"))
      .finally(() => setLoading(false));
  }, [router]);

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    router.replace("/");
  }

  if (loading || !user) return <main className="center-screen"><span className="loader" /></main>;

  const active = route.join("/");
  return (
    <div className="workspace">
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="sidebar-logo"><Image src="/logo-white-full.png" alt="NOVARISE" width={152} height={42} priority /><button onClick={() => setMobile(false)}><X /></button></div>
        <p className="nav-label">Workspace</p>
        <Nav href="/overview" icon={CircleGauge} label="Overview" active={active === "overview"} />
        <p className="nav-label">Website</p>
        {contentNav.map(([key, label, Icon]) => <Nav key={key} href={`/content/${key}`} icon={Icon} label={label} active={active === `content/${key}`} />)}
        <p className="nav-label">Inbox</p>
        {inboxNav.map(([key, label, Icon]) => <Nav key={key} href={`/inbox/${key}`} icon={Icon} label={label} active={active === `inbox/${key}`} />)}
        <p className="nav-label">Administration</p>
        <Nav href="/settings" icon={Settings} label="Site settings" active={active === "settings"} />
        <Nav href="/users" icon={ShieldCheck} label="Team & access" active={active === "users"} />
        <div className="sidebar-user">
          <div className="avatar">{user.full_name.slice(0, 2).toUpperCase()}</div>
          <div><strong>{user.full_name}</strong><span>{user.email}</span></div>
          <button onClick={logout} title="Sign out"><LogOut size={17} /></button>
        </div>
      </aside>
      {mobile && <button className="scrim" onClick={() => setMobile(false)} aria-label="Close navigation" />}
      <div className="main-area">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobile(true)}><Menu /></button>
          <div className="global-search"><Search size={17} /><span>Search workspace</span><kbd>⌘ K</kbd></div>
          <a className="site-link" href="https://novarisesa.com" target="_blank"><Globe2 size={16} /> View website</a>
          <button className="icon-button"><Bell size={18} /><i /></button>
        </header>
        <main className="content">
          {route[0] === "overview" && <OverviewPage user={user} />}
          {route[0] === "content" && <ContentPage resource={route[1] ?? "pages"} />}
          {route[0] === "inbox" && <InboxPage inbox={route[1] ?? "contact"} />}
          {route[0] === "settings" && <SettingsPage />}
          {route[0] === "users" && <UsersPage />}
        </main>
      </div>
    </div>
  );
}

function Nav({ href, icon: Icon, label, active }: { href: string; icon: typeof Activity; label: string; active: boolean }) {
  return <Link className={`nav-item ${active ? "active" : ""}`} href={href}><Icon size={18} /><span>{label}</span>{active && <ChevronRight size={15} />}</Link>;
}

function PageHead({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) {
  return <div className="page-head"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></div>{action}</div>;
}

function OverviewPage({ user }: { user: User }) {
  const [data, setData] = useState<Overview | null>(null);
  useEffect(() => { api<Overview>("/cms/overview").then(setData); }, []);
  if (!data) return <Skeleton />;
  const totalContent = Object.values(data.counts).reduce((sum, value) => sum + value, 0);
  const totalInbox = Object.values(data.inbox).slice(0, 3).reduce((sum, value) => sum + value, 0);
  return <>
    <PageHead eyebrow="Sunday · Operations pulse" title={`Good day, ${user.full_name.split(" ")[0]}.`} copy="Here is what is happening across your website today." action={<Link className="primary-button compact" href="/content/pages"><Plus size={17} /> New content</Link>} />
    <section className="stats-grid">
      <Stat label="Managed content" value={totalContent} note="Across 6 collections" icon={BookOpen} tone="gold" />
      <Stat label="New enquiries" value={totalInbox} note="Needs your attention" icon={Inbox} tone="navy" />
      <Stat label="Newsletter audience" value={data.inbox.newsletter ?? 0} note="Active subscribers" icon={Users} tone="green" />
      <Stat label="System health" value="100%" note="API & database online" icon={Activity} tone="blue" />
    </section>
    <section className="dashboard-grid">
      <div className="panel span-2"><PanelTitle title="Content at a glance" detail="Live inventory across the website" /><div className="collection-grid">{contentNav.map(([key, label, Icon]) => <Link href={`/content/${key}`} key={key} className="collection-card"><span><Icon size={19} /></span><strong>{data.counts[key] ?? 0}</strong><small>{label}</small><ChevronRight size={17} /></Link>)}</div></div>
      <div className="panel"><PanelTitle title="Platform status" detail="Live infrastructure" /><div className="status-list"><Status label="Website" value="Live" /><Status label="API service" value={data.system.api} /><Status label="PostgreSQL" value={data.system.database} /><Status label="Secure session" value="Protected" /></div></div>
      <div className="panel span-2"><PanelTitle title="Recent activity" detail="Latest changes made in Control Center" /><div className="activity-list">{data.activity.length ? data.activity.map((item) => <div key={item.id}><span className="activity-dot" /><div><strong>{humanize(item.action)}</strong><small>{humanize(item.entity_type)} · {new Date(item.created_at).toLocaleString()}</small></div></div>) : <Empty copy="Activity will appear here as your team makes changes." />}</div></div>
      <div className="panel"><PanelTitle title="Inbox pulse" detail="Unprocessed messages" /><div className="inbox-pulse">{inboxNav.map(([key, label, Icon]) => <Link href={`/inbox/${key}`} key={key}><Icon size={18} /><span>{label}</span><b>{data.inbox[key] ?? 0}</b></Link>)}</div></div>
    </section>
  </>;
}

function Stat({ label, value, note, icon: Icon, tone }: { label: string; value: string | number; note: string; icon: typeof Activity; tone: string }) {
  return <div className="stat-card"><span className={`stat-icon ${tone}`}><Icon size={20} /></span><p>{label}</p><strong>{value}</strong><small>{note}</small></div>;
}
function PanelTitle({ title, detail }: { title: string; detail: string }) { return <div className="panel-title"><div><h2>{title}</h2><p>{detail}</p></div><button><span>•••</span></button></div>; }
function Status({ label, value }: { label: string; value: string }) { return <div><span><i />{label}</span><b>{humanize(value)}</b></div>; }

function ContentPage({ resource }: { resource: string }) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ContentItem | "new" | null>(null);
  const title = contentNav.find(([key]) => key === resource)?.[1] ?? humanize(resource);
  const load = useCallback(() => { setBusy(true); api<{ items: ContentItem[] }>(`/cms/content/${resource}`).then((response) => setItems(response.items)).finally(() => setBusy(false)); }, [resource]);
  useEffect(load, [load]);
  const visible = useMemo(() => items.filter((item) => `${item.title} ${item.slug}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  async function archive(item: ContentItem) {
    if (!window.confirm(`Archive “${item.title}”?`)) return;
    await api(`/cms/content/${resource}/${item.id}`, { method: "DELETE" });
    load();
  }
  return <>
    <PageHead eyebrow="Website content" title={title} copy={`Create, review and publish ${title.toLowerCase()} across the NOVARISE website.`} action={<button className="primary-button compact" onClick={() => setModal("new")}><Plus size={17} /> Add {title.replace(/s$/, "")}</button>} />
    <div className="panel table-panel">
      <div className="table-tools"><div className="search-input"><Search size={17} /><input placeholder={`Search ${title.toLowerCase()}...`} value={query} onChange={(event) => setQuery(event.target.value)} /></div><span>{visible.length} items</span></div>
      {busy ? <Skeleton /> : visible.length ? <div className="data-table"><div className="table-row table-head"><span>Title</span><span>Status</span><span>Updated</span><span /></div>{visible.map((item) => <div className="table-row" key={item.id}><span><b>{item.title}</b><small>/{item.slug}</small></span><span><Badge value={item.status} /></span><span>{new Date(item.updated_at).toLocaleDateString()}</span><span className="row-actions"><button onClick={() => setModal(item)}>Edit</button><button onClick={() => archive(item)}>Archive</button></span></div>)}</div> : <Empty copy={`No ${title.toLowerCase()} yet. Create the first one to get started.`} /> }
    </div>
    {modal && <ContentModal resource={resource} item={modal === "new" ? null : modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
  </>;
}

function ContentModal({ resource, item, onClose, onSaved }: { resource: string; item: ContentItem | null; onClose: () => void; onSaved: () => void }) {
  const isRequirement = resource === "requirements";
  const [title, setTitle] = useState(item?.title ?? "");
  const [slug, setSlug] = useState(item?.slug ?? "");
  const [summary, setSummary] = useState(item?.summary ?? "");
  const [status, setStatus] = useState(item?.status ?? (isRequirement ? "active" : "draft"));
  const [headcount, setHeadcount] = useState(Number(item?.extra?.headcount ?? 1));
  const [location, setLocation] = useState(String(item?.extra?.location ?? ""));
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [bodyJson, setBodyJson] = useState("{}");
  const [bodyError, setBodyError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    api<ContentDetail>(`/cms/content/${resource}/${item.id}`).then((detail) => {
      if (cancelled) return;
      setTitle(detail.title);
      setSlug(detail.slug);
      setSummary(detail.summary ?? "");
      setStatus(detail.status);
      setMetaTitle(detail.meta_title ?? "");
      setMetaDescription(detail.meta_description ?? "");
      setBodyJson(JSON.stringify(detail.body ?? {}, null, 2));
    });
    return () => {
      cancelled = true;
    };
  }, [item, resource]);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true);
    setBodyError("");
    let parsedBody: Record<string, unknown> = {};
    try {
      parsedBody = bodyJson.trim() ? JSON.parse(bodyJson) : {};
      if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
        throw new Error("Body must be a JSON object");
      }
    } catch {
      setSaving(false);
      setBodyError("Body JSON must be a valid object.");
      return;
    }
    const body = { title, slug, code: isRequirement ? slug : undefined, summary, status, headcount: isRequirement ? headcount : undefined, location, body: parsedBody, locale: "en", meta_title: metaTitle || undefined, meta_description: metaDescription || undefined };
    await api(`/cms/content/${resource}${item ? `/${item.id}` : ""}`, { method: item ? "PATCH" : "POST", body: JSON.stringify(body) });
    onSaved();
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">{item ? "Edit content" : "New content"}</p><h2>{item ? item.title : `Create ${humanize(resource.replace(/s$/, ""))}`}</h2></div><button type="button" onClick={onClose}><X /></button></div><div className="form-grid"><label className="full">Title<input value={title} onChange={(event) => { setTitle(event.target.value); if (!item) setSlug(slugify(event.target.value)); }} required /></label><label>Identifier / slug<input value={slug} onChange={(event) => setSlug(slugify(event.target.value))} required /></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}>{(isRequirement ? ["draft", "active", "urgent", "closed"] : ["draft", "published", "archived"]).map((value) => <option key={value}>{value}</option>)}</select></label>{isRequirement && <><label>Headcount<input type="number" min="1" value={headcount} onChange={(event) => setHeadcount(Number(event.target.value))} /></label><label>Location<input value={location} onChange={(event) => setLocation(event.target.value)} /></label></>}<label className="full">Summary<textarea rows={4} value={summary} onChange={(event) => setSummary(event.target.value)} /></label><label className="full">Body JSON<textarea rows={8} value={bodyJson} onChange={(event) => setBodyJson(event.target.value)} spellCheck={false} /></label>{bodyError && <p className="form-error full">{bodyError}</p>}<label>Meta title<input value={metaTitle} onChange={(event) => setMetaTitle(event.target.value)} /></label><label>Meta description<textarea rows={3} value={metaDescription} onChange={(event) => setMetaDescription(event.target.value)} /></label></div><div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary-button compact" disabled={saving}>{saving ? "Saving..." : "Save content"}</button></div></form></div>;
}

function InboxPage({ inbox }: { inbox: string }) {
  type Item = { id: string; name: string; email?: string; phone?: string; company?: string; status: string; summary?: string; created_at: string };
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(true);
  const title = inboxNav.find(([key]) => key === inbox)?.[1] ?? humanize(inbox);
  const load = useCallback(() => { setBusy(true); api<{ items: Item[] }>(`/cms/inbox/${inbox}`).then((r) => setItems(r.items)).finally(() => setBusy(false)); }, [inbox]);
  useEffect(load, [load]);
  async function update(id: string, status: string) { await api(`/cms/inbox/${inbox}/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }); load(); }
  return <><PageHead eyebrow="Unified inbox" title={title} copy="Review every website submission and keep the team’s follow-up status current." /><div className="panel table-panel">{busy ? <Skeleton /> : items.length ? <div className="message-list">{items.map((item) => <article key={item.id}><div className="avatar small">{item.name.slice(0, 2).toUpperCase()}</div><div className="message-body"><div><h3>{item.name}</h3><Badge value={item.status} /></div><p>{item.summary || "No additional note provided."}</p><small>{item.email || item.phone || "No contact detail"} {item.company ? `· ${item.company}` : ""} · {new Date(item.created_at).toLocaleString()}</small></div><select value={item.status} onChange={(event) => update(item.id, event.target.value)}>{["new", "in_review", "contacted", "qualified", "closed", "spam"].map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></article>)}</div> : <Empty copy="Your inbox is clear. New website submissions will appear here." />}</div></>;
}

function SettingsPage() {
  type Setting = { id: string; group_name: string; key: string; value: unknown; is_public: boolean };
  const [items, setItems] = useState<Setting[]>([]);
  const [form, setForm] = useState({ group_name: "translations", key: "en", value: "{\n  \"hero\": {\n    \"subtitle\": \"From Saudi Aramco refineries to SABIC plants, NOVARISE delivers world-class manpower, equipment and contracting solutions.\"\n  }\n}", is_public: true });
  const [error, setError] = useState("");
  const load = useCallback(() => api<{ items: Setting[] }>("/cms/settings").then((r) => setItems(r.items)), []);
  useEffect(() => { load(); }, [load]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    let value: unknown = form.value;
    const trimmed = form.value.trim();
    if (/^[\[{]/.test(trimmed)) {
      try {
        value = JSON.parse(trimmed);
      } catch {
        setError("Value looks like JSON but is not valid.");
        return;
      }
    }
    await api("/cms/settings", { method: "PUT", body: JSON.stringify({ ...form, value }) });
    load();
  }
  function edit(item: Setting) {
    setForm({
      group_name: item.group_name,
      key: item.key,
      value: typeof item.value === "string" ? item.value : JSON.stringify(item.value, null, 2),
      is_public: item.is_public,
    });
  }
  return <><PageHead eyebrow="Administration" title="Site settings" copy="Manage global contact, brand and page copy used by the website." /><section className="settings-grid"><form className="panel settings-form" onSubmit={save}><PanelTitle title="Add or update setting" detail="Use translations/en for editable website copy" /><label>Group<input value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })} /></label><label>Key<input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} /></label><label>Value<textarea rows={10} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} spellCheck={false} /></label>{error && <p className="form-error">{error}</p>}<label className="check-row"><input type="checkbox" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} /> Public website can read this</label><button className="primary-button compact">Save setting</button></form><div className="panel"><PanelTitle title="Saved configuration" detail={`${items.length} managed values`} /><div className="setting-list">{items.map((item) => <button key={item.id} onClick={() => edit(item)}><span>{item.group_name}</span><b>{humanize(item.key)}</b><small>{typeof item.value === "string" ? item.value : JSON.stringify(item.value)}</small></button>)}{!items.length && <Empty copy="No custom settings have been added yet." />}</div></div></section></>;
}

function UsersPage() {
  type TeamUser = { id: string; full_name: string; email: string; roles: string[]; is_active: boolean; last_login_at?: string };
  const [items, setItems] = useState<TeamUser[]>([]);
  useEffect(() => { api<{ items: TeamUser[] }>("/cms/users").then((r) => setItems(r.items)); }, []);
  return <><PageHead eyebrow="Access control" title="Team & access" copy="See who can access Control Center and their current security role." /><div className="panel team-grid">{items.map((item) => <article key={item.id}><div className="avatar">{item.full_name.slice(0, 2).toUpperCase()}</div><div><h3>{item.full_name}</h3><p>{item.email}</p><span>{item.roles.join(", ")}</span></div><Badge value={item.is_active ? "active" : "disabled"} /></article>)}</div></>;
}

function Badge({ value }: { value: string }) { return <span className={`badge badge-${value}`}>{humanize(value)}</span>; }
function Empty({ copy }: { copy: string }) { return <div className="empty"><Inbox size={26} /><p>{copy}</p></div>; }
function Skeleton() { return <div className="skeleton"><i /><i /><i /></div>; }
function humanize(value: string) { return value.replace(/[._-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
