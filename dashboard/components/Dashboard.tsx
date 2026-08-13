"use client";

import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  CircleGauge,
  FileText,
  FilePenLine,
  FolderKanban,
  Globe2,
  HelpCircle,
  ImageIcon,
  ImagePlus,
  Inbox,
  LogOut,
  Menu,
  MessageSquareText,
  Moon,
  MoreHorizontal,
  Newspaper,
  Pencil,
  Plus,
  Search,
  Save,
  Settings,
  ShieldCheck,
  Star,
  Sun,
  Trash2,
  Users,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, SITE_URL } from "@/lib/api";

// ── Dark / Light mode toggle ──────────────────────────────────────────────────
function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("nr-theme", next ? "dark" : "light"); } catch {}
    setDark(next);
  }
  return { dark, toggle };
}

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
type ProjectEditorData = {
  slug: string;
  title: string;
  summary: string;
  is_featured: boolean;
  sort_order: number;
  thumbnail_media_id: string | null;
  hero_media_id: string | null;
  sector: string;
  client_name: string;
  location: string;
  value: string;
  duration: string;
  started_on: string | null;
  completed_on: string | null;
  overview: string[];
  highlights: string[];
  meta_title: string;
  meta_description: string;
};
type ProjectEditorResponse = {
  project_id: string;
  status: string;
  updated_at: string;
  has_draft: boolean;
  draft_updated_at: string | null;
  data: ProjectEditorData;
  preview: { thumbnail_url: string | null; hero_url: string | null; published_slug: string };
};

type PublicProjectContent = {
  long?: string[];
  highlights?: string[];
};

function publicProjectTemplate(slug: string): PublicProjectContent {
  const templates: Record<string, PublicProjectContent> = {
    neom: {
      long: [
        "NEOM is the boldest urban-development bet in modern history — a USD 500B+ greenfield region rising on Saudi Arabia's north-west coast. The masterplan spans The Line, Oxagon, Trojena and Sindalah, each demanding world-class contracting capacity and continuous mobilization of skilled labour at unprecedented scale.",
        "NOVARISE supports NEOM consortium contractors with multi-trade manpower, equipment and on-site supervision — from civil works and MEP to power, water and finishing trades — operating under NEOM's strict HSE, security and quality regimes.",
      ],
      highlights: ["Multi-trade workforce mobilization", "Civil, MEP & finishing crews", "24/7 site supervision", "Full HSE & security compliance"],
    },
  };
  const content = templates[slug];
  return {
    long: (content?.long ?? []).slice(0, 2),
    highlights: (content?.highlights ?? []).slice(0, 4),
  };
}
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
  ["faq", "FAQ", HelpCircle],
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

function can(user: User, code: string) {
  return (user.permissions ?? []).includes(code) || user.roles.includes("owner");
}

export default function Dashboard({ route }: { route: string[] }) {
  const { dark, toggle: toggleTheme } = useTheme();
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
        <Nav href="/taxonomy" icon={BookOpen} label="Categories & tags" active={active === "taxonomy"} />
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
          <button className="theme-toggle" onClick={toggleTheme} title={dark ? "Switch to light mode" : "Switch to dark mode"} aria-label="Toggle theme">
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <Link className="icon-button" href="/inbox/contact" title={`${inboxNew} new inbox items`}>
            <Bell size={18} />
            {inboxNew > 0 && <i />}
          </Link>
        </header>
        <main className="content">
          {route[0] === "overview" && <OverviewPage user={user} />}
          {route[0] === "site-content" && <SiteContentPage user={user} onTopbarActions={setTopbarActions} />}
          {route[0] === "content" && !hiddenContentResources.has(route[1] ?? "") && (
            <ContentPage resource={route[1] ?? "services"} />
          )}
          {route[0] === "inbox" && <InboxPage inbox={route[1] ?? "contact"} />}
          {route[0] === "media" && <MediaPage user={user} />}
          {route[0] === "navigation" && <NavigationPage user={user} />}
          {route[0] === "taxonomy" && <TaxonomyPage user={user} />}
          {route[0] === "settings" && <SettingsPage user={user} />}
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

function ContentPage({ resource }: { resource: string }) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [query, setQuery] = useState("");
  const [editingProject, setEditingProject] = useState<ContentItem | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectFeatured, setNewProjectFeatured] = useState(true);
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectActionError, setProjectActionError] = useState("");
  const title = contentNav.find(([key]) => key === resource)?.[1] ?? humanize(resource);
  const load = useCallback(() => {
    setBusy(true);
    api<{ items: ContentItem[] }>(`/cms/content/${resource}`)
      .then((response) => setItems(response.items))
      .finally(() => setBusy(false));
  }, [resource]);
  useEffect(load, [load]);

  async function createProject() {
    setCreatingProject(true);
    setProjectActionError("");
    try {
      const project = await api<{ id: string; slug: string; status: string; is_featured: boolean; sort_order: number; updated_at: string }>("/cms/projects", {
        method: "POST",
        body: JSON.stringify({ is_featured: newProjectFeatured }),
      });
      setNewProjectOpen(false);
      setEditingProject({
        id: project.id,
        slug: project.slug,
        title: "",
        status: project.status,
        summary: "",
        is_featured: project.is_featured,
        updated_at: project.updated_at,
        extra: { sort_order: project.sort_order },
      });
      void load();
    } catch (error) {
      setProjectActionError(error instanceof Error ? error.message : "Could not create the new project.");
    } finally {
      setCreatingProject(false);
    }
  }

  async function deleteProject(item: ContentItem) {
    const label = item.title || "this untitled project";
    if (!window.confirm(`Delete “${label}”? This permanently removes its draft or published public page and cannot be undone.`)) return;
    try {
      setProjectActionError("");
      await api(`/cms/projects/${item.id}`, { method: "DELETE" });
      if (editingProject?.id === item.id) setEditingProject(null);
      void load();
    } catch (error) {
      setProjectActionError(error instanceof Error ? error.message : "Could not delete the project.");
    }
  }
  const visible = useMemo(
    () => items
      .filter((item) => `${item.title} ${item.slug}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => Number(a.extra.sort_order ?? 0) - Number(b.extra.sort_order ?? 0)),
    [items, query],
  );

  const renderCards = (groupItems: ContentItem[], variant?: "featured" | "standard") => (
    <div className={`content-grid${variant ? ` project-card-grid ${variant}` : ""}`}>
      {groupItems.map((item) => {
        const index = visible.indexOf(item);
        const thumb = (item.extra.thumbnail_url as string | undefined)
          || assetSlots.find(([key]) => key === `${resource}.${item.slug}.hero`)?.[2]
          || "";
        return (
          <article
            className={`content-card${resource === "projects" ? ` project-content-card ${item.is_featured ? "is-featured" : "is-standard"}` : ""}`}
            key={item.id}
          >
            <div className="content-card-media">
              <AssetPreview src={thumb} label={item.title} compact />
              <div className="content-card-overlay">
                <div className="content-card-top-bar">
                  <span className="content-card-number">
                    {String(index + 1).padStart(2, "0")} &bull; {item.status.toUpperCase()}
                  </span>
                  {resource === "projects" ? (
                    <span className={`project-card-type ${item.is_featured ? "featured" : "standard"}`}>
                      {item.is_featured && <Star size={12} fill="currentColor" />}
                      {item.is_featured ? "Featured" : "Non-featured"}
                    </span>
                  ) : item.is_featured ? (
                    <span className="content-card-icon-badge"><Star size={14} /></span>
                  ) : null}
                </div>
                <div className="content-card-title-area">
                  <h3 className="content-card-title" title={item.title}>{item.title}</h3>
                  <div className="content-card-line"></div>
                </div>
              </div>
            </div>
            <div className="content-card-body">
              <p className="content-card-summary">{item.summary || `Manage the ${item.title} content and configuration.`}</p>
            </div>
            <div className="content-card-foot">
              <div className="content-card-meta">
                <span className="slug">/{item.slug}</span>
                <span className="date">Updated {new Date(item.updated_at).toLocaleDateString()}</span>
              </div>
              {resource === "projects" && (
                <div className="content-card-actions">
                  <button
                    type="button"
                    onClick={() => setEditingProject(item)}
                    title={`Edit ${item.title}`}
                    aria-label={`Edit ${item.title}`}
                  ><Pencil size={15} /></button>
                  <button
                    type="button"
                    className="project-delete-button"
                    onClick={() => void deleteProject(item)}
                    title={`Delete ${item.title || "project"}`}
                    aria-label={`Delete ${item.title || "project"}`}
                  ><Trash2 size={15} /></button>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );

  const projectGroups = resource === "projects" ? [
    {
      key: "featured",
      eyebrow: "Priority showcase",
      title: "Featured Projects",
      copy: "Highlighted projects shown prominently on the public Projects page.",
      items: visible.filter((item) => item.is_featured),
    },
    {
      key: "standard",
      eyebrow: "Project archive",
      title: "Non-Featured Projects",
      copy: "Additional projects shown in the compact grid on the public Projects page.",
      items: visible.filter((item) => !item.is_featured),
    },
  ].filter((group) => group.items.length) : [];

  return <>
    <PageHead
      eyebrow="Website content"
      title={title}
      copy={`Browse ${title.toLowerCase()} on the NOVARISE website.`}
      action={resource === "projects" ? <button type="button" className="primary-button" onClick={() => { setProjectActionError(""); setNewProjectOpen(true); }}><Plus size={17} /> New Project</button> : undefined}
    />
    <div className="panel table-panel">
      <div className="table-tools">
        <div className="search-input">
          <Search size={17} />
          <input placeholder={`Search ${title.toLowerCase()}...`} value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <span>{visible.length} items</span>
      </div>
      {projectActionError && <p className="project-action-error" role="alert">{projectActionError}</p>}
      {busy ? <Skeleton /> : visible.length ? (
        resource === "projects" ? (
          <div className="project-content-groups">
            {projectGroups.map((group) => (
              <section className={`project-content-group ${group.key}`} key={group.key}>
                <div className="project-content-group-head">
                  <div>
                    <span>{group.eyebrow}</span>
                    <h2>{group.title}</h2>
                    <p>{group.copy}</p>
                  </div>
                  <strong>{group.items.length}</strong>
                </div>
                {renderCards(group.items, group.key as "featured" | "standard")}
              </section>
            ))}
          </div>
        ) : renderCards(visible)
      ) : <Empty copy={`No ${title.toLowerCase()} yet.`} />}
    </div>
    {editingProject && <ProjectEditor item={editingProject} onClose={() => setEditingProject(null)} onPublished={load} />}
    {newProjectOpen && <NewProjectModal featured={newProjectFeatured} creating={creatingProject} error={projectActionError} onFeaturedChange={setNewProjectFeatured} onClose={() => setNewProjectOpen(false)} onCreate={() => void createProject()} />}
  </>;
}

function NewProjectModal({ featured, creating, error, onFeaturedChange, onClose, onCreate }: { featured: boolean; creating: boolean; error: string; onFeaturedChange: (featured: boolean) => void; onClose: () => void; onCreate: () => void }) {
  useEffect(() => {
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
    };
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(<div className="modal-backdrop" onMouseDown={() => !creating && onClose()}>
    <section className="modal new-project-modal" onMouseDown={(event) => event.stopPropagation()} aria-label="Create a new project">
      <header className="modal-head"><div><p className="eyebrow">New project</p><h2>Choose the public project type</h2><p>The same five-block editor opens next, ready for your project content.</p></div><button type="button" onClick={() => !creating && onClose()} aria-label="Close"><X size={18} /></button></header>
      <div className="new-project-options">
        <button type="button" className={featured ? "selected" : ""} onClick={() => onFeaturedChange(true)}><Star size={20} fill={featured ? "currentColor" : "none"} /><strong>Featured Project</strong><span>Appears first in the Featured group, public Projects page, and homepage showcase after publishing.</span></button>
        <button type="button" className={!featured ? "selected" : ""} onClick={() => onFeaturedChange(false)}><FolderKanban size={20} /><strong>Basic Project</strong><span>Appears first in the non-featured project grid after publishing.</span></button>
      </div>
      {error && <p className="new-project-error" role="alert">{error}</p>}
      <footer className="modal-actions"><button type="button" onClick={onClose} disabled={creating}>Cancel</button><button type="button" className="primary-button" onClick={onCreate} disabled={creating}><Plus size={16} /> {creating ? "Creating…" : "Create Project"}</button></footer>
    </section>
  </div>, document.body);
}

const editorTabs = [
  { id: "thumbnail", label: "Thumbnail Card", icon: ImageIcon },
  { id: "hero", label: "Hero + Project Image", icon: ImagePlus },
  { id: "stats", label: "Project Info / Stats", icon: BarChart3 },
  { id: "overview", label: "Overview + Highlights", icon: FileText },
  { id: "seo", label: "SEO", icon: Search },
] as const;

function publicProjectImage(slug: string): string | null {
  const path = assetSlots.find(([key]) => key === `projects.${slug}.hero`)?.[2];
  return path ? new URL(path, SITE_ORIGIN).toString() : null;
}
type EditorTab = typeof editorTabs[number]["id"];

function projectEditorFallback(item: ContentItem): ProjectEditorData {
  const template = publicProjectTemplate(item.slug);
  return {
    slug: item.slug, title: item.title, summary: item.summary ?? "", is_featured: item.is_featured,
    sort_order: Number(item.extra.sort_order ?? 0), thumbnail_media_id: null, hero_media_id: null,
    sector: "", client_name: "", location: "", value: "", duration: "", started_on: null, completed_on: null,
    overview: template.long?.length === 2 ? template.long : ["", ""],
    highlights: template.highlights?.length === 4 ? template.highlights : ["", "", "", ""],
    meta_title: "", meta_description: "",
  };
}

function fixedProjectTemplate(data: ProjectEditorData, slug: string): ProjectEditorData {
  const template = publicProjectTemplate(slug);
  const fixed = (values: string[], defaults: string[], count: number) => {
    const source = values.some((value) => value.trim()) ? values : defaults;
    return Array.from({ length: count }, (_, index) => source[index] ?? defaults[index] ?? "");
  };
  return { ...data, overview: fixed(data.overview ?? [], template.long ?? [], 2), highlights: fixed(data.highlights ?? [], template.highlights ?? [], 4) };
}

function ProjectEditor({ item, onClose, onPublished }: { item: ContentItem; onClose: () => void; onPublished: () => void }) {
  const publicImage = publicProjectImage(item.slug);
  const [tab, setTab] = useState<EditorTab>("thumbnail");
  const [form, setForm] = useState<ProjectEditorData>(() => projectEditorFallback(item));
  const [preview, setPreview] = useState({
    thumbnail_url: (item.extra.thumbnail_url as string | null) || publicImage,
    hero_url: (item.extra.hero_url as string | null) || publicImage,
  });
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [notice, setNotice] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mediaOpen, setMediaOpen] = useState<"thumbnail" | "hero" | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<ProjectEditorResponse>(`/cms/projects/${item.id}/editor`),
      api<{ items: MediaItem[] }>("/cms/media?limit=100"),
    ]).then(([editor, mediaResponse]) => {
      if (cancelled) return;
      setForm(fixedProjectTemplate(editor.data, item.slug));
      const thumbnailUrl = editor.preview.thumbnail_url || publicImage;
      setPreview({ thumbnail_url: thumbnailUrl, hero_url: editor.preview.hero_url || thumbnailUrl });
      setMedia(mediaResponse.items.filter((asset) => asset.mime_type.startsWith("image/")));
      setNotice(editor.has_draft ? `Draft restored from ${new Date(editor.draft_updated_at ?? editor.updated_at).toLocaleString()}` : "Everything published is live on the public site.");
    }).catch((error) => {
      if (!cancelled) setNotice(error instanceof Error ? error.message : "Could not load the project editor.");
    }).finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [item.id, item.slug, publicImage]);

  function update<K extends keyof ProjectEditorData>(key: K, value: ProjectEditorData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }
  function updateList(key: "overview" | "highlights", index: number, value: string) {
    const next = [...form[key]]; next[index] = value; update(key, next);
  }
  async function uploadImage(event: React.ChangeEvent<HTMLInputElement>, slot: "thumbnail" | "hero") {
    const file = event.target.files?.[0];
    if (!file) return;
    const body = new FormData(); body.append("file", file); body.append("folder", "projects"); body.append("alt_en", form.title);
    setSaving("draft");
    try {
      const asset = await api<MediaItem>("/cms/media", { method: "POST", body });
      setMedia((current) => [asset, ...current]); selectMedia(slot, asset);
      setNotice("Image uploaded and selected. Save draft or publish when ready.");
    } finally { setSaving(null); event.target.value = ""; }
  }
  function selectMedia(slot: "thumbnail" | "hero", asset: MediaItem) {
    update(slot === "thumbnail" ? "thumbnail_media_id" : "hero_media_id", asset.id);
    setPreview((current) => ({ ...current, [slot === "thumbnail" ? "thumbnail_url" : "hero_url"]: asset.public_url }));
    setMediaOpen(null);
  }
  async function save(mode: "draft" | "publish") {
    setSaving(mode); setNotice("");
    try {
      const path = mode === "draft" ? `/cms/projects/${item.id}/draft` : `/cms/projects/${item.id}/publish`;
      const response = await api<{ status: string; updated_at?: string }>(path, { method: mode === "draft" ? "PUT" : "POST", body: JSON.stringify(form) });
      setDirty(false);
      setNotice(mode === "draft" ? "Draft saved safely. It is not visible on the public site." : "Published successfully. The public project page now reflects these changes.");
      if (mode === "publish") onPublished();
      return response;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save project changes.");
    } finally { setSaving(null); }
  }
  function close() {
    if (!dirty || window.confirm("You have unsaved changes. Close the editor anyway?")) onClose();
  }
  const imageFor = mediaOpen === "thumbnail" ? preview.thumbnail_url : preview.hero_url;
  const seoTitle = form.meta_title || form.title;
  const seoDescription = form.meta_description || form.summary;
  if (typeof document === "undefined") return null;
  return createPortal(<div className="modal-backdrop project-editor-backdrop" onMouseDown={close}>
    <section className="project-editor" onMouseDown={(event) => event.stopPropagation()} aria-label={`Edit ${item.title}`}>
      <header className="project-editor-head">
        <div><p className="eyebrow">Project editor</p><h2>{form.title || item.title}</h2><span className={`badge badge-${item.status}`}>{item.status}</span>{dirty && <em>Unsaved changes</em>}</div>
        <div className="project-editor-actions">
          <a href={`${SITE_ORIGIN}/projects/${item.slug}`} target="_blank" rel="noreferrer" className="editor-live-link"><Globe2 size={15} /> View live</a>
          <button type="button" className="editor-draft-button" onClick={() => void save("draft")} disabled={!!saving}><Save size={16} /> {saving === "draft" ? "Saving…" : "Save draft"}</button>
          <button type="button" className="primary-button compact" onClick={() => void save("publish")} disabled={!!saving}>{saving === "publish" ? "Publishing…" : "Publish"}</button>
          <button type="button" className="editor-close" onClick={close} aria-label="Close editor"><X size={19} /></button>
        </div>
      </header>
      <nav className="project-editor-tabs" aria-label="Project editor steps">{editorTabs.map(({ id, label, icon: Icon }, index) => <button type="button" key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><span>{index + 1}</span><Icon size={16} />{label}</button>)}</nav>
      {busy ? <div className="project-editor-loading"><Skeleton /></div> : <div className="project-editor-content">
        <div className="project-editor-form">
          {tab === "thumbnail" && <>
            <EditorSection title="Public thumbnail card" copy="This is the image and copy visitors see first on the Projects page." />
            <ImageField title="Thumbnail image" copy="Shown on the public Project card at a 16:10 landscape ratio. Use at least 1600 × 1000 px." ratio="thumbnail" image={preview.thumbnail_url} onPick={() => setMediaOpen("thumbnail")} onUpload={(event) => void uploadImage(event, "thumbnail")} />
            <label>Project title<input value={form.title} onChange={(event) => update("title", event.target.value)} maxLength={255} /></label>
            <label>Short card description<textarea rows={4} value={form.summary} onChange={(event) => update("summary", event.target.value)} maxLength={1200} /><small>{form.summary.length}/1200 · Keep it short and clear.</small></label>
            <div className="editor-two-cols"><label>Public URL<input value={form.slug} onChange={(event) => update("slug", slugify(event.target.value))} /><small>novarisesa.com/projects/{form.slug || "project-url"}</small></label><label>Display order<input type="number" min="0" value={form.sort_order} onChange={(event) => update("sort_order", Number(event.target.value))} /><small>Lower numbers appear first.</small></label></div>
            <label className="editor-toggle"><input type="checkbox" checked={form.is_featured} onChange={(event) => update("is_featured", event.target.checked)} /><span><b>Show as Featured Project</b><small>Featured projects use the larger showcase layout on the public Projects page.</small></span></label>
          </>}
          {tab === "hero" && <>
            <EditorSection title="Hero + project image" copy="The hero introduces the project, then this same image appears as the wide visual below it." />
            <ImageField title="Hero / detail image" copy="Shown as the public project's wide 21:9 cover image. Use at least 2100 × 900 px." ratio="hero" image={preview.hero_url || preview.thumbnail_url} onPick={() => setMediaOpen("hero")} onUpload={(event) => void uploadImage(event, "hero")} />
            <label>Sector / category<input value={form.sector} onChange={(event) => update("sector", event.target.value)} placeholder="e.g. Energy & infrastructure" /></label>
            <label>Hero introduction<textarea rows={5} value={form.summary} onChange={(event) => update("summary", event.target.value)} placeholder="A clear one-paragraph introduction to this project." /><small>This also appears on the thumbnail card, so write for both contexts.</small></label>
          </>}
          {tab === "stats" && <>
            <EditorSection title="Project information" copy="These four simple facts appear as the Project Info / Stats cards on the detail page." />
            <div className="editor-two-cols"><label>Client<input value={form.client_name} onChange={(event) => update("client_name", event.target.value)} placeholder="e.g. PIF / ACWA Power" /></label><label>Location<input value={form.location} onChange={(event) => update("location", event.target.value)} placeholder="e.g. Riyadh, Saudi Arabia" /></label><label>Project value / capacity<input value={form.value} onChange={(event) => update("value", event.target.value)} placeholder="e.g. 1,800 MW" /></label><label>Duration / status<input value={form.duration} onChange={(event) => update("duration", event.target.value)} placeholder="e.g. Completion 2028" /></label><label>Started on<input type="date" value={form.started_on ?? ""} onChange={(event) => update("started_on", event.target.value || null)} /></label><label>Completed on<input type="date" value={form.completed_on ?? ""} onChange={(event) => update("completed_on", event.target.value || null)} /></label></div>
          </>}
          {tab === "overview" && <>
            <EditorSection title="Overview + highlights" copy="This tab exactly follows the public site's Project Overview and Project Highlights block." />
            <section className="fixed-public-fields"><div><h4>Project Overview</h4><p>Exactly two paragraphs shown on the left side of the public layout.</p></div><label>Overview paragraph 1<textarea rows={5} value={form.overview[0]} onChange={(event) => updateList("overview", 0, event.target.value)} /></label><label>Overview paragraph 2<textarea rows={5} value={form.overview[1]} onChange={(event) => updateList("overview", 1, event.target.value)} /></label></section>
            <section className="fixed-public-fields highlights-fields"><div><h4>Project Highlights</h4><p>Exactly four check-mark highlights shown in the dark panel on the right.</p></div>{[0, 1, 2, 3].map((index) => <label key={index}>Highlight {index + 1}<input value={form.highlights[index]} onChange={(event) => updateList("highlights", index, event.target.value)} /></label>)}</section>
          </>}
          {tab === "seo" && <>
            <EditorSection title="Search and social sharing" copy="These fields help Google and social platforms understand the project. Plain language works best." />
            <label>SEO page title<input value={form.meta_title} onChange={(event) => update("meta_title", event.target.value)} maxLength={255} placeholder={form.title} /><small>{form.meta_title.length}/60 recommended · Leave blank to use project title.</small></label>
            <label>Meta description<textarea rows={4} value={form.meta_description} onChange={(event) => update("meta_description", event.target.value)} maxLength={320} placeholder={form.summary} /><small>{form.meta_description.length}/155 recommended · Leave blank to use the short card description.</small></label>
            <div className="seo-preview"><span>Google preview</span><strong>{seoTitle || "Project title"} | NOVARISE</strong><em>{SITE_ORIGIN}/projects/{form.slug || "project-url"}</em><p>{seoDescription || "Write a short project description so search visitors know what to expect."}</p></div>
          </>}
        </div>
        <aside className="project-editor-preview"><span>Live block preview · Desktop proportions</span><ScaledDesktopPreview tab={tab}><EditorPreview tab={tab} form={form} thumbnail={preview.thumbnail_url} hero={preview.hero_url || preview.thumbnail_url} /></ScaledDesktopPreview></aside>
      </div>}
      <footer className="project-editor-foot"><p>{notice || "Your changes are only public after Publish."}</p><div><button type="button" onClick={close}>Close</button><button type="button" className="editor-draft-button" onClick={() => void save("draft")} disabled={!!saving}>Save draft</button><button type="button" className="primary-button compact" onClick={() => void save("publish")} disabled={!!saving}>Publish</button></div></footer>
      {mediaOpen && <div className="media-picker-backdrop" onMouseDown={() => setMediaOpen(null)}><div className={`media-picker ${mediaOpen}`} onMouseDown={(event) => event.stopPropagation()}><div><p className="eyebrow">Choose image</p><h3>{mediaOpen === "thumbnail" ? "Thumbnail card · 16:10" : "Hero + project image · 21:9"}</h3></div><label className="primary-button compact upload-button"><Upload size={15} /> Upload new<input type="file" accept="image/*" hidden onChange={(event) => void uploadImage(event, mediaOpen)} /></label><button type="button" className="media-picker-close" onClick={() => setMediaOpen(null)}><X size={17} /></button><div className="media-picker-grid">{imageFor && <button type="button" className="media-option current" onClick={() => setMediaOpen(null)}><img src={imageFor} alt="Current selection" /><span>Current selection</span></button>}{media.map((asset) => <button type="button" className="media-option" key={asset.id} onClick={() => selectMedia(mediaOpen, asset)}><img src={asset.public_url} alt={asset.alt_text.en || asset.file_name} /><span>{asset.file_name}</span></button>)}</div></div></div>}
    </section>
  </div>, document.body);
}

function EditorSection({ title, copy }: { title: string; copy: string }) { return <div className="editor-section"><h3>{title}</h3><p>{copy}</p></div>; }
function ImageField({ title, copy, ratio, image, onPick, onUpload }: { title: string; copy: string; ratio: "thumbnail" | "hero"; image: string | null; onPick: () => void; onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void }) { return <div className={`editor-image-field ${ratio}`}><div>{image ? <img src={image} alt="Current public project" /> : <ImageIcon size={30} />}<span>{image ? `Current public ${title.toLowerCase()}` : title}</span></div><p>{copy}</p><div><button type="button" onClick={onPick}>{image ? "Replace from library" : "Choose from library"}</button><label><Upload size={15} /> {image ? "Upload replacement" : "Upload new"}<input type="file" accept="image/*" hidden onChange={onUpload} /></label></div></div>; }

const desktopPreviewHeights: Record<EditorTab, number> = { thumbnail: 780, hero: 560, stats: 330, overview: 590, seo: 340 };
function ScaledDesktopPreview({ tab, children }: { tab: EditorTab; children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const canvasWidth = 1280;
  const canvasHeight = desktopPreviewHeights[tab];
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const fit = () => setScale(Math.min(1, element.clientWidth / canvasWidth));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div className="desktop-preview-viewport" ref={host} style={{ height: canvasHeight * scale }}><div className={`desktop-preview-canvas preview-${tab}`} style={{ width: canvasWidth, height: canvasHeight, transform: `scale(${scale})` }}>{children}</div></div>;
}
function EditorPreview({ tab, form, thumbnail, hero }: { tab: EditorTab; form: ProjectEditorData; thumbnail: string | null; hero: string | null }) { if (tab === "thumbnail") return <div className="editor-preview-card">{thumbnail && <img src={thumbnail} alt="" />}<div><span>{form.is_featured ? "Featured project" : "Project"}</span><h3>{form.title || "Project title"}</h3><p>{form.summary || "Your concise project summary appears here."}</p></div></div>; if (tab === "hero") return <div className="editor-preview-hero">{hero && <img src={hero} alt="" />}<div><span>{form.sector || "Project sector"}</span><h2>{form.title || "Project title"}</h2><p>{form.summary || "Project introduction"}</p></div></div>; if (tab === "stats") return <div className="editor-preview-stats">{[["Client", form.client_name], ["Location", form.location], ["Value", form.value], ["Duration", form.duration]].map(([label, value]) => <div key={label}><span>{label}</span><b>{value || "—"}</b></div>)}</div>; if (tab === "overview") return <div className="editor-preview-public-overview"><div><span>Project Overview</span><h3>{form.title || "Project title"}</h3><p>{form.overview[0] || "Overview paragraph one"}</p><p>{form.overview[1] || "Overview paragraph two"}</p></div><aside><span>What We Deliver</span><h3>Project Highlights</h3>{form.highlights.map((entry, index) => <p key={index}><b>✓</b>{entry || `Highlight ${index + 1}`}</p>)}</aside></div>; return <div className="editor-preview-seo"><span>Search result</span><h3>{form.meta_title || form.title || "Project title"} | NOVARISE</h3><em>novarisesa.com/projects/{form.slug || "project-url"}</em><p>{form.meta_description || form.summary || "Project description"}</p></div>; }

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
  type Item = {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    status: string;
    summary?: string;
    created_at: string;
    subject?: string;
    message?: string;
    locale?: string;
    source?: string;
    reference?: string;
    service?: string;
    location?: string;
    budget?: string;
    timeline?: string;
    scope?: string;
    nationality?: string;
    iqama_number?: string;
    years_experience?: number | null;
    requirement_id?: string;
    internal_notes?: string | null;
  };
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(true);
  const [selected, setSelected] = useState<Item | null>(null);
  const [detail, setDetail] = useState<Item | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailStatus, setDetailStatus] = useState("new");
  const [detailNotes, setDetailNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const title = inboxNav.find(([key]) => key === inbox)?.[1] ?? humanize(inbox);
  const load = useCallback(() => {
    setBusy(true);
    api<{ items: Item[] }>(`/cms/inbox/${inbox}`).then((r) => setItems(r.items)).finally(() => setBusy(false));
  }, [inbox]);
  useEffect(load, [load]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailBusy(true);
    api<Item>(`/cms/inbox/${inbox}/${selected.id}`)
      .then((row) => {
        if (cancelled) return;
        setDetail(row);
        setDetailStatus(row.status);
        setDetailNotes(row.internal_notes ?? "");
      })
      .finally(() => {
        if (!cancelled) setDetailBusy(false);
      });
    return () => { cancelled = true; };
  }, [inbox, selected]);

  async function update(id: string, status: string, internalNotes?: string) {
    await api(`/cms/inbox/${inbox}/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        internal_notes: internalNotes ?? null,
      }),
    });
    load();
  }

  async function saveDetail(event: React.FormEvent) {
    event.preventDefault();
    if (!detail) return;
    setSaving(true);
    try {
      await update(detail.id, detailStatus, detailNotes);
      setSelected(null);
    } finally {
      setSaving(false);
    }
  }

  function detailRows(row: Item) {
    if (inbox === "contact") {
      return [
        ["Subject", row.subject],
        ["Message", row.message],
        ["Language", row.locale],
        ["Source", row.source],
      ];
    }
    if (inbox === "rfq") {
      return [
        ["Reference", row.reference],
        ["Service", row.service],
        ["Location", row.location],
        ["Budget", row.budget],
        ["Timeline", row.timeline],
        ["Scope", row.scope],
      ];
    }
    return [
      ["Phone", row.phone],
      ["Nationality", row.nationality],
      ["Iqama", row.iqama_number],
      ["Experience (years)", row.years_experience != null ? String(row.years_experience) : ""],
      ["Message", row.message],
    ];
  }

  return <>
    <PageHead eyebrow="Unified inbox" title={title} copy="Review every website submission and keep the team’s follow-up status current." />
    <div className="panel table-panel">
      {busy ? <Skeleton /> : items.length ? (
        <div className="message-list">
          {items.map((item) => (
            <article key={item.id} className={selected?.id === item.id ? "active" : ""} onClick={() => setSelected(item)} role="button" tabIndex={0} onKeyDown={(event) => event.key === "Enter" && setSelected(item)}>
              <div className="avatar small">{item.name.slice(0, 2).toUpperCase()}</div>
              <div className="message-body">
                <div><h3>{item.name}</h3><Badge value={item.status} /></div>
                <p>{item.summary || "No additional note provided."}</p>
                <small>{item.email || item.phone || "No contact detail"} {item.company ? `· ${item.company}` : ""} · {new Date(item.created_at).toLocaleString()}</small>
              </div>
              <select value={item.status} onClick={(event) => event.stopPropagation()} onChange={(event) => update(item.id, event.target.value)}>
                {["new", "in_review", "contacted", "qualified", "closed", "spam"].map((value) => (
                  <option key={value} value={value}>{humanize(value)}</option>
                ))}
              </select>
            </article>
          ))}
        </div>
      ) : <Empty copy="Your inbox is clear. New website submissions will appear here." />}
    </div>

    {selected && (
      <div className="modal-backdrop" onClick={() => setSelected(null)}>
        <form className="modal wide" onClick={(event) => event.stopPropagation()} onSubmit={saveDetail}>
          <div className="modal-head">
            <div>
              <p className="eyebrow">Submission detail</p>
              <h2>{detail?.name ?? selected.name}</h2>
            </div>
            <button type="button" onClick={() => setSelected(null)} aria-label="Close"><X size={18} /></button>
          </div>
          {detailBusy ? <Skeleton /> : detail ? (
            <div className="modal-body stack-form">
              <div className="inbox-detail-grid">
                <div><span>Email</span><strong>{detail.email || "—"}</strong></div>
                <div><span>Phone</span><strong>{detail.phone || "—"}</strong></div>
                <div><span>Company</span><strong>{detail.company || "—"}</strong></div>
                <div><span>Received</span><strong>{new Date(detail.created_at).toLocaleString()}</strong></div>
              </div>
              {detailRows(detail).map(([label, value]) => (
                value ? (
                  <label key={label} className="full">
                    {label}
                    <div className="inbox-detail-block">{value}</div>
                  </label>
                ) : null
              ))}
              <label>Status
                <select value={detailStatus} onChange={(event) => setDetailStatus(event.target.value)}>
                  {["new", "in_review", "contacted", "qualified", "closed", "spam"].map((value) => (
                    <option key={value} value={value}>{humanize(value)}</option>
                  ))}
                </select>
              </label>
              {inbox !== "applications" && (
                <label className="full">Internal notes
                  <textarea rows={4} value={detailNotes} onChange={(event) => setDetailNotes(event.target.value)} placeholder="Team-only notes about this submission…" />
                </label>
              )}
              <div className="modal-actions">
                <button type="button" onClick={() => setSelected(null)}>Close</button>
                <button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
              </div>
            </div>
          ) : <Empty copy="Could not load this submission." />}
        </form>
      </div>
    )}
  </>;
}

function SettingsPage({ user }: { user: User }) {
  const isOwner = user.roles.includes("owner");
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
    {!isOwner ? (
      <div className="panel">
        <Empty copy="Site settings are managed through Site content (pen mode) and the content editors. Raw JSON settings are restricted to the account owner." />
      </div>
    ) : (
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
    )}
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
