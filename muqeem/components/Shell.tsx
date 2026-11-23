"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Archive, FileSpreadsheet, FilePlus2, LayoutDashboard, LogOut, Moon, Search, Sun, Table2 } from "lucide-react";
import { useAuth } from "./Auth";
import { CommandPalette } from "./CommandPalette";
import { usePrefs, type Lang } from "@/lib/prefs";

const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "bn", label: "বাং" },
  { code: "ar", label: "عر" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, canManage, signOut } = useAuth();
  const { t, lang, setLang, theme, toggleTheme } = usePrefs();
  const pathname = usePathname();
  const archivedTab = useSearchParams().get("tab") === "archived";
  const [paletteOpen, setPaletteOpen] = useState(false);

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
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/novarise-white.png" alt="NOVARISE" />
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
        <div className="sidebar-foot">
          <div className="who">{user.full_name}</div>
          <div className="mail">{user.email}</div>
          <button onClick={signOut}>
            <LogOut size={15} /> {t("common.signout")}
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
