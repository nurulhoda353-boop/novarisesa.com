"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Archive, Building2, CalendarPlus, CheckCircle2, FilePlus2, TrendingUp, Users, XCircle } from "lucide-react";
import { useAuth } from "@/components/Auth";
import { Donut, HBars, MonthlyBars } from "@/components/Charts";
import { ApiError, records } from "@/lib/api";
import { usePrefs } from "@/lib/prefs";
import type { Stats } from "@/lib/types";

function Kpi({ icon, value, label, tone, delay }: { icon: React.ReactNode; value: number; label: string; tone: string; delay: number }) {
  return (
    <div className="panel kpi rise" style={{ ["--tone" as string]: tone, animationDelay: `${delay}ms` }}>
      <div className="chip">{icon}</div>
      <div>
        <div className="num">{value.toLocaleString()}</div>
        <div className="lbl">{label}</div>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
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

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{t("dash.eyebrow")}</p>
          <h1>{t("dash.title")}</h1>
          <p style={{ margin: "10px 0 0", color: "var(--muted)" }}>
            {t("dash.welcome")}, {user.full_name.split(" ")[0]}
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
        <>
          <div className="kpis">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="panel kpi">
                <div className="skeleton" style={{ width: 46, height: 46 }} />
                <div className="skeleton" style={{ flex: 1, height: 40 }} />
              </div>
            ))}
          </div>
          <div className="skeleton" style={{ height: 280 }} />
        </>
      )}

      {stats && (
        <>
          <div className="kpis">
            <Kpi icon={<Users size={22} />} value={stats.total} label={t("dash.total")} tone="var(--gold)" delay={0} />
            <Kpi icon={<CheckCircle2 size={22} />} value={stats.valid} label={t("dash.valid")} tone="var(--success)" delay={60} />
            <Kpi icon={<CalendarPlus size={22} />} value={stats.this_month} label={t("dash.month")} tone="var(--orange)" delay={120} />
            <Kpi icon={<TrendingUp size={22} />} value={stats.last_7_days} label={t("dash.week")} tone="#6b8fd6" delay={180} />
          </div>

          <div className="dash-grid">
            <section className="panel panel-pad c8 rise" style={{ animationDelay: "120ms" }}>
              <h2>
                <i />
                {t("dash.monthly")}
              </h2>
              <MonthlyBars items={stats.monthly} />
            </section>

            <section className="panel panel-pad c4 rise" style={{ animationDelay: "180ms" }}>
              <h2>
                <i />
                {t("dash.status")}
              </h2>
              {stats.by_status.length ? <Donut items={stats.by_status} centerLabel={t("common.records")} /> : <p className="cell-sub">{t("common.none")}</p>}
              <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap", fontSize: 13.5, color: "var(--muted)" }}>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <Building2 size={15} /> {t("dash.employers")}: <b style={{ color: "var(--heading)" }}>{stats.employers}</b>
                </span>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <XCircle size={15} /> {t("dash.notvalid")}: <b style={{ color: "var(--heading)" }}>{stats.not_valid}</b>
                </span>
                <Link href="/records?tab=archived" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <Archive size={15} /> {t("dash.archived")}: <b style={{ color: "var(--heading)" }}>{stats.archived}</b>
                </Link>
              </div>
            </section>

            <section className="panel panel-pad c4 rise" style={{ animationDelay: "240ms" }}>
              <h2>
                <i />
                {t("dash.nationality")}
              </h2>
              {stats.by_nationality.length ? <HBars items={stats.by_nationality} tone="var(--gold)" /> : <p className="cell-sub">{t("common.none")}</p>}
            </section>

            <section className="panel panel-pad c4 rise" style={{ animationDelay: "300ms" }}>
              <h2>
                <i />
                {t("dash.occupation")}
              </h2>
              {stats.by_occupation.length ? <HBars items={stats.by_occupation} tone="var(--c2)" /> : <p className="cell-sub">{t("common.none")}</p>}
            </section>

            <section className="panel panel-pad c4 rise" style={{ animationDelay: "360ms" }}>
              <h2>
                <i />
                {t("dash.recent")}
              </h2>
              {stats.recent.length ? (
                <div className="recent-list">
                  {stats.recent.map((row) => (
                    <Link key={row.id} href={`/records/${row.id}`}>
                      <span className="avatar">{initials(row.name)}</span>
                      <span className="who">
                        <b>{row.name}</b>
                        <span>
                          {row.iqama_number} · {row.occupation || row.passport_nationality}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="cell-sub">{t("common.none")}</p>
              )}
              <div style={{ marginTop: 12 }}>
                <Link href="/records" className="btn small">
                  {t("dash.viewall")}
                </Link>
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}
