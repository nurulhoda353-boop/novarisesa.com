"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Archive, Download, FileSpreadsheet, FilePlus2, LayoutDashboard, LogOut, Moon, Search, Settings, Sun, Table2 } from "lucide-react";
import { useAuth } from "./Auth";
import { CommandPalette } from "./CommandPalette";
import { ApiError, records } from "@/lib/api";
import { usePrefs, type Lang } from "@/lib/prefs";
import { exportXlsx } from "@/lib/sheetio";

const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "bn", label: "বাং" },
  { code: "ar", label: "عر" },
];

function PromoArt() {
  return (
    <svg className="art" viewBox="0 0 220 92" aria-hidden>
      <rect x="22" y="22" width="62" height="62" rx="10" fill="var(--line-soft)" />
      <rect x="132" y="30" width="58" height="54" rx="10" fill="var(--line-soft)" />
      <g transform="rotate(-6 100 50)">
        <rect x="64" y="8" width="84" height="80" rx="9" fill="var(--card)" stroke="var(--line)" />
        <rect x="76" y="22" width="26" height="6" rx="3" fill="var(--gold)" />
        <rect x="76" y="36" width="60" height="4" rx="2" fill="var(--line)" />
        <rect x="76" y="46" width="52" height="4" rx="2" fill="var(--line)" />
        <rect x="76" y="56" width="58" height="4" rx="2" fill="var(--line)" />
        <rect x="76" y="68" width="30" height="10" rx="5" fill="var(--accent)" opacity="0.85" />
      </g>
      <circle cx="40" cy="30" r="6" fill="var(--gold)" opacity="0.7" />
      <circle cx="186" cy="24" r="5" fill="var(--accent)" opacity="0.5" />
    </svg>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, canManage, signOut } = useAuth();
  const { t, lang, setLang, theme, toggleTheme } = usePrefs();
  const pathname = usePathname();
  const archivedTab = useSearchParams().get("tab") === "archived";
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function downloadReport() {
    setExporting(true);
    try {
      const all = await records.list({ limit: 2000, sort: "created_at", order: "desc" });
      await exportXlsx(all, `muqeem-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "Could not create the report");
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onRecords = pathname === "/records" || pathname.startsWith("/records/");
  const items = [
    { href: "/", label: t("nav.dashboard"), icon: LayoutDashboard, active: pathname === "/" },
    { href: "/records", label: t("nav.records"), icon: Table2, active: onRecords && !archivedTab },
    ...(canManage ? [{ href: "/new", label: t("nav.entry"), icon: FilePlus2, active: pathname === "/new" }] : []),
    { href: "/records?tab=archived", label: t("nav.archive"), icon: Archive, active: pathname === "/records" && archivedTab },
    { href: "/import", label: t("nav.import"), icon: FileSpreadsheet, active: pathname === "/import" },
    { href: "/settings", label: t("nav.settings"), icon: Settings, active: pathname === "/settings" },
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={theme === "dark" ? "/novarise-white.png" : "/novarise-navy.png"} alt="NOVARISE" />
          <p className="sidebar-title">{t("brand.title")}</p>
        </div>
        <nav className="nav">
          {items.map(({ href, label, icon: Icon, active }) => (
            <Link key={href} href={href} className={active ? "active" : ""}>
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="promo">
          <PromoArt />
          <b>{t("promo.title")}</b>
          <span>{t("promo.sub")}</span>
          <button className="btn primary" onClick={() => void downloadReport()} disabled={exporting}>
            <Download size={15} /> {exporting ? "…" : t("promo.btn")}
          </button>
        </div>
        <div className="sidebar-foot">
          <span className="avatar">{user.full_name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</span>
          <span className="who-wrap">
            <span className="who">{user.full_name}</span>
            <small>{user.email}</small>
          </span>
          <button onClick={signOut} title={t("common.signout")} aria-label={t("common.signout")}>
            <LogOut size={15} />
          </button>
        </div>
      </aside>
      <div className="content">
        <header className="topbar">
          <button className="cmd-trigger" onClick={() => setPaletteOpen(true)}>
            <Search size={16} />
            <span>{t("nav.search")}</span>
            <kbd>Ctrl K</kbd>
          </button>
          <div className="spacer" />
          <div className="lang-switch" role="group" aria-label="Language">
            {LANGS.map(({ code, label }) => (
              <button key={code} className={lang === code ? "on" : ""} onClick={() => setLang(code)}>
                {label}
              </button>
            ))}
          </div>
          <button className="icon-btn" onClick={toggleTheme} title={theme === "dark" ? t("theme.light") : t("theme.dark")} aria-label="Toggle theme">
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </header>
        <main className="main">{children}</main>
      </div>
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} canManage={canManage} />}
    </div>
  );
}
