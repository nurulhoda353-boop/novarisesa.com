"use client";

import {
  Activity,
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
  Settings,
  ShieldCheck,
  Star,
  Sun,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
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

  const renderCards = (groupItems: ContentItem[]) => (
    <div className="content-grid">
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
      key: "other",
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
                {renderCards(group.items)}
              </section>
            ))}
          </div>
        ) : renderCards(visible)
      ) : <Empty copy={`No ${title.toLowerCase()} yet.`} />}
    </div>
  </>;
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
