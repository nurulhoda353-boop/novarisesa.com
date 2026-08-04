"use client";

import {
  Activity,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleGauge,
  FileText,
  FilePenLine,
  FolderKanban,
  Globe2,
  ImageIcon,
  Inbox,
  LogOut,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  Newspaper,
  Pencil,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, SITE_URL } from "@/lib/api";

const SITE_ORIGIN = new URL(SITE_URL).origin;

type User = {
  full_name: string;
  email: string;
  roles: string[];
  permissions?: string[];
};
type ContentItem = {
  id: string;
  slug: string;
  title: string;
  status: string;
  summary?: string;
  is_featured: boolean;
  updated_at: string;
  extra: Record<string, unknown>;
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
type SearchHit = {
  type: string;
  id: string;
  title: string;
  href: string;
  status: string;
};
type MediaItem = {
  id: string;
  public_url: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  folder?: string | null;
  alt_text: Record<string, string>;
  created_at: string;
};
type NavItem = {
  id: string;
  location: string;
  parent_id?: string | null;
  label: Record<string, string>;
  url: string;
  sort_order: number;
  is_visible: boolean;
};
type TaxonomyItem = {
  id: string;
  slug: string;
  name: Record<string, string>;
};
type TeamUser = {
  id: string;
  full_name: string;
  email: string;
  roles: string[];
  is_active: boolean;
  last_login_at?: string;
};

const contentNav = [
  ["services", "Services", BriefcaseBusiness],
  ["projects", "Projects", FolderKanban],
  ["posts", "Insights", Newspaper],
  ["requirements", "Requirements", Users],
  ["events", "Events", CalendarDays],
] as const;
const hiddenContentResources = new Set(["pages"]);
const inboxNav = [
  ["contact", "Contact", MessageSquareText],
  ["rfq", "RFQ", FileText],
  ["applications", "Applications", Inbox],
] as const;

const assetSlots = [
  ["home.hero", "Home hero", "/assets/hero-industrial.jpg"],
  ["home.industry", "Home industries", "/assets/industry-oilgas.jpg"],
  ["home.hse", "Home HSE", "/assets/hse-safety.jpg"],
  ["home.visionSkyline", "Vision 2030 skyline", "/assets/vision-skyline.jpg"],
  ["home.visionTeam", "Vision 2030 team", "/assets/vision-team.jpg"],
  ["home.workforce", "Workforce statistics", "/assets/manpower.jpg"],
  ["home.capabilities", "Capabilities section", "/assets/capabilities-hero.jpg"],
  ["home.careers", "Careers section", "/assets/manpower.jpg"],
  ["global.cta", "Global call to action", "/assets/cta-meeting.jpg"],
  ["about.hero", "About hero", "/assets/vision-skyline.jpg"],
  ["about.profile", "Company profile", "/assets/manpower.jpg"],
  ["about.ceo", "CEO portrait", "/assets/ceo-portrait.jpg"],
  ["services.hero", "Services hero", "/assets/capabilities-hero.jpg"],
  ["capabilities.hero", "Capabilities hero", "/assets/capabilities-hero.jpg"],
  ["careers.hero", "Careers hero", "/assets/manpower.jpg"],
  ["requirements.hero", "Requirements hero", "/assets/requirements-hero.jpg"],
  ["contact.hero", "Contact hero", "/assets/cta-meeting.jpg"],
  ["rfq.hero", "RFQ hero", "/assets/hero-industrial.jpg"],
  ["blog.hero", "Insights hero", "/assets/vision-team.jpg"],
  ["brand.logoColor", "Header logo (colour)", "/assets/logo-navy-full.png"],
  ["brand.logoWhite", "Header/footer logo (white)", "/assets/logo-white-full.png"],
  ["services.civil.hero", "Civil Construction — hero", "/assets/project-civil.jpg"],
  ["services.power.hero", "Power Plants — hero", "/assets/project-power.jpg"],
  ["services.rental.hero", "Heavy Equipment Rental — hero", "/assets/project-equipment.jpg"],
  ["services.manpower.hero", "Manpower Supply — hero", "/assets/manpower.jpg"],
  ["services.it.hero", "IT Solutions — hero", "/assets/vision-team.jpg"],
  ["services.trading.hero", "Materials Trading — hero", "/assets/industry-oilgas.jpg"],
  ["projects.neom.hero", "NEOM — hero", "/assets/projects/neom.jpg"],
  ["projects.red-sea-global.hero", "Red Sea Global — hero", "/assets/projects/red-sea-global.jpg"],
  ["projects.amaala.hero", "AMAALA — hero", "/assets/projects/amaala.jpg"],
  ["projects.jafurah.hero", "Jafurah — hero", "/assets/projects/jafurah.jpg"],
  ["projects.afif.hero", "Afif Solar PV — hero", "/assets/projects/afif.jpg"],
  ["projects.red-sea-aluminium.hero", "Red Sea Aluminium — hero", "/assets/projects/red-sea-aluminium.jpg"],
  ["projects.durma-pp12.hero", "Durma PP12 — hero", "/assets/projects/durma-pp12.jpg"],
  ["projects.taiba-1.hero", "Taiba 1 IPP — hero", "/assets/projects/taiba-1.jpg"],
  ["projects.rumah-1.hero", "Rumah 1 IPP — hero", "/assets/projects/rumah-1.jpg"],
  ["projects.qassim-1.hero", "Qassim 1 IPP — hero", "/assets/projects/qassim-1.jpg"],
  ["projects.nairiyah-1.hero", "Nairiyah 1 IPP — hero", "/assets/projects/nairiyah-1.jpg"],
  ["projects.yanbu-3.hero", "Yanbu-3 — hero", "/assets/projects/yanbu-3.jpg"],
] as const;

// Keep in sync with src/lib/service-icons.ts on the public site.
const SERVICE_ICON_NAMES = [
  "Activity", "Anvil", "Boxes", "Building2", "Cable", "Cloud", "Construction", "Cpu",
  "Drill", "Droplets", "Flame", "Forklift", "Fuel", "Gauge", "Hammer", "HardHat",
  "Layers", "Lock", "MonitorCog", "Network", "Package", "Pipette", "PlugZap", "Radio",
  "Ruler", "ScrollText", "Server", "ShieldAlert", "ShieldCheck", "Truck", "Users",
  "Waypoints", "Wind", "Wrench", "Zap",
];

function can(user: User, code: string) {
  return (user.permissions ?? []).includes(code) || user.roles.includes("owner");
}

export default function Dashboard({ route }: { route: string[] }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mobile, setMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [inboxNew, setInboxNew] = useState(0);
  const [topbarActions, setTopbarActions] = useState<ReactNode>(null);

  useEffect(() => {
    api<User>("/auth/me")
      .then(setUser)
      .catch(() => router.replace("/"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    api<Overview>("/cms/overview")
      .then((data) => {
        setInboxNew(
          (data.inbox.contact ?? 0) + (data.inbox.rfq ?? 0) + (data.inbox.applications ?? 0),
        );
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") setSearchOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (route[0] === "content" && hiddenContentResources.has(route[1] ?? "")) {
      router.replace("/site-content");
    }
  }, [route, router]);

  useEffect(() => {
    if (route[0] !== "site-content") setTopbarActions(null);
  }, [route]);

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    router.replace("/");
  }

  if (loading || !user) return <main className="center-screen"><span className="loader" /></main>;

  const active = route.join("/");
  return (
    <div className="workspace">
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="sidebar-logo">
          <Image src="/logo-white-full.png" alt="NOVARISE" width={152} height={42} priority />
          <button onClick={() => setMobile(false)}><X /></button>
        </div>
        <p className="nav-label">Workspace</p>
        <Nav href="/overview" icon={CircleGauge} label="Overview" active={active === "overview"} />
        <p className="nav-label">Website</p>
        <Nav href="/site-content" icon={FilePenLine} label="Site content" active={active === "site-content"} />
        {contentNav.map(([key, label, Icon]) => (
          <Nav key={key} href={`/content/${key}`} icon={Icon} label={label} active={active === `content/${key}`} />
        ))}
        <Nav href="/media" icon={ImageIcon} label="Media library" active={active === "media"} />
        <p className="nav-label">Inbox</p>
        {inboxNav.map(([key, label, Icon]) => (
          <Nav key={key} href={`/inbox/${key}`} icon={Icon} label={label} active={active === `inbox/${key}`} />
        ))}
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
          <button className="global-search" onClick={() => setSearchOpen(true)}>
            <Search size={17} /><span>Search workspace</span><kbd>⌘ K</kbd>
          </button>
          {topbarActions && <div className="topbar-page-actions">{topbarActions}</div>}
          <a className="site-link" href="https://novarisesa.com" target="_blank"><Globe2 size={16} /> View website</a>
          <Link className="icon-button" href="/inbox/contact" title={`${inboxNew} new inbox items`}>
            <Bell size={18} />
            {inboxNew > 0 && <i />}
          </Link>
        </header>
        <main className="content">
          {route[0] === "overview" && <OverviewPage user={user} />}
          {route[0] === "site-content" && <SiteContentPage user={user} onTopbarActions={setTopbarActions} />}
          {route[0] === "content" && !hiddenContentResources.has(route[1] ?? "") && (
            <ContentPage resource={route[1] ?? "services"} user={user} />
          )}
          {route[0] === "inbox" && <InboxPage inbox={route[1] ?? "contact"} />}
          {route[0] === "media" && <MediaPage user={user} />}
          {route[0] === "navigation" && <NavigationPage user={user} />}
          {route[0] === "taxonomy" && <TaxonomyPage user={user} />}
          {route[0] === "settings" && <SettingsPage />}
          {route[0] === "users" && <UsersPage user={user} />}
        </main>
      </div>
      {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}
    </div>
  );
}

function Nav({ href, icon: Icon, label, active }: { href: string; icon: typeof Activity; label: string; active: boolean }) {
  return (
    <Link className={`nav-item ${active ? "active" : ""}`} href={href}>
      <Icon size={18} /><span>{label}</span>{active && <ChevronRight size={15} />}
    </Link>
  );
}

function PageHead({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></div>
      {action}
    </div>
  );
}

function SearchPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setItems([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setBusy(true);
      api<{ items: SearchHit[] }>(`/cms/search?q=${encodeURIComponent(query.trim())}`)
        .then((response) => setItems(response.items.filter((item) => !isHiddenDashboardHref(item.href))))
        .finally(() => setBusy(false));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="search-palette" onMouseDown={(event) => event.stopPropagation()}>
        <div className="search-palette-input">
          <Search size={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pages, services, media…"
          />
          <kbd>Esc</kbd>
        </div>
        <div className="search-palette-results">
          {busy && <p className="muted-row">Searching…</p>}
          {!busy && query && !items.length && <p className="muted-row">No matches for “{query}”.</p>}
          {items.map((item) => (
            <button
              key={`${item.type}-${item.id}`}
              onClick={() => {
                onClose();
                router.push(item.href);
              }}
            >
              <strong>{item.title}</strong>
              <span>{humanize(item.type)} · {humanize(item.status)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function isHiddenDashboardHref(href: string) {
  return href === "/media" ||
    href === "/navigation" ||
    href === "/taxonomy" ||
    href === "/content/pages";
}

function OverviewPage({ user }: { user: User }) {
  const [data, setData] = useState<Overview | null>(null);
  useEffect(() => { api<Overview>("/cms/overview").then(setData); }, []);
  if (!data) return <Skeleton />;
  const totalContent = Object.values(data.counts).reduce((sum, value) => sum + value, 0);
  const totalInbox = Object.values(data.inbox).slice(0, 3).reduce((sum, value) => sum + value, 0);
  return <>
    <PageHead
      eyebrow="Operations pulse"
      title={`Good day, ${user.full_name.split(" ")[0]}.`}
      copy="Here is what is happening across your website today."
      action={<Link className="primary-button compact" href="/content/pages"><Plus size={17} /> New content</Link>}
    />
    <section className="stats-grid">
      <Stat label="Managed content" value={totalContent} note="Across collections & media" icon={BookOpen} tone="gold" />
      <Stat label="New enquiries" value={totalInbox} note="Needs your attention" icon={Inbox} tone="navy" />
      <Stat label="Newsletter audience" value={data.inbox.newsletter ?? 0} note="Active subscribers" icon={Users} tone="green" />
      <Stat label="System health" value="100%" note={`API ${data.system.api} · DB ${data.system.database}`} icon={Activity} tone="blue" />
    </section>
    <section className="dashboard-grid">
      <div className="panel span-2">
        <PanelTitle title="Content at a glance" detail="Live inventory across the website" />
        <div className="collection-grid">
          {contentNav.map(([key, label, Icon]) => (
            <Link href={`/content/${key}`} key={key} className="collection-card">
              <span><Icon size={19} /></span>
              <strong>{data.counts[key] ?? 0}</strong>
              <small>{label}</small>
              <ChevronRight size={17} />
            </Link>
          ))}
        </div>
      </div>
      <div className="panel">
        <PanelTitle title="Platform status" detail="Live infrastructure" />
        <div className="status-list">
          <Status label="Website" value="Live" />
          <Status label="API service" value={data.system.api} />
          <Status label="PostgreSQL" value={data.system.database} />
          <Status label="Secure session" value="Protected" />
        </div>
      </div>
      <div className="panel span-2">
        <PanelTitle title="Recent activity" detail="Latest changes made in Control Center" />
        <div className="activity-list">
          {data.activity.length ? data.activity.map((item) => (
            <div key={item.id}>
              <span className="activity-dot" />
              <div>
                <strong>{humanize(item.action)}</strong>
                <small>{humanize(item.entity_type)} · {new Date(item.created_at).toLocaleString()}</small>
              </div>
            </div>
          )) : <Empty copy="Activity will appear here as your team makes changes." />}
        </div>
      </div>
      <div className="panel">
        <PanelTitle title="Inbox pulse" detail="Unprocessed messages" />
        <div className="inbox-pulse">
          {inboxNav.map(([key, label, Icon]) => (
            <Link href={`/inbox/${key}`} key={key}>
              <Icon size={18} /><span>{label}</span><b>{data.inbox[key] ?? 0}</b>
            </Link>
          ))}
        </div>
      </div>
    </section>
  </>;
}

function Stat({ label, value, note, icon: Icon, tone }: { label: string; value: string | number; note: string; icon: typeof Activity; tone: string }) {
  return (
    <div className="stat-card">
      <span className={`stat-icon ${tone}`}><Icon size={20} /></span>
      <p>{label}</p><strong>{value}</strong><small>{note}</small>
    </div>
  );
}
function PanelTitle({ title, detail }: { title: string; detail: string }) {
  return <div className="panel-title"><div><h2>{title}</h2><p>{detail}</p></div></div>;
}
function Status({ label, value }: { label: string; value: string }) {
  return <div><span><i />{label}</span><b>{humanize(value)}</b></div>;
}

type ManagedSetting = {
  id: string;
  group_name: string;
  key: string;
  value: unknown;
  is_public: boolean;
};

function cloneDocument(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function replaceAtPath(
  document: Record<string, unknown>,
  path: Array<string | number>,
  value: string | number | boolean | null,
) {
  const next = cloneDocument(document);
  let cursor: Record<string | number, unknown> | unknown[] = next;
  path.slice(0, -1).forEach((part) => {
    cursor = (cursor as Record<string | number, Record<string | number, unknown> | unknown[]>)[part];
  });
  (cursor as Record<string | number, unknown>)[path[path.length - 1]] = value;
  return next;
}

// Slug -> i18n key for the 12 launch projects (en.json uses camelCase keys).
const PROJECT_I18N_KEY: Record<string, string> = {
  "neom": "neom",
  "red-sea-global": "redSeaGlobal",
  "amaala": "amaala",
  "jafurah": "jafurah",
  "afif": "afif",
  "red-sea-aluminium": "redSeaAluminium",
  "durma-pp12": "durma",
  "taiba-1": "taiba1",
  "rumah-1": "rumah1",
  "qassim-1": "qassim1",
  "nairiyah-1": "nairiyah1",
  "yanbu-3": "yanbu3",
};

/** Like replaceAtPath but creates missing intermediate objects/arrays. */
function setAtPath(document: Record<string, unknown>, path: Array<string | number>, value: unknown) {
  let cursor = document as Record<string | number, unknown>;
  for (let index = 0; index < path.length - 1; index += 1) {
    const part = path[index];
    const existing = cursor[part];
    if (typeof existing !== "object" || existing === null) {
      cursor[part] = typeof path[index + 1] === "number" ? [] : {};
    }
    cursor = cursor[part] as Record<string | number, unknown>;
  }
  cursor[path[path.length - 1]] = value;
}

/**
 * The public site reads the 6 launch services / 12 launch projects / 9 launch
 * posts through the i18n bundle first (that is what pen mode writes to), so a
 * dashboard-only save would silently not show up. Mirroring the saved fields
 * into the same translation paths keeps both editors in agreement.
 * Only non-empty values are mirrored, so an untouched blank field can never
 * wipe existing site copy.
 */
function translationOverridesFor(
  resource: string,
  slug: string,
  values: Record<string, unknown>,
): Array<[Array<string | number>, unknown]> {
  const out: Array<[Array<string | number>, unknown]> = [];
  const put = (dotted: string, value: unknown) => {
    if (typeof value === "string" && !value.trim()) return;
    if (Array.isArray(value) && !value.length) return;
    if (value === null || value === undefined) return;
    out.push([dotted.split(".").map((part) => (/^\d+$/.test(part) ? Number(part) : part)), value]);
  };
  if (resource === "services") {
    const base = `serviceDetails.${slug}`;
    put(`${base}.title`, values.title);
    put(`${base}.eyebrow`, values.eyebrow);
    put(`${base}.tagline`, values.summary);
    put(`${base}.lead`, values.lead);
    put(`${base}.intro`, values.intro);
    const stats = values.stats as Array<{ label?: string }> | undefined;
    if (stats?.length) put(`${base}.statLabels`, stats.map((row) => row.label ?? ""));
    const subs = values.subServices as Array<{ title?: string; desc?: string }> | undefined;
    if (subs?.length) put(`${base}.subServices`, subs.map((row) => ({ title: row.title ?? "", desc: row.desc ?? "" })));
    const caps = values.capabilities as Array<{ label?: string; value?: string }> | undefined;
    if (caps?.length) put(`${base}.capabilities.rows`, caps.map((row) => ({ label: row.label ?? "", value: row.value ?? "" })));
    const process = values.process as Array<{ title?: string; desc?: string }> | undefined;
    if (process?.length) put(`${base}.process`, process.map((row) => ({ title: row.title ?? "", desc: row.desc ?? "" })));
    put(`${base}.certifications`, values.certifications);
    const faqs = values.faqs as Array<{ q?: string; a?: string }> | undefined;
    if (faqs?.length) put(`${base}.faqs`, faqs.map((row) => ({ q: row.q ?? "", a: row.a ?? "" })));
  } else if (resource === "projects") {
    const key = PROJECT_I18N_KEY[slug] ?? slug;
    put(`projects.items.${key}.title`, values.title);
    put(`projects.items.${key}.sector`, values.sector);
    put(`projects.items.${key}.client`, values.client);
    put(`projects.items.${key}.location`, values.location);
    put(`projects.items.${key}.value`, values.value);
    put(`projects.items.${key}.duration`, values.duration);
    put(`projects.items.${key}.scope`, values.summary);
    put(`projects.content.${key}.long`, values.long);
    put(`projects.content.${key}.highlights`, values.highlights);
  } else if (resource === "posts") {
    const base = `blogPage.posts.${slug}`;
    put(`${base}.title`, values.title);
    put(`${base}.excerpt`, values.summary);
    put(`${base}.date`, values.date);
    put(`${base}.paragraphs`, values.paragraphs);
  }
  return out;
}

/** Writes the mirrored translation paths into the stored translations document. */
async function syncTranslationOverrides(
  resource: string,
  slug: string,
  locale: string,
  values: Record<string, unknown>,
) {
  const overrides = translationOverridesFor(resource, slug, values);
  if (!overrides.length) return;
  const response = await api<{ items: ManagedSetting[] }>("/cms/settings");
  const stored = response.items.find(
    (entry) => entry.group_name === "translations" && entry.key === locale,
  );
  const document = stored && typeof stored.value === "object" && stored.value !== null
    ? cloneDocument(stored.value)
    : {};
  overrides.forEach(([path, value]) => setAtPath(document, path, value));
  await api("/cms/settings", {
    method: "PUT",
    body: JSON.stringify({
      group_name: "translations",
      key: locale,
      value: document,
      is_public: true,
    }),
  });
}

function SiteContentPage({ user, onTopbarActions }: { user: User; onTopbarActions: (node: ReactNode) => void }) {
  const [locale, setLocale] = useState<"en" | "ar">("en");
  const [document, setDocument] = useState<Record<string, unknown>>({});
  const [defaults, setDefaults] = useState<Record<string, unknown>>({});
  const [assets, setAssets] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [settingsResponse, defaultsResponse] = await Promise.all([
        api<{ items: ManagedSetting[] }>("/cms/settings"),
        fetch(`/api/site-defaults?locale=${locale}`).then((response) => response.json()),
      ]);
      const stored = settingsResponse.items.find(
        (item) => item.group_name === "translations" && item.key === locale,
      );
      const fallback =
        defaultsResponse && typeof defaultsResponse === "object" && !Array.isArray(defaultsResponse)
          ? defaultsResponse as Record<string, unknown>
          : {};
      setDefaults(cloneDocument(fallback));
      const nextDocument =
        stored?.value && typeof stored.value === "object" && !Array.isArray(stored.value)
          ? cloneDocument(stored.value)
          : cloneDocument(fallback);
      setDocument(nextDocument);
      setAssets(Object.fromEntries(
        settingsResponse.items
          .filter((item) => item.group_name === "assets" && typeof item.value === "string")
          .map((item) => [item.key, item.value as string]),
      ));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load site content");
    } finally {
      setLoaded(true);
    }
  }, [locale]);

  useEffect(() => { void load(); }, [load]);

  const postToIframe = useCallback((message: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(message, SITE_ORIGIN);
  }, []);

  function assetLabel(slotKey: string) {
    return assetSlots.find(([key]) => key === slotKey)?.[1] ?? slotKey;
  }
  function assetFallback(slotKey: string) {
    return assetSlots.find(([key]) => key === slotKey)?.[2] ?? "";
  }

  const save = useCallback(async () => {
    if (!can(user, "cms.manage_settings")) return false;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api("/cms/settings", {
        method: "PUT",
        body: JSON.stringify({
          group_name: "translations",
          key: locale,
          value: document,
          is_public: true,
        }),
      });
      await Promise.all(assetSlots.map(([key, , fallback]) =>
        api("/cms/settings", {
          method: "PUT",
          body: JSON.stringify({
            group_name: "assets",
            key,
            value: assets[key] || fallback,
            is_public: true,
          }),
        }),
      ));
      setNotice(`${locale.toUpperCase()} content and website images are live.`);
      iframeRef.current?.contentWindow?.postMessage({ type: "novarise:reload" }, SITE_ORIGIN);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save site content");
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, locale, document, assets]);

  const uploadAsset = useCallback(async (slotKey: string, label: string, file?: File) => {
    if (!file || !can(user, "cms.manage_media")) return undefined;
    setError("");
    setNotice("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "site-content");
      body.append("alt_en", label);
      const uploaded = await api<MediaItem>("/cms/media", { method: "POST", body });
      setAssets((current) => ({ ...current, [slotKey]: uploaded.public_url }));
      setNotice(`${label} image uploaded and selected. Save & publish to update the public site.`);
      return uploaded.public_url;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not upload image");
      return undefined;
    }
  }, [user]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== SITE_ORIGIN) return;
      const data = event.data as
        | { type?: string; path?: string; value?: string; slotKey?: string; url?: string; file?: File; locale?: string }
        | undefined;
      if (!data?.type) return;

      if (data.type === "novarise:ready") {
        if (editing) postToIframe({ type: "novarise:edit-mode", editing: true });
        return;
      }

      if (data.type === "novarise:locale-changed") {
        if (data.locale === "en" || data.locale === "ar") setLocale(data.locale);
        return;
      }

      if (data.type === "novarise:field-change" && data.path) {
        const path = data.path.split(".").map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));
        setDocument((current) => replaceAtPath(current, path, data.value ?? ""));
        return;
      }

      if (data.type === "novarise:asset-change" && data.slotKey && data.url) {
        const slotKey = data.slotKey;
        const url = data.url;
        setAssets((current) => ({ ...current, [slotKey]: url }));
        postToIframe({ type: "novarise:asset-updated", slotKey, url });
        return;
      }

      if (data.type === "novarise:asset-upload" && data.slotKey && data.file) {
        const slotKey = data.slotKey;
        void uploadAsset(slotKey, assetLabel(slotKey), data.file).then((url) => {
          if (url) postToIframe({ type: "novarise:asset-updated", slotKey, url });
        });
        return;
      }

      if (data.type === "novarise:asset-remove" && data.slotKey) {
        const slotKey = data.slotKey;
        const fallback = assetFallback(slotKey);
        setAssets((current) => ({ ...current, [slotKey]: fallback }));
        postToIframe({ type: "novarise:asset-updated", slotKey, url: fallback });
        return;
      }

      if (data.type === "novarise:publish") {
        void save().then((ok) => postToIframe({ type: "novarise:published", ok }));
        return;
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [editing, postToIframe, save, uploadAsset]);

  const togglePenMode = useCallback(() => {
    setEditing((current) => {
      const next = !current;
      postToIframe({ type: "novarise:edit-mode", editing: next });
      return next;
    });
  }, [postToIframe]);

  const restoreDefaults = useCallback(() => {
    if (!window.confirm(`Restore the bundled ${locale.toUpperCase()} copy in this editor?`)) return;
    const next = cloneDocument(defaults);
    setDocument(next);
    setNotice("Defaults restored in the editor. Save to publish them.");
  }, [locale, defaults]);

  useEffect(() => {
    const canManage = can(user, "cms.manage_settings");
    onTopbarActions(
      <div className="topbar-site-actions">
        {(error || notice) && (
          <span className={`topbar-flash ${error ? "is-error" : "is-success"}`}>{error || notice}</span>
        )}
        <div className="topbar-kebab">
          <button type="button" className="icon-button" onClick={() => setMenuOpen((open) => !open)} title="More actions">
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <>
              <button type="button" className="dropdown-backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
              <div className="topbar-kebab-menu">
                <Link href="/navigation" onClick={() => setMenuOpen(false)}>Manage menu links</Link>
                <button type="button" onClick={() => { setMenuOpen(false); restoreDefaults(); }}>Restore defaults</button>
              </div>
            </>
          )}
        </div>
        {canManage && (
          <>
            <button
              type="button"
              className={`secondary-button icon-only ${editing ? "active" : ""}`}
              onClick={togglePenMode}
              title={editing ? "Turn off pen mode" : "Turn on pen mode"}
            >
              <Pencil size={15} />
            </button>
            <button className="primary-button compact" onClick={save} disabled={saving}>
              {saving ? "Publishing..." : "Save & publish"}
            </button>
          </>
        )}
      </div>,
    );
    return () => onTopbarActions(null);
  }, [editing, saving, error, notice, menuOpen, user, save, togglePenMode, restoreDefaults, onTopbarActions]);

  return !loaded ? <Skeleton /> : (
    <section className="site-content-shell preview-shell">
      <div className="panel preview-frame-host">
        <div className="mini-browser-bar">
          <span><i /> <i /> <i /></span>
          <strong>{SITE_URL.replace(/^https?:\/\//, "")}</strong>
          <a href={SITE_URL} target="_blank" rel="noreferrer">
            <Globe2 size={14} /> Open live
          </a>
        </div>
        <iframe
          ref={iframeRef}
          src={`${SITE_URL}/?novarise_preview=1`}
          className="preview-frame"
          title="Website preview"
        />
      </div>
    </section>
  );
}

function AssetPreview({ src, label, compact }: { src: string; label: string; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  const previewSrc = src.startsWith("/") ? `https://novarisesa.com${src}` : src;
  const cls = compact ? "asset-preview compact" : "asset-preview";

  useEffect(() => {
    setFailed(false);
  }, [previewSrc]);

  if (!previewSrc || failed) {
    return (
      <div className={`${cls} empty-preview`}>
        <ImageIcon size={compact ? 18 : 22} />
        {!compact && <strong>{failed ? "Preview unavailable" : "No image selected"}</strong>}
        {!compact && <small>{failed ? previewSrc : "Choose a media file or paste an image URL."}</small>}
      </div>
    );
  }

  return (
    <div className={cls}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={previewSrc} alt={`${label} preview`} onError={() => setFailed(true)} />
    </div>
  );
}

function publicPageHref(resource: string, slug: string): string | null {
  if (!slug) return null;
  if (resource === "services") return `${SITE_ORIGIN}/services/${slug}`;
  if (resource === "projects") return `${SITE_ORIGIN}/projects/${slug}`;
  if (resource === "posts") return `${SITE_ORIGIN}/blog/${slug}`;
  if (resource === "events") return `${SITE_ORIGIN}/careers`;
  if (resource === "requirements") return `${SITE_ORIGIN}/requirements`;
  return null;
}

function contentDetailToUpsertPayload(
  resource: string,
  detail: ContentDetail,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const b = detail.body;
  const base: Record<string, unknown> = {
    title: detail.title,
    slug: detail.slug,
    locale: "en",
    summary: detail.summary ?? undefined,
    status: detail.status,
    is_featured: detail.is_featured,
    sort_order: Number(detail.extra.sort_order ?? 0),
    meta_title: detail.meta_title ?? undefined,
    meta_description: detail.meta_description ?? undefined,
    body: b,
  };
  if (resource === "services") {
    Object.assign(base, {
      number: b.number,
      icon: b.icon,
      hero_media_id: b.hero_media_id ?? null,
      stats: Array.isArray(b.stats) ? b.stats : [],
      capabilities: Array.isArray(b.capabilities) ? b.capabilities : [],
      process: Array.isArray(b.process) ? b.process : [],
      certifications: Array.isArray(b.certifications) ? b.certifications : [],
    });
  } else if (resource === "projects") {
    Object.assign(base, {
      client_name: b.client_name,
      location: b.location,
      started_on: b.started_on,
      completed_on: b.completed_on,
      featured_media_id: b.featured_media_id ?? null,
      facts: b.facts && typeof b.facts === "object" ? b.facts : {},
    });
  } else if (resource === "requirements") {
    Object.assign(base, {
      code: detail.slug,
      headcount: detail.extra.headcount,
      location: detail.extra.location,
      project_name: detail.extra.project_name,
      rate_amount: b.rate_amount || null,
      rate_currency: b.rate_currency || "SAR",
      rate_unit: b.rate_unit || null,
      opens_at: b.opens_at || null,
      closes_at: b.closes_at || null,
      contacts: Array.isArray(b.contacts) ? b.contacts : [],
    });
  } else if (resource === "posts") {
    Object.assign(base, {
      featured_media_id: b.featured_media_id ?? null,
      category_id: detail.extra.category_id || null,
      tag_ids: Array.isArray(detail.extra.tag_ids) ? detail.extra.tag_ids : [],
    });
  } else if (resource === "events") {
    Object.assign(base, {
      location: b.location,
      started_on: b.starts_on,
      completed_on: b.ends_on,
      featured_media_id: b.featured_media_id ?? null,
    });
  }
  return { ...base, ...overrides };
}

function ContentPage({ resource, user }: { resource: string; user: User }) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ContentItem | "new" | null>(null);
  const [reordering, setReordering] = useState("");
  const title = contentNav.find(([key]) => key === resource)?.[1] ?? humanize(resource);
  const load = useCallback(() => {
    setBusy(true);
    api<{ items: ContentItem[] }>(`/cms/content/${resource}`)
      .then((response) => setItems(response.items))
      .finally(() => setBusy(false));
  }, [resource]);
  useEffect(load, [load]);
  const visible = useMemo(
    () => items
      .filter((item) => `${item.title} ${item.slug}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => Number(a.extra.sort_order ?? 0) - Number(b.extra.sort_order ?? 0)),
    [items, query],
  );
  async function archive(item: ContentItem) {
    if (!window.confirm(`Remove “${item.title}” from the live site?`)) return;
    await api(`/cms/content/${resource}/${item.id}`, { method: "DELETE" });
    load();
  }
  async function move(item: ContentItem, direction: -1 | 1) {
    const index = visible.findIndex((i) => i.id === item.id);
    const neighbor = visible[index + direction];
    if (!neighbor) return;
    setReordering(item.id);
    try {
      const [a, b] = await Promise.all([
        api<ContentDetail>(`/cms/content/${resource}/${item.id}`),
        api<ContentDetail>(`/cms/content/${resource}/${neighbor.id}`),
      ]);
      await Promise.all([
        api(`/cms/content/${resource}/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify(contentDetailToUpsertPayload(resource, a, { sort_order: Number(b.extra.sort_order ?? 0) })),
        }),
        api(`/cms/content/${resource}/${neighbor.id}`, {
          method: "PATCH",
          body: JSON.stringify(contentDetailToUpsertPayload(resource, b, { sort_order: Number(a.extra.sort_order ?? 0) })),
        }),
      ]);
      load();
    } finally {
      setReordering("");
    }
  }
  return <>
    <PageHead
      eyebrow="Website content"
      title={title}
      copy={`Create, review and publish ${title.toLowerCase()} across the NOVARISE website.`}
      action={can(user, "cms.manage_content") ? (
        <button className="primary-button compact" onClick={() => setModal("new")}>
          <Plus size={17} /> Add {title.replace(/s$/, "")}
        </button>
      ) : undefined}
    />
    <div className="panel table-panel">
      <div className="table-tools">
        <div className="search-input">
          <Search size={17} />
          <input placeholder={`Search ${title.toLowerCase()}...`} value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <span>{visible.length} items</span>
      </div>
      {busy ? <Skeleton /> : visible.length ? (
        <div className="content-grid">
          {visible.map((item, index) => {
            const thumb = (item.extra.thumbnail_url as string | undefined)
              || assetSlots.find(([key]) => key === `${resource}.${item.slug}.hero`)?.[2]
              || "";
            return (
              <article className="content-card" key={item.id}>
                <div className="content-card-media">
                  <AssetPreview src={thumb} label={item.title} compact />
                  <div className="content-card-badges">
                    <Badge value={item.status} />
                    {item.is_featured && <span className="badge badge-featured">Featured</span>}
                  </div>
                </div>
                <div className="content-card-body">
                  <strong title={item.title}>{item.title}</strong>
                  <small>/{item.slug}</small>
                </div>
                <div className="content-card-foot">
                  <span>Updated {new Date(item.updated_at).toLocaleDateString()}</span>
                  <span className="content-card-actions">
                    {can(user, "cms.manage_content") && (
                      <span className="reorder-buttons">
                        <button
                          onClick={() => move(item, -1)}
                          disabled={index === 0 || reordering === item.id}
                          title="Move up"
                        ><ChevronUp size={14} /></button>
                        <button
                          onClick={() => move(item, 1)}
                          disabled={index === visible.length - 1 || reordering === item.id}
                          title="Move down"
                        ><ChevronDown size={14} /></button>
                      </span>
                    )}
                    <button onClick={() => setModal(item)} title="Edit"><Pencil size={14} /></button>
                    {can(user, "cms.manage_content") && (
                      <button onClick={() => archive(item)} title="Remove"><Trash2 size={14} /></button>
                    )}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      ) : <Empty copy={`No ${title.toLowerCase()} yet. Create the first one to get started.`} />}
    </div>
    {modal && (
      <ContentModal
        resource={resource}
        item={modal === "new" ? null : modal}
        user={user}
        onClose={() => setModal(null)}
        onSaved={() => { setModal(null); load(); }}
      />
    )}
  </>;
}

function ListEditor<T>({
  label,
  items,
  onChange,
  empty,
  renderItem,
}: {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  empty: T;
  renderItem: (item: T, setItem: (value: T) => void) => ReactNode;
}) {
  function add() {
    onChange([...items, empty]);
  }
  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }
  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }
  return (
    <div className="list-editor full">
      <div className="list-editor-head">
        <span>{label}</span>
        <button type="button" className="secondary-button mini" onClick={add}>+ Add</button>
      </div>
      {items.map((item, index) => (
        <div className="list-editor-row" key={index}>
          <div className="list-editor-fields">
            {renderItem(item, (value) => onChange(items.map((it, i) => (i === index ? value : it))))}
          </div>
          <div className="list-editor-row-actions">
            <button type="button" onClick={() => move(index, -1)} disabled={index === 0} title="Move up"><ChevronUp size={14} /></button>
            <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} title="Move down"><ChevronDown size={14} /></button>
            <button type="button" onClick={() => remove(index)} title="Remove"><Trash2 size={14} /></button>
          </div>
        </div>
      ))}
      {!items.length && <p className="list-editor-empty">Nothing yet — click + Add.</p>}
    </div>
  );
}

function ContentModal({
  resource,
  item,
  user,
  onClose,
  onSaved,
}: {
  resource: string;
  item: ContentItem | null;
  user: User;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isRequirement = resource === "requirements";
  const isService = resource === "services";
  const isPost = resource === "posts";
  const supportsMedia = ["services", "projects", "posts", "events"].includes(resource);
  const [title, setTitle] = useState(item?.title ?? "");
  const [slug, setSlug] = useState(item?.slug ?? "");
  const [summary, setSummary] = useState(item?.summary ?? "");
  const [status, setStatus] = useState(item?.status ?? (isRequirement ? "active" : "draft"));
  const [headcount, setHeadcount] = useState(Number(item?.extra?.headcount ?? 1));
  const [location, setLocation] = useState(String(item?.extra?.location ?? ""));
  const [projectName, setProjectName] = useState(String(item?.extra?.project_name ?? ""));
  const [featured, setFeatured] = useState(item?.is_featured ?? false);
  const [sortOrder, setSortOrder] = useState(Number(item?.extra?.sort_order ?? 0));
  const [mediaId, setMediaId] = useState(String(item?.extra?.hero_media_id ?? item?.extra?.featured_media_id ?? ""));
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [locale, setLocale] = useState("en");
  const [eyebrow, setEyebrow] = useState("");
  const [lead, setLead] = useState("");
  const [intro, setIntro] = useState("");
  const [approval, setApproval] = useState("");
  const [duration, setDuration] = useState("");
  const [salaryCycle, setSalaryCycle] = useState("");
  const [food, setFood] = useState("");
  const [accommodation, setAccommodation] = useState("");
  const [documents, setDocuments] = useState("");
  const [rateAmount, setRateAmount] = useState("");
  const [rateCurrency, setRateCurrency] = useState("SAR");
  const [rateUnit, setRateUnit] = useState("hour");
  const [bodyJson, setBodyJson] = useState("{}");
  const [bodyError, setBodyError] = useState("");
  const [saving, setSaving] = useState(false);
  const isProject = resource === "projects";
  const [serviceIcon, setServiceIcon] = useState("Building2");
  const [serviceNum, setServiceNum] = useState("");
  const [statsList, setStatsList] = useState<{ value: string; suffix: string; label: string }[]>([]);
  const [subServicesList, setSubServicesList] = useState<{ title: string; desc: string; icon: string }[]>([]);
  const [capabilitiesRows, setCapabilitiesRows] = useState<{ label: string; value: string }[]>([]);
  const [processList, setProcessList] = useState<{ num: string; title: string; desc: string }[]>([]);
  const [certificationsList, setCertificationsList] = useState<string[]>([]);
  const [faqsList, setFaqsList] = useState<{ q: string; a: string }[]>([]);
  const [projectClient, setProjectClient] = useState("");
  const [projectSector, setProjectSector] = useState("");
  const [projectValue, setProjectValue] = useState("");
  const [projectDuration, setProjectDuration] = useState("");
  const [projectLong, setProjectLong] = useState<string[]>([]);
  const [projectHighlights, setProjectHighlights] = useState<string[]>([]);
  const [contactsList, setContactsList] = useState<{ display: string; raw: string; whatsapp: boolean }[]>([]);
  const [postCategory, setPostCategory] = useState("Insights");
  const [postAuthor, setPostAuthor] = useState("");
  const [postAuthorRole, setPostAuthorRole] = useState("");
  const [postReadMins, setPostReadMins] = useState(5);
  const [postDate, setPostDate] = useState("");
  const [postParagraphs, setPostParagraphs] = useState<string[]>([]);
  const isEvent = resource === "events";
  const [eventType, setEventType] = useState("Conference");
  const [eventDateDisplay, setEventDateDisplay] = useState("");
  const [eventStartsOn, setEventStartsOn] = useState("");
  const [eventEndsOn, setEventEndsOn] = useState("");

  useEffect(() => {
    if (!supportsMedia) return;
    api<{ items: MediaItem[] }>("/cms/media?limit=100").then((response) => setMediaItems(response.items));
  }, [supportsMedia]);

  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    api<ContentDetail>(`/cms/content/${resource}/${item.id}?locale=${locale}`).then((detail) => {
      if (cancelled) return;
      setTitle(detail.title);
      setSlug(detail.slug);
      setSummary(detail.summary ?? "");
      setStatus(detail.status);
      setMetaTitle(detail.meta_title ?? "");
      setMetaDescription(detail.meta_description ?? "");
      setBodyJson(JSON.stringify(detail.body ?? {}, null, 2));
      setEyebrow(String(detail.body.eyebrow ?? ""));
      setLead(String(detail.body.lead ?? ""));
      setIntro(String(detail.body.intro ?? ""));
      setApproval(String(detail.body.approval ?? ""));
      setDuration(String(detail.body.duration ?? ""));
      setSalaryCycle(String(detail.body.salary_cycle ?? ""));
      setFood(String(detail.body.food ?? ""));
      setAccommodation(String(detail.body.accommodation ?? ""));
      setDocuments(Array.isArray(detail.body.documents) ? detail.body.documents.join("\n") : "");
      setRateAmount(String(detail.body.rate_amount ?? ""));
      setRateCurrency(String(detail.body.rate_currency ?? "SAR"));
      setRateUnit(String(detail.body.rate_unit ?? "hour"));
      setServiceIcon(String(detail.body.icon ?? "Building2"));
      setServiceNum(String(detail.body.number ?? ""));
      setStatsList(Array.isArray(detail.body.stats) ? detail.body.stats.map((s) => {
        const row = s as { value?: unknown; suffix?: unknown; label?: unknown };
        return { value: String(row.value ?? ""), suffix: String(row.suffix ?? ""), label: String(row.label ?? "") };
      }) : []);
      setSubServicesList(Array.isArray(detail.body.sub_services) ? detail.body.sub_services.map((s) => {
        const row = s as { title?: unknown; desc?: unknown; icon?: unknown };
        return { title: String(row.title ?? ""), desc: String(row.desc ?? ""), icon: String(row.icon ?? "Wrench") };
      }) : []);
      setCapabilitiesRows(Array.isArray(detail.body.capabilities) ? detail.body.capabilities.map((r) => {
        const row = r as { label?: unknown; value?: unknown };
        return { label: String(row.label ?? ""), value: String(row.value ?? "") };
      }) : []);
      setProcessList(Array.isArray(detail.body.process) ? detail.body.process.map((p) => {
        const row = p as { num?: unknown; title?: unknown; desc?: unknown };
        return { num: String(row.num ?? ""), title: String(row.title ?? ""), desc: String(row.desc ?? "") };
      }) : []);
      setCertificationsList(Array.isArray(detail.body.certifications) ? detail.body.certifications.map(String) : []);
      setFaqsList(Array.isArray(detail.body.faqs) ? detail.body.faqs.map((f) => {
        const row = f as { q?: unknown; a?: unknown };
        return { q: String(row.q ?? ""), a: String(row.a ?? "") };
      }) : []);
      setProjectClient(String(detail.body.client_name ?? ""));
      setProjectSector(String(detail.body.sector ?? ""));
      setProjectValue(String(detail.body.value ?? ""));
      setProjectDuration(String(detail.body.duration ?? ""));
      setProjectLong(Array.isArray(detail.body.long) ? detail.body.long.map(String) : []);
      setProjectHighlights(Array.isArray(detail.body.highlights) ? detail.body.highlights.map(String) : []);
      setContactsList(Array.isArray(detail.body.contacts) ? detail.body.contacts.map((c) => {
        const row = c as { display?: unknown; raw?: unknown; whatsapp?: unknown };
        return { display: String(row.display ?? ""), raw: String(row.raw ?? ""), whatsapp: Boolean(row.whatsapp) };
      }) : []);
      setPostCategory(String(detail.body.category ?? "Insights"));
      setPostAuthor(String(detail.body.author ?? ""));
      setPostAuthorRole(String(detail.body.authorRole ?? ""));
      setPostReadMins(Number(detail.body.readMins ?? 5));
      setPostDate(String(detail.body.date ?? ""));
      setPostParagraphs(Array.isArray(detail.body.paragraphs) ? detail.body.paragraphs.map(String) : []);
      setEventType(String(detail.body.event_type ?? "Conference"));
      setEventDateDisplay(String(detail.body.date_display ?? ""));
      setEventStartsOn(String(detail.body.starts_on ?? "").slice(0, 10));
      setEventEndsOn(String(detail.body.ends_on ?? "").slice(0, 10));
      setProjectName(String(detail.extra.project_name ?? ""));
      setLocation(String(detail.extra.location ?? ""));
      setHeadcount(Number(detail.extra.headcount ?? 1));
      setFeatured(detail.is_featured);
      setSortOrder(Number(detail.extra.sort_order ?? 0));
      setMediaId(String(
        detail.body.hero_media_id ??
        detail.body.featured_media_id ??
        detail.extra.hero_media_id ??
        detail.extra.featured_media_id ??
        "",
      ));
    });
    return () => { cancelled = true; };
  }, [item, resource, locale]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setBodyError("");
    let parsedBody: Record<string, unknown> = {};
    try {
      if (isService) {
        parsedBody = {
          eyebrow,
          lead,
          intro,
          number: serviceNum || undefined,
          icon: serviceIcon,
          stats: statsList,
          sub_services: subServicesList,
          capabilities: capabilitiesRows,
          process: processList,
          certifications: certificationsList,
          faqs: faqsList,
        };
      } else if (isProject) {
        parsedBody = {
          client_name: projectClient || undefined,
          sector: projectSector,
          value: projectValue,
          duration: projectDuration,
          long: projectLong.filter(Boolean),
          highlights: projectHighlights.filter(Boolean),
        };
      } else if (isRequirement) {
        let existing: Record<string, unknown> = {};
        try {
          existing = bodyJson.trim() ? JSON.parse(bodyJson) : {};
        } catch { /* keep empty */ }
        parsedBody = {
          ...existing,
          approval: approval || null,
          duration: duration || null,
          salary_cycle: salaryCycle || null,
          food: food || null,
          accommodation: accommodation || null,
          documents: documents.split("\n").map((line) => line.trim()).filter(Boolean),
          contacts: contactsList.filter((c) => c.raw.trim()),
          rate_amount: rateAmount.trim() || null,
          rate_currency: rateCurrency.trim() || "SAR",
          rate_unit: rateUnit.trim() || null,
        };
      } else if (isPost) {
        parsedBody = {
          category: postCategory,
          author: postAuthor,
          authorRole: postAuthorRole,
          readMins: postReadMins,
          date: postDate,
          paragraphs: postParagraphs.filter(Boolean),
        };
      } else if (isEvent) {
        parsedBody = {
          event_type: eventType,
          date_display: eventDateDisplay,
        };
      } else {
        parsedBody = bodyJson.trim() ? JSON.parse(bodyJson) : {};
      }
      if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
        throw new Error("Body must be a JSON object");
      }
    } catch {
      setSaving(false);
      setBodyError("Body content is invalid. Please reload this item and try again.");
      return;
    }
    const body = {
      title,
      slug,
      code: isRequirement ? slug : undefined,
      summary,
      status,
      is_featured: featured,
      sort_order: sortOrder,
      headcount: isRequirement ? headcount : undefined,
      location: location || undefined,
      project_name: projectName || undefined,
      client_name: typeof parsedBody.client_name === "string" ? parsedBody.client_name : undefined,
      number: typeof parsedBody.number === "string" ? parsedBody.number : undefined,
      icon: typeof parsedBody.icon === "string" ? parsedBody.icon : undefined,
      hero_media_id: isService && mediaId ? mediaId : null,
      featured_media_id: (resource === "projects" || isPost || isEvent) && mediaId ? mediaId : null,
      stats: Array.isArray(parsedBody.stats) ? parsedBody.stats : [],
      capabilities: Array.isArray(parsedBody.capabilities) ? parsedBody.capabilities : [],
      process: Array.isArray(parsedBody.process) ? parsedBody.process : [],
      certifications: Array.isArray(parsedBody.certifications) ? parsedBody.certifications : [],
      facts: parsedBody.facts && typeof parsedBody.facts === "object" && !Array.isArray(parsedBody.facts)
        ? parsedBody.facts
        : {},
      rate_amount: parsedBody.rate_amount || null,
      rate_currency: parsedBody.rate_currency || "SAR",
      rate_unit: parsedBody.rate_unit || null,
      opens_at: parsedBody.opens_at || null,
      closes_at: parsedBody.closes_at || null,
      started_on: isEvent ? (eventStartsOn || null) : undefined,
      completed_on: isEvent ? (eventEndsOn || null) : undefined,
      contacts: Array.isArray(parsedBody.contacts) ? parsedBody.contacts : [],
      body: parsedBody,
      locale,
      meta_title: metaTitle || undefined,
      meta_description: metaDescription || undefined,
    };
    try {
      await api(`/cms/content/${resource}${item ? `/${item.id}` : ""}`, {
        method: item ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      // Mirror the same fields into the pen-mode translation store, otherwise the
      // public site keeps rendering the old i18n copy and the save looks ignored.
      await syncTranslationOverrides(resource, slug, locale, {
        title,
        summary,
        eyebrow,
        lead,
        intro,
        stats: statsList,
        subServices: subServicesList,
        capabilities: capabilitiesRows,
        process: processList,
        certifications: certificationsList,
        faqs: faqsList,
        sector: projectSector,
        client: projectClient,
        location,
        value: projectValue,
        duration: projectDuration,
        long: projectLong.filter(Boolean),
        highlights: projectHighlights.filter(Boolean),
        date: postDate,
        paragraphs: postParagraphs.filter(Boolean),
      });
    } catch (reason) {
      setSaving(false);
      setBodyError(reason instanceof Error ? reason.message : "Could not save this item.");
      return;
    }
    onSaved();
  }

  const canPublish = can(user, "cms.publish");
  const statusOptions = isRequirement
    ? ["draft", "active", "urgent", "closed"]
    : canPublish
      ? ["draft", "published", "archived"]
      : ["draft", "archived"];
  const selectedMedia = mediaItems.find((media) => media.id === mediaId);
  const heroFallback = assetSlots.find(([key]) => key === `${resource}.${slug}.hero`)?.[2] ?? "";
  const previewSrc = selectedMedia?.public_url || heroFallback;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal wide" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">{item ? "Edit content" : "New content"}</p>
            <h2>{item ? item.title : `Create ${humanize(resource.replace(/s$/, ""))}`}</h2>
            {item && publicPageHref(resource, slug) && (
              <a className="modal-live-link" href={publicPageHref(resource, slug) as string} target="_blank" rel="noreferrer">
                <Globe2 size={12} /> View live page
              </a>
            )}
          </div>
          <button type="button" onClick={onClose}><X /></button>
        </div>
        <div className="form-grid">
          <label className="full">Title
            <input value={title} onChange={(event) => { setTitle(event.target.value); if (!item) setSlug(slugify(event.target.value)); }} required />
          </label>
          <label>Identifier / slug
            <input value={slug} onChange={(event) => setSlug(slugify(event.target.value))} required />
          </label>
          <div className="full modal-language-row">
            <span>Language</span>
            <div className="segmented language-tabs" aria-label="Content language">
              <button type="button" className={locale === "en" ? "active" : ""} onClick={() => setLocale("en")}>English</button>
              <button type="button" className={locale === "ar" ? "active" : ""} onClick={() => setLocale("ar")}>Arabic</button>
            </div>
          </div>
          {supportsMedia && <>
            <div className="full form-divider"><ImageIcon size={13} /><span>Primary image</span></div>
            <label className="full">
              <AssetPreview src={previewSrc} label="Primary image" />
              <select value={mediaId} onChange={(event) => setMediaId(event.target.value)}>
                <option value="">{heroFallback ? "Current live image (unchanged)" : "No managed image"}</option>
                {mediaItems.filter((media) => media.mime_type.startsWith("image/")).map((media) => (
                  <option value={media.id} key={media.id}>{media.file_name}</option>
                ))}
              </select>
              {!mediaId && heroFallback && (
                <small className="field-hint">
                  This is the image live on the site now. To replace it, use the pen icon on the Site content page and click the image directly — that also works for brand-new items after their first save.
                </small>
              )}
            </label>
          </>}
          <div className="full form-divider"><Settings size={13} /><span>Publishing</span></div>
          <label>Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {statusOptions.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          {!isRequirement && <label>Sort order
            <input type="number" min="0" value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} />
          </label>}
          {!isRequirement && <label className="check-row">
            <input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} />
            Feature this item
          </label>}
          {(isRequirement || isProject || isEvent) && (
            <label>Location<input value={location} onChange={(event) => setLocation(event.target.value)} /></label>
          )}
          {isRequirement && <>
            <div className="full form-divider"><BriefcaseBusiness size={13} /><span>Requirement details</span></div>
            <label>Headcount<input type="number" min="1" value={headcount} onChange={(event) => setHeadcount(Number(event.target.value))} /></label>
            <label className="full">Project name<input value={projectName} onChange={(event) => setProjectName(event.target.value)} /></label>
            <label>Approval<input value={approval} onChange={(event) => setApproval(event.target.value)} /></label>
            <label>Duration<input value={duration} onChange={(event) => setDuration(event.target.value)} /></label>
            <label>Pay rate
              <input type="number" min="0" step="0.01" placeholder="e.g. 33" value={rateAmount} onChange={(event) => setRateAmount(event.target.value)} />
              <small className="field-hint">Shown on the site as “{rateAmount || "33"} {rateCurrency || "SAR"} / {rateUnit || "hour"}”.</small>
            </label>
            <label>Currency
              <select value={rateCurrency} onChange={(event) => setRateCurrency(event.target.value)}>
                {["SAR", "USD", "AED", "INR", "BDT"].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label>Rate unit
              <select value={rateUnit} onChange={(event) => setRateUnit(event.target.value)}>
                {["hour", "day", "month", "shift", "project"].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label>Salary cycle<input value={salaryCycle} onChange={(event) => setSalaryCycle(event.target.value)} /></label>
            <label>Food<input value={food} onChange={(event) => setFood(event.target.value)} /></label>
            <label className="full">Accommodation<input value={accommodation} onChange={(event) => setAccommodation(event.target.value)} /></label>
            <label className="full">Documents (one per line)<textarea rows={4} value={documents} onChange={(event) => setDocuments(event.target.value)} /></label>
            <ListEditor
              label="Contact numbers"
              items={contactsList}
              onChange={setContactsList}
              empty={{ display: "", raw: "", whatsapp: true }}
              renderItem={(c, set) => <>
                <input placeholder="Display, e.g. +966 57 875 3016" value={c.display} onChange={(event) => set({ ...c, display: event.target.value })} />
                <input placeholder="Digits only, e.g. 966578753016" value={c.raw} onChange={(event) => set({ ...c, raw: event.target.value })} />
                <label className="check-row mini"><input type="checkbox" checked={c.whatsapp} onChange={(event) => set({ ...c, whatsapp: event.target.checked })} /> WhatsApp</label>
              </>}
            />
          </>}
          {isService && <>
            <div className="full form-divider"><FilePenLine size={13} /><span>Service details</span></div>
            <label>Eyebrow<input value={eyebrow} onChange={(event) => setEyebrow(event.target.value)} /></label>
            <label>Lead<input value={lead} onChange={(event) => setLead(event.target.value)} /></label>
            <label className="full">Intro<textarea rows={4} value={intro} onChange={(event) => setIntro(event.target.value)} /></label>
            <label>Display number<input placeholder="e.g. 07" value={serviceNum} onChange={(event) => setServiceNum(event.target.value)} /></label>
            <label>Icon
              <select value={serviceIcon} onChange={(event) => setServiceIcon(event.target.value)}>
                {SERVICE_ICON_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <div className="full form-divider"><FolderKanban size={13} /><span>Structured sections</span></div>
            <ListEditor
              label="Stats"
              items={statsList}
              onChange={setStatsList}
              empty={{ value: "", suffix: "", label: "" }}
              renderItem={(s, set) => <>
                <input placeholder="Value, e.g. 12" value={s.value} onChange={(event) => set({ ...s, value: event.target.value })} />
                <input placeholder="Suffix, e.g. M+" value={s.suffix} onChange={(event) => set({ ...s, suffix: event.target.value })} />
                <input placeholder="Label, e.g. Safe Man-hours" value={s.label} onChange={(event) => set({ ...s, label: event.target.value })} />
              </>}
            />
            <ListEditor
              label="Sub-services"
              items={subServicesList}
              onChange={setSubServicesList}
              empty={{ title: "", desc: "", icon: "Wrench" }}
              renderItem={(s, set) => <>
                <input placeholder="Title" value={s.title} onChange={(event) => set({ ...s, title: event.target.value })} />
                <select value={s.icon || "Wrench"} onChange={(event) => set({ ...s, icon: event.target.value })}>
                  {SERVICE_ICON_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                <input placeholder="Description" value={s.desc} onChange={(event) => set({ ...s, desc: event.target.value })} />
              </>}
            />
            <ListEditor
              label="Capabilities table"
              items={capabilitiesRows}
              onChange={setCapabilitiesRows}
              empty={{ label: "", value: "" }}
              renderItem={(r, set) => <>
                <input placeholder="Label, e.g. Concrete capacity / day" value={r.label} onChange={(event) => set({ ...r, label: event.target.value })} />
                <input placeholder="Value, e.g. Up to 1,200 m³" value={r.value} onChange={(event) => set({ ...r, value: event.target.value })} />
              </>}
            />
            <ListEditor
              label="Process steps"
              items={processList}
              onChange={setProcessList}
              empty={{ num: String(processList.length + 1).padStart(2, "0"), title: "", desc: "" }}
              renderItem={(p, set) => <>
                <input placeholder="Step no., e.g. 01" value={p.num} onChange={(event) => set({ ...p, num: event.target.value })} />
                <input placeholder="Title" value={p.title} onChange={(event) => set({ ...p, title: event.target.value })} />
                <input placeholder="Description" value={p.desc} onChange={(event) => set({ ...p, desc: event.target.value })} />
              </>}
            />
            <ListEditor
              label="Certifications"
              items={certificationsList}
              onChange={setCertificationsList}
              empty=""
              renderItem={(c, set) => <input placeholder="e.g. ISO 9001:2015" value={c} onChange={(event) => set(event.target.value)} />}
            />
            <ListEditor
              label="FAQs"
              items={faqsList}
              onChange={setFaqsList}
              empty={{ q: "", a: "" }}
              renderItem={(f, set) => <>
                <input placeholder="Question" value={f.q} onChange={(event) => set({ ...f, q: event.target.value })} />
                <input placeholder="Answer" value={f.a} onChange={(event) => set({ ...f, a: event.target.value })} />
              </>}
            />
          </>}
          {isProject && <>
            <div className="full form-divider"><FolderKanban size={13} /><span>Project details</span></div>
            <label>Client<input value={projectClient} onChange={(event) => setProjectClient(event.target.value)} /></label>
            <label>Sector<input placeholder="e.g. Giga-project" value={projectSector} onChange={(event) => setProjectSector(event.target.value)} /></label>
            <label>Value<input placeholder="e.g. USD 500B+" value={projectValue} onChange={(event) => setProjectValue(event.target.value)} /></label>
            <label>Duration<input placeholder="e.g. 2024 – Ongoing" value={projectDuration} onChange={(event) => setProjectDuration(event.target.value)} /></label>
            <ListEditor
              label="Long description (paragraphs)"
              items={projectLong}
              onChange={setProjectLong}
              empty=""
              renderItem={(p, set) => <textarea rows={3} value={p} onChange={(event) => set(event.target.value)} />}
            />
            <ListEditor
              label="Highlights"
              items={projectHighlights}
              onChange={setProjectHighlights}
              empty=""
              renderItem={(h, set) => <input value={h} onChange={(event) => set(event.target.value)} />}
            />
          </>}
          {isEvent && <>
            <div className="full form-divider"><CalendarDays size={13} /><span>Event details</span></div>
            <label>Type
              <select value={eventType} onChange={(event) => setEventType(event.target.value)}>
                {["Conference", "Exhibition", "Site Visit", "Webinar"].map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>Display date<input placeholder="e.g. June 18 – 20, 2026" value={eventDateDisplay} onChange={(event) => setEventDateDisplay(event.target.value)} /></label>
            <label>Starts on<input type="date" value={eventStartsOn} onChange={(event) => setEventStartsOn(event.target.value)} /></label>
            <label>Ends on<input type="date" value={eventEndsOn} onChange={(event) => setEventEndsOn(event.target.value)} /></label>
          </>}
          {isPost && <>
            <div className="full form-divider"><Newspaper size={13} /><span>Article details</span></div>
            <label>Card badge
              <select value={postCategory} onChange={(event) => setPostCategory(event.target.value)}>
                {["Insights", "Case Study", "Safety", "Vision 2030", "Industry"].map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>Display date<input placeholder="e.g. May 12, 2026" value={postDate} onChange={(event) => setPostDate(event.target.value)} /></label>
            <label>Author<input value={postAuthor} onChange={(event) => setPostAuthor(event.target.value)} /></label>
            <label>Author role<input value={postAuthorRole} onChange={(event) => setPostAuthorRole(event.target.value)} /></label>
            <label>Read time (minutes)<input type="number" min="1" value={postReadMins} onChange={(event) => setPostReadMins(Number(event.target.value))} /></label>
            <ListEditor
              label="Article body (paragraphs)"
              items={postParagraphs}
              onChange={setPostParagraphs}
              empty=""
              renderItem={(p, set) => <textarea rows={4} value={p} onChange={(event) => set(event.target.value)} />}
            />
          </>}
          <div className="full form-divider"><FileText size={13} /><span>Summary &amp; SEO</span></div>
          <label className="full">Summary<textarea rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
          {bodyError && <p className="form-error full">{bodyError}</p>}
          <label>Meta title<input value={metaTitle} onChange={(event) => setMetaTitle(event.target.value)} /></label>
          <label>Meta description<textarea rows={3} value={metaDescription} onChange={(event) => setMetaDescription(event.target.value)} /></label>
        </div>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button compact" disabled={saving || !can(user, "cms.manage_content")}>
            {saving ? "Saving..." : "Save content"}
          </button>
        </div>
      </form>
    </div>
  );
}

function MediaPage({ user }: { user: User }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState("uploads");
  const [uploading, setUploading] = useState(false);
  const load = useCallback(() => {
    setBusy(true);
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    api<{ items: MediaItem[] }>(`/cms/media?${params.toString()}`)
      .then((response) => setItems(response.items))
      .finally(() => setBusy(false));
  }, [query]);
  useEffect(load, [load]);

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    body.append("folder", folder || "uploads");
    try {
      await api("/cms/media", { method: "POST", body });
      load();
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function remove(item: MediaItem) {
    if (!window.confirm(`Delete “${item.file_name}”?`)) return;
    await api(`/cms/media/${item.id}`, { method: "DELETE" });
    load();
  }

  async function editAlt(item: MediaItem) {
    const en = window.prompt("English alternative text", item.alt_text.en || "");
    if (en === null) return;
    const ar = window.prompt("Arabic alternative text", item.alt_text.ar || "");
    if (ar === null) return;
    await api(`/cms/media/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ alt_text: { en, ar }, folder: item.folder }),
    });
    load();
  }

  return <>
    <PageHead
      eyebrow="Assets"
      title="Media library"
      copy="Upload images, documents and videos used across the website."
      action={can(user, "cms.manage_media") ? (
        <label className="primary-button compact upload-button">
          <Plus size={17} /> {uploading ? "Uploading…" : "Upload file"}
          <input type="file" hidden onChange={upload} disabled={uploading} />
        </label>
      ) : undefined}
    />
    <div className="panel table-panel">
      <div className="table-tools">
        <div className="search-input">
          <Search size={17} />
          <input placeholder="Search media..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <input className="folder-input" value={folder} onChange={(event) => setFolder(event.target.value)} placeholder="Upload folder" />
        <span>{items.length} files</span>
      </div>
      {busy ? <Skeleton /> : items.length ? (
        <div className="media-grid">
          {items.map((item) => (
            <article key={item.id}>
              {item.mime_type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.public_url} alt={item.alt_text.en || item.file_name} />
              ) : (
                <div className="media-fallback"><FileText size={22} /><span>{item.mime_type}</span></div>
              )}
              <div>
                <strong>{item.file_name}</strong>
                <small>{item.folder || "uploads"} · {Math.round(item.size_bytes / 1024)} KB</small>
                <div className="row-actions">
                  <a href={item.public_url} target="_blank" rel="noreferrer">Open</a>
                  {can(user, "cms.manage_media") && <button onClick={() => editAlt(item)}>Edit alt text</button>}
                  {can(user, "cms.manage_media") && <button onClick={() => remove(item)}>Delete</button>}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : <Empty copy="No media yet. Upload the first asset to get started." />}
    </div>
  </>;
}

function NavigationPage({ user }: { user: User }) {
  const [items, setItems] = useState<NavItem[]>([]);
  const [form, setForm] = useState({
    id: "",
    location: "header",
    parent_id: "",
    label_en: "",
    label_ar: "",
    url: "/",
    sort_order: 0,
    is_visible: true,
  });
  const load = useCallback(() => api<{ items: NavItem[] }>("/cms/navigation").then((r) => setItems(r.items)), []);
  useEffect(() => { load(); }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      location: form.location,
      parent_id: form.parent_id || null,
      label_en: form.label_en,
      label_ar: form.label_ar || undefined,
      url: form.url,
      sort_order: form.sort_order,
      is_visible: form.is_visible,
    };
    await api(`/cms/navigation${form.id ? `/${form.id}` : ""}`, {
      method: form.id ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
    setForm({ id: "", location: "header", parent_id: "", label_en: "", label_ar: "", url: "/", sort_order: 0, is_visible: true });
    load();
  }

  async function remove(item: NavItem) {
    if (!window.confirm(`Delete “${item.label.en || item.url}”?`)) return;
    await api(`/cms/navigation/${item.id}`, { method: "DELETE" });
    load();
  }

  return <>
    <PageHead eyebrow="Structure" title="Navigation" copy="Manage header and footer menu links shown on the public website." />
    <section className="settings-grid">
      <form className="panel settings-form" onSubmit={save}>
        <PanelTitle title={form.id ? "Edit link" : "Add link"} detail="Visible menus are exposed via /public/site-content" />
        <label>Location
          <select value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })}>
            <option value="header">Header</option>
            <option value="footer">Footer</option>
          </select>
        </label>
        <label>Parent link
          <select value={form.parent_id} onChange={(event) => setForm({ ...form, parent_id: event.target.value })}>
            <option value="">Top level</option>
            {items.filter((item) => item.id !== form.id && item.location === form.location && !item.parent_id).map((item) => (
              <option value={item.id} key={item.id}>{item.label.en || item.url}</option>
            ))}
          </select>
        </label>
        <label>Label (EN)<input value={form.label_en} onChange={(event) => setForm({ ...form, label_en: event.target.value })} required /></label>
        <label>Label (AR)<input value={form.label_ar} onChange={(event) => setForm({ ...form, label_ar: event.target.value })} /></label>
        <label>URL<input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} required /></label>
        <label>Sort order<input type="number" min="0" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })} /></label>
        <label className="check-row"><input type="checkbox" checked={form.is_visible} onChange={(event) => setForm({ ...form, is_visible: event.target.checked })} /> Visible on website</label>
        {can(user, "cms.manage_content") && <button className="primary-button compact">{form.id ? "Update link" : "Add link"}</button>}
      </form>
      <div className="panel">
        <PanelTitle title="Menu items" detail={`${items.length} links`} />
        <div className="setting-list">
          {items.map((item) => (
            <div className="nav-row" key={item.id}>
              <button onClick={() => setForm({
                id: item.id,
                location: item.location,
                parent_id: item.parent_id || "",
                label_en: item.label.en || "",
                label_ar: item.label.ar || "",
                url: item.url,
                sort_order: item.sort_order,
                is_visible: item.is_visible,
              })}>
                <span>{item.location}</span>
                <b>{item.label.en || item.url}</b>
                <small>{item.url} · order {item.sort_order} · {item.is_visible ? "visible" : "hidden"}</small>
              </button>
              {can(user, "cms.manage_content") && <button className="ghost-danger" onClick={() => remove(item)}>Delete</button>}
            </div>
          ))}
          {!items.length && <Empty copy="No navigation links yet." />}
        </div>
      </div>
    </section>
  </>;
}

function TaxonomyPage({ user }: { user: User }) {
  const [kind, setKind] = useState<"categories" | "tags">("categories");
  const [items, setItems] = useState<TaxonomyItem[]>([]);
  const [form, setForm] = useState({ id: "", slug: "", name_en: "", name_ar: "" });
  const load = useCallback(() => {
    api<{ items: TaxonomyItem[] }>(`/cms/taxonomy/${kind}`).then((r) => setItems(r.items));
  }, [kind]);
  useEffect(() => { load(); }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    await api(`/cms/taxonomy/${kind}${form.id ? `/${form.id}` : ""}`, {
      method: form.id ? "PATCH" : "POST",
      body: JSON.stringify({
        slug: form.slug || slugify(form.name_en),
        name_en: form.name_en,
        name_ar: form.name_ar || undefined,
      }),
    });
    setForm({ id: "", slug: "", name_en: "", name_ar: "" });
    load();
  }

  async function remove(item: TaxonomyItem) {
    if (!window.confirm(`Delete “${item.name.en || item.slug}”?`)) return;
    await api(`/cms/taxonomy/${kind}/${item.id}`, { method: "DELETE" });
    load();
  }

  return <>
    <PageHead eyebrow="Publishing" title="Categories & tags" copy="Organize insights with reusable taxonomy." />
    <div className="segmented">
      <button className={kind === "categories" ? "active" : ""} onClick={() => { setKind("categories"); setForm({ id: "", slug: "", name_en: "", name_ar: "" }); }}>Categories</button>
      <button className={kind === "tags" ? "active" : ""} onClick={() => { setKind("tags"); setForm({ id: "", slug: "", name_en: "", name_ar: "" }); }}>Tags</button>
    </div>
    <section className="settings-grid">
      <form className="panel settings-form" onSubmit={save}>
        <PanelTitle title={form.id ? `Edit ${kind.slice(0, -1)}` : `Add ${kind.slice(0, -1)}`} detail="Used by insights posts" />
        <label>Name (EN)<input value={form.name_en} onChange={(event) => {
          const name_en = event.target.value;
          setForm({ ...form, name_en, slug: form.id ? form.slug : slugify(name_en) });
        }} required /></label>
        <label>Name (AR)<input value={form.name_ar} onChange={(event) => setForm({ ...form, name_ar: event.target.value })} /></label>
        <label>Slug<input value={form.slug} onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })} required /></label>
        {can(user, "cms.manage_content") && <button className="primary-button compact">Save</button>}
      </form>
      <div className="panel">
        <PanelTitle title={humanize(kind)} detail={`${items.length} items`} />
        <div className="setting-list">
          {items.map((item) => (
            <div className="nav-row" key={item.id}>
              <button onClick={() => setForm({
                id: item.id,
                slug: item.slug,
                name_en: item.name.en || "",
                name_ar: item.name.ar || "",
              })}>
                <span>{item.slug}</span>
                <b>{item.name.en || item.slug}</b>
                <small>{item.name.ar || "No Arabic label"}</small>
              </button>
              {can(user, "cms.manage_content") && <button className="ghost-danger" onClick={() => remove(item)}>Delete</button>}
            </div>
          ))}
          {!items.length && <Empty copy={`No ${kind} yet.`} />}
        </div>
      </div>
    </section>
  </>;
}

function InboxPage({ inbox }: { inbox: string }) {
  type Item = { id: string; name: string; email?: string; phone?: string; company?: string; status: string; summary?: string; created_at: string };
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(true);
  const title = inboxNav.find(([key]) => key === inbox)?.[1] ?? humanize(inbox);
  const load = useCallback(() => {
    setBusy(true);
    api<{ items: Item[] }>(`/cms/inbox/${inbox}`).then((r) => setItems(r.items)).finally(() => setBusy(false));
  }, [inbox]);
  useEffect(load, [load]);
  async function update(id: string, status: string) {
    await api(`/cms/inbox/${inbox}/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  }
  return <>
    <PageHead eyebrow="Unified inbox" title={title} copy="Review every website submission and keep the team’s follow-up status current." />
    <div className="panel table-panel">
      {busy ? <Skeleton /> : items.length ? (
        <div className="message-list">
          {items.map((item) => (
            <article key={item.id}>
              <div className="avatar small">{item.name.slice(0, 2).toUpperCase()}</div>
              <div className="message-body">
                <div><h3>{item.name}</h3><Badge value={item.status} /></div>
                <p>{item.summary || "No additional note provided."}</p>
                <small>{item.email || item.phone || "No contact detail"} {item.company ? `· ${item.company}` : ""} · {new Date(item.created_at).toLocaleString()}</small>
              </div>
              <select value={item.status} onChange={(event) => update(item.id, event.target.value)}>
                {["new", "in_review", "contacted", "qualified", "closed", "spam"].map((value) => (
                  <option key={value} value={value}>{humanize(value)}</option>
                ))}
              </select>
            </article>
          ))}
        </div>
      ) : <Empty copy="Your inbox is clear. New website submissions will appear here." />}
    </div>
  </>;
}

function SettingsPage() {
  type Setting = { id: string; group_name: string; key: string; value: unknown; is_public: boolean };
  const [items, setItems] = useState<Setting[]>([]);
  const [form, setForm] = useState({
    group_name: "translations",
    key: "en",
    value: "{\n  \"hero\": {\n    \"subtitle\": \"From Saudi Aramco refineries to SABIC plants, NOVARISE delivers world-class manpower, equipment and contracting solutions.\"\n  }\n}",
    is_public: true,
  });
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
  return <>
    <PageHead eyebrow="Administration" title="Site settings" copy="Manage global contact, brand and page copy used by the website." />
    <section className="settings-grid">
      <form className="panel settings-form" onSubmit={save}>
        <PanelTitle title="Add or update setting" detail="Use translations/en for editable website copy" />
        <label>Group<input value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })} /></label>
        <label>Key<input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} /></label>
        <label>Value<textarea rows={10} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} spellCheck={false} /></label>
        {error && <p className="form-error">{error}</p>}
        <label className="check-row">
          <input type="checkbox" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} />
          Public website can read this
        </label>
        <button className="primary-button compact">Save setting</button>
      </form>
      <div className="panel">
        <PanelTitle title="Saved configuration" detail={`${items.length} managed values`} />
        <div className="setting-list">
          {items.map((item) => (
            <button key={item.id} onClick={() => edit(item)}>
              <span>{item.group_name}</span>
              <b>{humanize(item.key)}</b>
              <small>{typeof item.value === "string" ? item.value : JSON.stringify(item.value)}</small>
            </button>
          ))}
          {!items.length && <Empty copy="No custom settings have been added yet." />}
        </div>
      </div>
    </section>
  </>;
}

function UsersPage({ user }: { user: User }) {
  const [items, setItems] = useState<TeamUser[]>([]);
  const [roles, setRoles] = useState<{ name: string; description?: string }[]>([]);
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    password: "",
    role: "editor",
    is_active: true,
  });
  const [error, setError] = useState("");
  const load = useCallback(() => {
    api<{ items: TeamUser[] }>("/cms/users").then((r) => setItems(r.items));
    api<{ items: { name: string; description?: string }[] }>("/cms/roles").then((r) => setRoles(r.items));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/cms/users", { method: "POST", body: JSON.stringify(form) });
      setForm({ email: "", full_name: "", password: "", role: "editor", is_active: true });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create user");
    }
  }

  async function toggleActive(item: TeamUser) {
    if (item.email === user.email) return;
    await api(`/cms/users/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: !item.is_active }),
    });
    load();
  }

  async function changeRole(item: TeamUser, role: string) {
    await api(`/cms/users/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
    load();
  }

  return <>
    <PageHead eyebrow="Access control" title="Team & access" copy="Invite teammates, assign roles, and disable accounts when needed." />
    <section className="settings-grid">
      {can(user, "cms.manage_users") && (
        <form className="panel settings-form" onSubmit={invite}>
          <PanelTitle title="Invite teammate" detail="New users sign in with the temporary password you set" />
          <label>Full name<input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></label>
          <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
          <label>Temporary password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={12} required /></label>
          <label>Role
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {roles.map((role) => <option key={role.name} value={role.name}>{role.name}</option>)}
            </select>
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button compact">Create user</button>
        </form>
      )}
      <div className="panel">
        <PanelTitle title="Team members" detail={`${items.length} accounts`} />
        <div className="team-grid stacked">
          {items.map((item) => (
            <article key={item.id}>
              <div className="avatar">{item.full_name.slice(0, 2).toUpperCase()}</div>
              <div>
                <h3>{item.full_name}</h3>
                <p>{item.email}</p>
                {can(user, "cms.manage_users") ? (
                  <select value={item.roles[0] ?? "editor"} onChange={(event) => changeRole(item, event.target.value)}>
                    {roles.map((role) => <option key={role.name} value={role.name}>{role.name}</option>)}
                  </select>
                ) : (
                  <span>{item.roles.join(", ")}</span>
                )}
              </div>
              <div className="team-actions">
                <Badge value={item.is_active ? "active" : "disabled"} />
                {can(user, "cms.manage_users") && item.email !== user.email && (
                  <button onClick={() => toggleActive(item)}>{item.is_active ? "Disable" : "Enable"}</button>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  </>;
}

function Badge({ value }: { value: string }) {
  return <span className={`badge badge-${value}`}>{humanize(value)}</span>;
}
function Empty({ copy }: { copy: string }) {
  return <div className="empty"><Inbox size={26} /><p>{copy}</p></div>;
}
function Skeleton() {
  return <div className="skeleton"><i /><i /><i /></div>;
}
function humanize(value: string) {
  return value.replace(/[._-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
