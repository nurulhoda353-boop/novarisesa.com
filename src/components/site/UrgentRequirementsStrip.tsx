"use client";

import { Link } from "@/components/nav/AppLink";
import { useTranslation } from "react-i18next";
import { AlertCircle, ArrowUpRight } from "lucide-react";
import { REQUIREMENTS, URGENT_COUNT } from "@/lib/requirements-data";

/**
 * Slim, attention-grabbing announcement strip for the homepage.
 * Auto-scrolls through urgent positions on the right side.
 */
export function UrgentRequirementsStrip() {
  const { t } = useTranslation();
  if (URGENT_COUNT === 0) return null;

  const urgent = REQUIREMENTS.filter((r) => r.status === "urgent");
  // Duplicate list for seamless marquee loop
  const marquee = [...urgent, ...urgent];

  return (
    <section
      aria-label={t("urgentStrip.aria")}
      className="relative overflow-hidden bg-navy-deep text-white border-y border-gold/20"
    >
      <div className="container-wide">
        <div className="flex items-center gap-4 lg:gap-6 py-3">
          {/* Pulsing alert badge */}
          <Link
            to="/requirements"
            className="group flex items-center gap-2.5 shrink-0"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-gold opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gold" />
            </span>
            <span className="inline-flex items-center gap-2 text-[10px] lg:text-[11px] uppercase tracking-[0.28em] font-semibold text-gold">
              <AlertCircle className="h-3.5 w-3.5" />
              {t("urgentStrip.label", { count: URGENT_COUNT })}
            </span>
          </Link>

          <span className="hidden md:block h-4 w-px bg-white/20 shrink-0" />

          {/* Scrolling positions */}
          <div className="relative flex-1 overflow-hidden">
            <div className="flex gap-8 lg:gap-12 animate-marquee whitespace-nowrap will-change-transform">
              {marquee.map((r, i) => (
                <Link
                  key={`${r.id}-${i}`}
                  to="/requirements"
                  hash={r.id}
                  className="group inline-flex items-center gap-2.5 text-[12.5px] lg:text-sm text-white/85 hover:text-gold transition-colors"
                >
                  <span className="font-display font-semibold">
                    {t(`requirementsPage.items.${r.id}.position`, r.position)}
                  </span>
                  <span className="text-gold/70">·</span>
                  <span className="tabular-nums text-white/65">
                    {r.count} {t("urgentStrip.nos")}
                  </span>
                  <span className="text-gold/70">·</span>
                  <span className="text-white/65" dir="ltr">{r.rate}</span>
                </Link>
              ))}
            </div>
            {/* Edge fades */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-navy-deep to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-navy-deep to-transparent" />
          </div>

          {/* CTA */}
          <Link
            to="/requirements"
            className="group hidden sm:inline-flex items-center gap-1.5 shrink-0 rounded-full bg-gold px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-deep hover:scale-[1.04] transition-transform"
          >
            {t("urgentStrip.cta")}
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:rotate-45" />
          </Link>
        </div>
      </div>
    </section>
  );
}
