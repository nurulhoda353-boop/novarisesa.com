"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Archive, ArrowDownLeft, ArrowUpRight, Building2, FilePlus2, Settings, TrendingUp, XCircle } from "lucide-react";
import { useAuth } from "@/components/Auth";
import { HBars, PairedBars, Ring, SmoothLine, Sparkline } from "@/components/Charts";
import { ApiError, records } from "@/lib/api";
import { usePrefs } from "@/lib/prefs";
import type { MuqeemRecord, Stats } from "@/lib/types";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  editor: "Editor",
  muqeem_super_admin: "Super Admin",
  muqeem_admin: "Admin",
  muqeem_editor: "Editor",
  accountant: "Accountant",
  finance_manager: "Finance Manager",
};

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "?"
  );
}

function dayKey(iso: string): "today" | "yesterday" | "earlier" {
  const then = new Date(iso);
  const now = new Date();
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((start(now) - start(then)) / 86_400_000);
  return diff <= 0 ? "today" : diff === 1 ? "yesterday" : "earlier";
}

function Activity({ row }: { row: MuqeemRecord }) {
  const ok = row.status.toLowerCase() === "valid";
  const when = new Date(row.created_at);
  const sameDay = dayKey(row.created_at) !== "earlier";
  return (
    <Link href={`/records/${row.id}`} className="act">
      <span className={`act-ico ${ok ? "ok" : "off"}`}>{ok ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</span>
      <span className="who">
        <b>{row.name}</b>
        <span>{row.occupation || row.passport_nationality || row.iqama_number}</span>
      </span>
      <span className="when">{sameDay ? when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : when.toLocaleDateString([], { day: "2-digit", month: "short" })}</span>
    </Link>
  );
}

export default function DashboardPage() {
  const { user, canManage } = useAuth();
  const { t } = usePrefs();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    records
      .stats()
      .then(setStats)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load the dashboard"));
  }, []);

  const role = ROLE_LABELS[user.roles[0] ?? ""] ?? user.roles[0] ?? "";
  const firstName = user.full_name.split(" ")[0];
  const validRate = stats && stats.total ? (stats.valid / stats.total) * 100 : 0;
  const groups = stats
    ? (["today", "yesterday", "earlier"] as const)
        .map((key) => ({ key, rows: stats.recent.filter((row) => dayKey(row.created_at) === key) }))
        .filter((group) => group.rows.length)
    : [];

  return (
    <>
      <div className="ov-head">
        <div>
          <div className="ov-title">{t("dash.title")}</div>
          <p className="ov-sub">
            {t("dash.welcome")}, {firstName}
          </p>
        </div>
        {canManage && (
          <Link href="/new" className="btn primary">
            <FilePlus2 size={17} /> {t("dash.new")}
          </Link>
        )}
      </div>

      {error && <div className="alert error">{error}</div>}

      {!stats && !error && (
        <div className="dash2">
          <div className="dash2-main">
            <div className="skeleton c5" style={{ height: 200, marginTop: 34 }} />
            <div className="skeleton c7" style={{ height: 240 }} />
            <div className="skeleton c7" style={{ height: 240 }} />
            <div className="skeleton c5" style={{ height: 240 }} />
          </div>
          <div className="skeleton" style={{ height: 520, borderRadius: 26 }} />
        </div>
      )}

      {stats && (
        <>
          <div className="pills">
            <span className="pill">
              <Building2 size={14} /> {t("dash.employers")} <b>{stats.employers}</b>
            </span>
            <span className="pill">
              <TrendingUp size={14} /> {t("dash.week")} <b>{stats.last_7_days}</b>
            </span>
            <span className="pill">
              <XCircle size={14} /> {t("dash.notvalid")} <b>{stats.not_valid}</b>
            </span>
            <Link href="/records?tab=archived" className="pill">
              <Archive size={14} /> {t("dash.archived")} <b>{stats.archived}</b>
            </Link>
          </div>

          <div className="dash2">
            <div className="dash2-main">
              <section className="hero-card rise">
                <div className="hero-top">
                  <span className="hero-dots">
                    <i />
                    <i />
                  </span>
                  <span className="hero-brand">NOVARISE · MUQEEM</span>
                </div>
                <div className="hero-num">
                  <small>{t("dash.onfile")}</small>
                  {stats.total.toLocaleString()}
                </div>
                <div className="hero-foot">
                  <div>
                    <small>{t("dash.valid").toUpperCase()}</small>
                    {stats.valid}
                  </div>
                  <div>
                    <small>{t("dash.month").toUpperCase()}</small>
                    {stats.this_month}
                  </div>
                  <div>
                    <small>{t("dash.holder").toUpperCase()}</small>
                    {firstName}
                  </div>
                </div>
              </section>

              <section className="card line-card rise" style={{ animationDelay: "80ms" }}>
                <h3>
                  {t("dash.monthly")} <small>12 months</small>
                </h3>
                <SmoothLine items={stats.monthly} />
              </section>

              <section className="card c7 rise" style={{ animationDelay: "140ms" }}>
                <h3>{t("dash.addedvsvalid")}</h3>
                <PairedBars items={stats.monthly} />
                <div className="legend-inline">
                  <span>
                    <i style={{ background: "var(--c2)" }} />
                    {t("dash.added")}
                  </span>
                  <span>
                    <i style={{ background: "var(--gold)" }} />
                    {t("dash.valid")}
                  </span>
                </div>
              </section>

              <section className="card c5 rise" style={{ animationDelay: "200ms" }}>
                <h3>{t("dash.validrate")}</h3>
                <div className="ring-wrap">
                  <Ring percent={validRate} caption={t("dash.valid")} />
                  <span className="ring-pill">
                    +{stats.this_month} {t("dash.month")}
                  </span>
                </div>
              </section>

              <section className="card c6 rise" style={{ animationDelay: "260ms" }}>
                <h3>{t("dash.nationality")}</h3>
                {stats.by_nationality.length ? <HBars items={stats.by_nationality} tone="var(--gold)" /> : <p className="cell-sub">{t("common.none")}</p>}
              </section>

              <section className="card c6 rise" style={{ animationDelay: "320ms" }}>
                <h3>{t("dash.occupation")}</h3>
                {stats.by_occupation.length ? <HBars items={stats.by_occupation} tone="var(--c2)" /> : <p className="cell-sub">{t("common.none")}</p>}
              </section>
            </div>

            <aside className="rightcol">
              <section className="card profile-card rise">
                <div className="profile-top">
                  <span className="avatar-lg">{initials(user.full_name)}</span>
                  <Link href="/settings" className="icon-btn" title={t("nav.settings")} aria-label={t("nav.settings")}>
                    <Settings size={17} />
                  </Link>
                </div>
                <h2>{user.full_name}</h2>
                <p>{role}</p>
              </section>

              <section className="card total-card rise" style={{ animationDelay: "80ms" }}>
                <div className="lbl">{t("dash.totalcard")}</div>
                <Sparkline values={stats.monthly.map((m) => m.count)} />
                <span className="spark-pill">+{stats.this_month}</span>
                <div className="big">{stats.total.toLocaleString()}</div>
              </section>

              <section className="card act-card rise" style={{ animationDelay: "140ms" }}>
                <h3>
                  {t("dash.activities")}
                  <Link href="/records" className="cell-sub" style={{ fontWeight: 500 }}>
                    {t("dash.viewall")}
                  </Link>
                </h3>
                {groups.length === 0 && <p className="cell-sub">{t("common.none")}</p>}
                {groups.map((group) => (
                  <div key={group.key}>
                    <div className="act-group">{t(`dash.${group.key}`)}</div>
                    {group.rows.map((row) => (
                      <Activity key={row.id} row={row} />
                    ))}
                  </div>
                ))}
              </section>
            </aside>
          </div>
        </>
      )}
    </>
  );
}
