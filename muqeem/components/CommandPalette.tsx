"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, FileSpreadsheet, FilePlus2, FileText, LayoutDashboard, Table2 } from "lucide-react";
import { records } from "@/lib/api";
import { usePrefs } from "@/lib/prefs";
import type { MuqeemRecord } from "@/lib/types";

interface Entry {
  key: string;
  group: "pages" | "records";
  label: string;
  hint?: string;
  icon: React.ReactNode;
  href: string;
}

/** Ctrl+K: jump to a page or open any resident by name / iqama / passport number. */
export function CommandPalette({ onClose, canManage }: { onClose: () => void; canManage: boolean }) {
  const router = useRouter();
  const { t } = usePrefs();
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<MuqeemRecord[]>([]);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setFound([]);
      return;
    }
    let live = true;
    const timer = window.setTimeout(() => {
      records
        .list({ q: text, limit: 8 })
        .then((rows) => live && setFound(rows))
        .catch(() => live && setFound([]));
    }, 200);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const entries = useMemo<Entry[]>(() => {
    const pages: Entry[] = [
      { key: "p-dash", group: "pages", label: t("nav.dashboard"), icon: <LayoutDashboard size={16} />, href: "/" },
      { key: "p-rec", group: "pages", label: t("nav.records"), icon: <Table2 size={16} />, href: "/records" },
      ...(canManage ? [{ key: "p-new", group: "pages" as const, label: t("nav.entry"), icon: <FilePlus2 size={16} />, href: "/new" }] : []),
      { key: "p-arc", group: "pages", label: t("nav.archive"), icon: <Archive size={16} />, href: "/records?tab=archived" },
      { key: "p-imp", group: "pages", label: t("nav.import"), icon: <FileSpreadsheet size={16} />, href: "/import" },
    ];
    const text = query.trim().toLowerCase();
    const shownPages = text ? pages.filter((page) => page.label.toLowerCase().includes(text)) : pages;
    const hits: Entry[] = found.map((row) => ({
      key: row.id,
      group: "records",
      label: row.name,
      hint: row.iqama_number,
      icon: <FileText size={16} />,
      href: `/records/${row.id}`,
    }));
    return [...shownPages, ...hits];
  }, [found, query, t, canManage]);

  useEffect(() => {
    setCursor(0);
  }, [entries.length]);

  function open(entry: Entry | undefined) {
    if (!entry) return;
    onClose();
    router.push(entry.href);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") onClose();
    else if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((c) => Math.min(entries.length - 1, c + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (event.key === "Enter") open(entries[cursor]);
  }

  let lastGroup = "";
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
        <input ref={inputRef} placeholder={t("palette.placeholder")} value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="results">
          {entries.length === 0 && <div className="empty" style={{ padding: 24 }}>{t("palette.empty")}</div>}
          {entries.map((entry, index) => {
            const heading = entry.group !== lastGroup ? t(entry.group === "pages" ? "palette.pages" : "palette.records") : null;
            lastGroup = entry.group;
            return (
              <div key={entry.key}>
                {heading && <div className="group">{heading}</div>}
                <button className={`item${index === cursor ? " on" : ""}`} onMouseEnter={() => setCursor(index)} onClick={() => open(entry)}>
                  {entry.icon}
                  <span>{entry.label}</span>
                  {entry.hint && <small>{entry.hint}</small>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
