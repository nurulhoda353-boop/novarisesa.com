"use client";

import {
  Activity,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  ChevronRight,
  CircleGauge,
  FileText,
  FilePenLine,
  FolderKanban,
  Globe2,
  ImageIcon,
  Inbox,
  LayoutTemplate,
  Link2,
  LogOut,
  Menu,
  MessageSquareText,
  Newspaper,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Tags,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";

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
] as const;

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
        <Nav href="/navigation" icon={Link2} label="Navigation" active={active === "navigation"} />
        <Nav href="/taxonomy" icon={Tags} label="Categories & tags" active={active === "taxonomy"} />
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
          <a className="site-link" href="https://novarisesa.com" target="_blank"><Globe2 size={16} /> View website</a>
          <Link className="icon-button" href="/inbox/contact" title={`${inboxNew} new inbox items`}>
            <Bell size={18} />
            {inboxNew > 0 && <i />}
          </Link>
        </header>
        <main className="content">
          {route[0] === "overview" && <OverviewPage user={user} />}
          {route[0] === "site-content" && <SiteContentPage user={user} />}
          {route[0] === "content" && <ContentPage resource={route[1] ?? "pages"} user={user} />}
          {route[0] === "media" && <MediaPage user={user} />}
          {route[0] === "navigation" && <NavigationPage user={user} />}
          {route[0] === "taxonomy" && <TaxonomyPage user={user} />}
          {route[0] === "inbox" && <InboxPage inbox={route[1] ?? "contact"} />}
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
        .then((response) => setItems(response.items))
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

type ContentLeaf = {
  path: Array<string | number>;
  page: string;
  section: string;
  label: string;
  value: string | number | boolean | null;
};

type ContentPageGroup = {
  id: string;
  title: string;
  detail: string;
  roots: string[];
};

const contentPageGroups: ContentPageGroup[] = [
  { id: "home", title: "Home page", detail: "Hero, trust, services, projects and homepage blocks", roots: ["hero", "trustBar", "about", "capabilities", "industries", "numbers", "process", "vision", "projects", "hse", "certifications", "testimonials", "leadership", "whyUs", "faq", "urgentStrip"] },
  { id: "about", title: "About page", detail: "Company profile, CEO message and about page hero", roots: ["aboutPage"] },
  { id: "services", title: "Services", detail: "Service cards, details and services page sections", roots: ["services", "servicesPage", "serviceDetails"] },
  { id: "projects", title: "Projects", detail: "Project listings, detail labels and featured project copy", roots: ["projectsPage"] },
  { id: "capabilities", title: "Capabilities", detail: "Capabilities page copy and calls to action", roots: ["capabilitiesPage"] },
  { id: "careers", title: "Careers", detail: "Careers page labels and recruitment copy", roots: ["careersPage"] },
  { id: "requirements", title: "Requirements", detail: "Urgent requirements page and application labels", roots: ["requirementsPage"] },
  { id: "contact", title: "Contact", detail: "Contact page, office details and contact form labels", roots: ["contactPage"] },
  { id: "rfq", title: "RFQ", detail: "RFQ page, quote form and sidebar copy", roots: ["rfqPage"] },
  { id: "blog", title: "Insights", detail: "Blog, events, newsletter and article labels", roots: ["blogPage"] },
  { id: "navigation", title: "Navigation", detail: "Menus, language switcher and global labels", roots: ["nav", "language"] },
  { id: "global", title: "Global sections", detail: "Shared footer, call to action and reusable labels", roots: ["footer", "cta"] },
];

const rootToPage = new Map(contentPageGroups.flatMap((page) => page.roots.map((root) => [root, page.id])));

function pageForRoot(root: string) {
  return rootToPage.get(root) ?? root;
}

function pageTitle(pageId: string) {
  return contentPageGroups.find((page) => page.id === pageId)?.title ?? humanize(pageId);
}

function cloneDocument(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function contentLeaves(value: unknown, path: Array<string | number> = []): ContentLeaf[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => contentLeaves(entry, [...path, index]));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, entry]) => contentLeaves(entry, [...path, key]));
  }
  const pathText = path.map((part) => typeof part === "number" ? `Item ${part + 1}` : humanize(part)).join(" / ");
  const root = String(path[0] ?? "general");
  const sectionSource = typeof path[1] === "string" ? path[1] : root;
  return [{
    path,
    page: pageForRoot(root),
    section: sectionSource,
    label: pathText,
    value: value as ContentLeaf["value"],
  }];
}

function replaceAtPath(
  document: Record<string, unknown>,
  path: Array<string | number>,
  value: ContentLeaf["value"],
) {
  const next = cloneDocument(document);
  let cursor: Record<string | number, unknown> | unknown[] = next;
  path.slice(0, -1).forEach((part) => {
    cursor = (cursor as Record<string | number, Record<string | number, unknown> | unknown[]>)[part];
  });
  (cursor as Record<string | number, unknown>)[path[path.length - 1]] = value;
  return next;
}

function SiteContentPage({ user }: { user: User }) {
  const [locale, setLocale] = useState<"en" | "ar">("en");
  const [document, setDocument] = useState<Record<string, unknown>>({});
  const [defaults, setDefaults] = useState<Record<string, unknown>>({});
  const [assets, setAssets] = useState<Record<string, string>>({});
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [activePage, setActivePage] = useState("home");
  const [activeSection, setActiveSection] = useState("all");
  const [query, setQuery] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const [settingsResponse, mediaResponse, defaultsResponse] = await Promise.all([
        api<{ items: ManagedSetting[] }>("/cms/settings"),
        api<{ items: MediaItem[] }>("/cms/media?limit=100"),
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
      setRaw(JSON.stringify(nextDocument, null, 2));
      setAssets(Object.fromEntries(
        settingsResponse.items
          .filter((item) => item.group_name === "assets" && typeof item.value === "string")
          .map((item) => [item.key, item.value as string]),
      ));
      setMedia(mediaResponse.items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load site content");
    } finally {
      setBusy(false);
    }
  }, [locale]);

  useEffect(() => { void load(); }, [load]);

  const leaves = useMemo(() => contentLeaves(document), [document]);
  const assetPageSlots = useMemo(
    () => assetSlots.map(([key, label, fallback]) => ({ key, label, fallback, page: pageForRoot(key.split(".")[0]) })),
    [],
  );
  const pages = useMemo(() => {
    const discovered = Array.from(new Set([
      ...leaves.map((leaf) => leaf.page),
      ...assetPageSlots.map((slot) => slot.page),
    ]));
    const ordered = contentPageGroups
      .filter((page) => discovered.includes(page.id))
      .map((page) => ({
        ...page,
        fields: leaves.filter((leaf) => leaf.page === page.id).length,
        images: assetPageSlots.filter((slot) => slot.page === page.id).length,
      }));
    const known = new Set(ordered.map((page) => page.id));
    const custom = discovered
      .filter((page) => !known.has(page))
      .sort()
      .map((page) => ({
        id: page,
        title: pageTitle(page),
        detail: "Additional website copy",
        roots: [page],
        fields: leaves.filter((leaf) => leaf.page === page).length,
        images: assetPageSlots.filter((slot) => slot.page === page).length,
      }));
    return [...ordered, ...custom].filter((page) => page.fields || page.images);
  }, [assetPageSlots, leaves]);
  const pageLeaves = useMemo(
    () => leaves.filter((leaf) => leaf.page === activePage),
    [activePage, leaves],
  );
  const sections = useMemo(
    () => Array.from(new Set(pageLeaves.map((leaf) => leaf.section))).sort(),
    [pageLeaves],
  );
  const activeAssets = useMemo(
    () => assetPageSlots.filter((slot) => slot.page === activePage),
    [activePage, assetPageSlots],
  );
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return pageLeaves.filter((leaf) => {
      if (activeSection !== "all" && leaf.section !== activeSection) return false;
      if (!needle) return true;
      return `${leaf.label} ${String(leaf.value ?? "")}`.toLowerCase().includes(needle);
    });
  }, [activeSection, pageLeaves, query]);

  useEffect(() => {
    if (pages.length && !pages.some((page) => page.id === activePage)) {
      setActivePage(pages[0].id);
    }
  }, [activePage, pages]);

  useEffect(() => {
    setActiveSection("all");
  }, [activePage]);

  function updateLeaf(leaf: ContentLeaf, rawValue: string | boolean) {
    let value: ContentLeaf["value"] = rawValue;
    if (typeof leaf.value === "number") value = Number(rawValue);
    if (leaf.value === null && rawValue === "") value = null;
    const next = replaceAtPath(document, leaf.path, value);
    setDocument(next);
    setRaw(JSON.stringify(next, null, 2));
    setNotice("");
  }

  function applyRaw() {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      setDocument(parsed);
      setError("");
      setNotice("Advanced changes applied. Save to publish them.");
    } catch {
      setError("The advanced JSON is not valid.");
    }
  }

  async function save() {
    if (!can(user, "cms.manage_settings")) return;
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
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save site content");
    } finally {
      setSaving(false);
    }
  }

  function restoreDefaults() {
    if (!window.confirm(`Restore the bundled ${locale.toUpperCase()} copy in this editor?`)) return;
    const next = cloneDocument(defaults);
    setDocument(next);
    setRaw(JSON.stringify(next, null, 2));
    setNotice("Defaults restored in the editor. Save to publish them.");
  }

  return <>
    <PageHead
      eyebrow="Visual content editor"
      title="Site content"
      copy="Edit every public website label, paragraph, list and image without touching code."
      action={can(user, "cms.manage_settings") ? (
        <button className="primary-button compact" onClick={save} disabled={saving}>
          {saving ? "Publishing…" : "Save & publish"}
        </button>
      ) : undefined}
    />
    <div className="content-editor-toolbar panel">
      <div className="segmented">
        <button className={locale === "en" ? "active" : ""} onClick={() => setLocale("en")}>English</button>
        <button className={locale === "ar" ? "active" : ""} onClick={() => setLocale("ar")}>Arabic</button>
      </div>
      <div className="search-input">
        <Search size={17} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search website copy…" />
      </div>
      <button className="secondary-button" onClick={restoreDefaults}>Restore defaults</button>
    </div>
    {error && <p className="form-error notice-bar">{error}</p>}
    {notice && <p className="success-note notice-bar">{notice}</p>}
    {busy ? <Skeleton /> : (
      <section className="site-content-shell">
        <aside className="panel content-page-list">
          <PanelTitle title="Pages" detail="Choose one website area" />
          <div>
            {pages.map((page) => (
              <button
                key={page.id}
                className={activePage === page.id ? "active" : ""}
                onClick={() => setActivePage(page.id)}
              >
                <span>
                  <strong>{page.title}</strong>
                  <small>{page.detail}</small>
                </span>
                <b>{page.fields}{page.images ? ` + ${page.images} img` : ""}</b>
              </button>
            ))}
          </div>
        </aside>
        <div className="site-content-layout">
        <div className="panel copy-editor">
          <div className="section-editor-head">
            <PanelTitle title={`${pageTitle(activePage)} copy`} detail={`${visible.length} of ${pageLeaves.length} editable values shown`} />
            <div className="section-tabs">
              <button className={activeSection === "all" ? "active" : ""} onClick={() => setActiveSection("all")}>All</button>
              {sections.map((value) => (
                <button className={activeSection === value ? "active" : ""} onClick={() => setActiveSection(value)} key={value}>
                  {humanize(value)}
                </button>
              ))}
            </div>
          </div>
          <div className="copy-fields" dir={locale === "ar" ? "rtl" : "ltr"}>
            {visible.map((leaf) => (
              <label key={leaf.path.join(".")}>
                <span>{leaf.label}</span>
                {typeof leaf.value === "boolean" ? (
                  <input
                    type="checkbox"
                    checked={leaf.value}
                    onChange={(event) => updateLeaf(leaf, event.target.checked)}
                  />
                ) : String(leaf.value ?? "").length > 90 ? (
                  <textarea
                    rows={4}
                    value={String(leaf.value ?? "")}
                    onChange={(event) => updateLeaf(leaf, event.target.value)}
                  />
                ) : (
                  <input
                    type={typeof leaf.value === "number" ? "number" : "text"}
                    value={String(leaf.value ?? "")}
                    onChange={(event) => updateLeaf(leaf, event.target.value)}
                  />
                )}
              </label>
            ))}
            {!visible.length && <Empty copy="No content matches this page or filter." />}
          </div>
          <label className="check-row advanced-toggle">
            <input type="checkbox" checked={advanced} onChange={(event) => setAdvanced(event.target.checked)} />
            Advanced structure editor
          </label>
          {advanced && <div className="advanced-editor">
            <textarea rows={18} value={raw} onChange={(event) => setRaw(event.target.value)} spellCheck={false} />
            <button className="secondary-button" onClick={applyRaw}>Apply structure</button>
          </div>}
        </div>
        <div className="panel asset-editor">
          <PanelTitle title={`${pageTitle(activePage)} images`} detail={activeAssets.length ? "Choose an uploaded file or paste a CDN URL" : "No managed image slots on this page"} />
          <div className="asset-fields">
            {activeAssets.map(({ key, label, fallback }) => {
              const value = assets[key] || fallback;
              return <label key={key}>
                <span>{label}</span>
                <select
                  value={media.some((item) => item.public_url === value) ? value : ""}
                  onChange={(event) => setAssets({ ...assets, [key]: event.target.value || fallback })}
                >
                  <option value="">Bundled default</option>
                  {media.filter((item) => item.mime_type.startsWith("image/")).map((item) => (
                    <option value={item.public_url} key={item.id}>{item.file_name}</option>
                  ))}
                </select>
                <input
                  value={value}
                  onChange={(event) => setAssets({ ...assets, [key]: event.target.value })}
                  placeholder="https://…"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={value} alt="" />
              </label>;
            })}
            {!activeAssets.length && <Empty copy="Image controls for this page will appear here when configured." />}
          </div>
        </div>
        </div>
      </section>
    )}
  </>;
}

function ContentPage({ resource, user }: { resource: string; user: User }) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ContentItem | "new" | null>(null);
  const title = contentNav.find(([key]) => key === resource)?.[1] ?? humanize(resource);
  const load = useCallback(() => {
    setBusy(true);
    api<{ items: ContentItem[] }>(`/cms/content/${resource}`)
      .then((response) => setItems(response.items))
      .finally(() => setBusy(false));
  }, [resource]);
  useEffect(load, [load]);
  const visible = useMemo(
    () => items.filter((item) => `${item.title} ${item.slug}`.toLowerCase().includes(query.toLowerCase())),
    [items, query],
  );
  async function archive(item: ContentItem) {
    if (!window.confirm(`Archive “${item.title}”?`)) return;
    await api(`/cms/content/${resource}/${item.id}`, { method: "DELETE" });
    load();
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
        <div className="data-table">
          <div className="table-row table-head"><span>Title</span><span>Status</span><span>Updated</span><span /></div>
          {visible.map((item) => (
            <div className="table-row" key={item.id}>
              <span><b>{item.title}</b><small>/{item.slug}</small></span>
              <span><Badge value={item.status} /></span>
              <span>{new Date(item.updated_at).toLocaleDateString()}</span>
              <span className="row-actions">
                <button onClick={() => setModal(item)}>Edit</button>
                {can(user, "cms.manage_content") && <button onClick={() => archive(item)}>Archive</button>}
              </span>
            </div>
          ))}
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
  const supportsMedia = ["services", "projects", "posts"].includes(resource);
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
  const [bodyJson, setBodyJson] = useState("{}");
  const [advanced, setAdvanced] = useState(false);
  const [categories, setCategories] = useState<TaxonomyItem[]>([]);
  const [tags, setTags] = useState<TaxonomyItem[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [bodyError, setBodyError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isPost) return;
    api<{ items: TaxonomyItem[] }>("/cms/taxonomy/categories").then((r) => setCategories(r.items));
    api<{ items: TaxonomyItem[] }>("/cms/taxonomy/tags").then((r) => setTags(r.items));
  }, [isPost]);

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
      setCategoryId(String(detail.extra.category_id ?? ""));
      setTagIds(Array.isArray(detail.extra.tag_ids) ? detail.extra.tag_ids.map(String) : []);
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
      if (advanced) {
        parsedBody = bodyJson.trim() ? JSON.parse(bodyJson) : {};
      } else if (isService) {
        parsedBody = { eyebrow, lead, intro, sub_services: [], faqs: [] };
        try {
          const existing = bodyJson.trim() ? JSON.parse(bodyJson) : {};
          parsedBody = { ...existing, eyebrow, lead, intro };
        } catch { /* keep defaults */ }
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
        };
      } else {
        parsedBody = bodyJson.trim() ? JSON.parse(bodyJson) : {};
      }
      if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
        throw new Error("Body must be a JSON object");
      }
    } catch {
      setSaving(false);
      setBodyError("Body content is invalid. Check the fields or advanced JSON.");
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
      featured_media_id: (resource === "projects" || isPost) && mediaId ? mediaId : null,
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
      contacts: Array.isArray(parsedBody.contacts) ? parsedBody.contacts : [],
      body: parsedBody,
      locale,
      meta_title: metaTitle || undefined,
      meta_description: metaDescription || undefined,
      category_id: isPost && categoryId ? categoryId : null,
      tag_ids: isPost ? tagIds : [],
    };
    await api(`/cms/content/${resource}${item ? `/${item.id}` : ""}`, {
      method: item ? "PATCH" : "POST",
      body: JSON.stringify(body),
    });
    onSaved();
  }

  const canPublish = can(user, "cms.publish");
  const statusOptions = isRequirement
    ? ["draft", "active", "urgent", "closed"]
    : canPublish
      ? ["draft", "published", "archived"]
      : ["draft", "archived"];

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal wide" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">{item ? "Edit content" : "New content"}</p>
            <h2>{item ? item.title : `Create ${humanize(resource.replace(/s$/, ""))}`}</h2>
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
          <label>Locale
            <select value={locale} onChange={(event) => setLocale(event.target.value)}>
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
          </label>
          <label>Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {statusOptions.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          {!isRequirement && <label>Sort order
            <input type="number" min="0" value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} />
          </label>}
          {supportsMedia && <label className="full">Primary image
            <select value={mediaId} onChange={(event) => setMediaId(event.target.value)}>
              <option value="">No managed image</option>
              {mediaItems.filter((media) => media.mime_type.startsWith("image/")).map((media) => (
                <option value={media.id} key={media.id}>{media.file_name}</option>
              ))}
            </select>
          </label>}
          {!isRequirement && <label className="check-row">
            <input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} />
            Feature this item
          </label>}
          {isRequirement && <>
            <label>Headcount<input type="number" min="1" value={headcount} onChange={(event) => setHeadcount(Number(event.target.value))} /></label>
            <label>Location<input value={location} onChange={(event) => setLocation(event.target.value)} /></label>
            <label className="full">Project name<input value={projectName} onChange={(event) => setProjectName(event.target.value)} /></label>
            <label>Approval<input value={approval} onChange={(event) => setApproval(event.target.value)} /></label>
            <label>Duration<input value={duration} onChange={(event) => setDuration(event.target.value)} /></label>
            <label>Salary cycle<input value={salaryCycle} onChange={(event) => setSalaryCycle(event.target.value)} /></label>
            <label>Food<input value={food} onChange={(event) => setFood(event.target.value)} /></label>
            <label className="full">Accommodation<input value={accommodation} onChange={(event) => setAccommodation(event.target.value)} /></label>
            <label className="full">Documents (one per line)<textarea rows={4} value={documents} onChange={(event) => setDocuments(event.target.value)} /></label>
          </>}
          {isService && !advanced && <>
            <label>Eyebrow<input value={eyebrow} onChange={(event) => setEyebrow(event.target.value)} /></label>
            <label>Lead<input value={lead} onChange={(event) => setLead(event.target.value)} /></label>
            <label className="full">Intro<textarea rows={4} value={intro} onChange={(event) => setIntro(event.target.value)} /></label>
          </>}
          {isPost && <>
            <label>Category
              <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name.en || category.slug}</option>
                ))}
              </select>
            </label>
            <label className="full">Tags
              <select
                multiple
                value={tagIds}
                onChange={(event) => setTagIds(Array.from(event.target.selectedOptions).map((option) => option.value))}
                className="multi-select"
              >
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>{tag.name.en || tag.slug}</option>
                ))}
              </select>
            </label>
          </>}
          <label className="full">Summary<textarea rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
          {(advanced || (!isService && !isRequirement)) && (
            <label className="full">Body JSON<textarea rows={8} value={bodyJson} onChange={(event) => setBodyJson(event.target.value)} spellCheck={false} /></label>
          )}
          {(isService || isRequirement) && (
            <label className="check-row full">
              <input type="checkbox" checked={advanced} onChange={(event) => setAdvanced(event.target.checked)} />
              Advanced JSON editor
            </label>
          )}
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
