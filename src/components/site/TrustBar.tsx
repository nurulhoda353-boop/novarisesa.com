"use client";

import { useTranslation } from "react-i18next";

const clients = [
  "SAUDI ARAMCO",
  "SABIC",
  "SAMSUNG ENGINEERING",
  "HYUNDAI E&C",
  "DOOSAN",
  "MA'ADEN",
  "ROYAL COMMISSION",
  "SEC",
];

export function TrustBar() {
  const { t } = useTranslation();
  return (
    <section className="relative py-16 bg-sand-soft border-y border-border overflow-hidden">
      <div className="container-wide">
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className="h-px w-10 bg-gold/60" />
          <p className="text-center text-[11px] uppercase tracking-[0.4em] text-gold font-semibold">
            {t("trustBar.label")}
          </p>
          <span className="h-px w-10 bg-gold/60" />
        </div>
        <div className="relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />
          <div className="flex marquee gap-14 whitespace-nowrap">
            {[...clients, ...clients].map((c, i) => (
              <div
                key={i}
                className="group flex items-center gap-4 text-navy/50 hover:text-navy transition-colors text-lg lg:text-xl font-display font-bold tracking-[0.18em]"
              >
                <span className="h-2 w-2 rounded-full bg-gold/80 group-hover:bg-gold group-hover:scale-150 transition-all" />
                {c}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
