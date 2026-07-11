"use client";

import { useTranslation } from "react-i18next";
import { Reveal, StaggerGroup, StaggerItem } from "./Reveal";

// Stylized monogram marks — premium client wall.
const partners = [
  { mono: "AR", name: "Saudi Aramco", tag: "Energy" },
  { mono: "SB", name: "SABIC", tag: "Petrochem" },
  { mono: "MA", name: "Ma'aden", tag: "Mining" },
  { mono: "SE", name: "Samsung Eng.", tag: "EPC" },
  { mono: "HY", name: "Hyundai E&C", tag: "EPC" },
  { mono: "SEC", name: "Saudi Electricity", tag: "Power" },
  { mono: "N", name: "NEOM", tag: "Giga" },
  { mono: "RSG", name: "Red Sea Global", tag: "Tourism" },
  { mono: "RC", name: "Royal Commission", tag: "Jubail" },
  { mono: "PR", name: "Petro Rabigh", tag: "Refining" },
  { mono: "SP", name: "Sipchem", tag: "Chemicals" },
  { mono: "FL", name: "Fluor Arabia", tag: "EPC" },
];

export function Partners() {
  const { t } = useTranslation();
  return (
    <section id="partners" className="relative py-16 lg:py-24 dark-premium text-white overflow-hidden">
      <div className="absolute inset-x-0 top-0 gold-divider" />
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[420px] w-[820px] rounded-full bg-gold/10 blur-[120px] anim-breathe" />

      <div className="container-wide relative">
        <Reveal className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
            <span className="h-px w-8 bg-gold" />
            {t("partners.eyebrow")}
            <span className="h-px w-8 bg-gold" />
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] text-white">
            {t("partners.titleA")}<br />
            <span className="text-gradient-gold">{t("partners.titleAccent")}</span> {t("partners.titleB")}
          </h2>
        </Reveal>

        <StaggerGroup
          className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10"
          stagger={0.03}
        >
          {partners.map((p) => (
            <StaggerItem key={p.name}>
              <div className="group relative h-full bg-navy-deep aspect-[5/4] flex flex-col items-center justify-center text-center transition-all duration-500 hover:bg-navy">
                <div className="relative h-14 w-14 lg:h-16 lg:w-16 rounded-xl border border-white/15 group-hover:border-gold/60 flex items-center justify-center transition-all duration-500 group-hover:-translate-y-0.5">
                  <span className="font-display font-black text-white/90 group-hover:text-gold tracking-tight transition-colors text-base lg:text-lg">
                    {p.mono}
                  </span>
                  <span className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full bg-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-3 text-[11px] font-medium text-white/70 group-hover:text-white transition-colors px-2 leading-tight">
                  {p.name}
                </div>
                <div className="mt-1 text-[9px] uppercase tracking-[0.25em] text-white/30">
                  {p.tag}
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>

        <div className="relative mt-12 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-navy-deep to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-navy-deep to-transparent z-10" />
          <div className="flex marquee whitespace-nowrap py-5">
            {[...partners, ...partners].map((p, idx) => (
              <span
                key={`${p.name}-${idx}`}
                className="mx-8 inline-flex items-center gap-3 text-white/40 hover:text-gold transition-colors duration-500 cursor-default"
              >
                <span className="font-display font-black tracking-tight text-sm">{p.mono}</span>
                <span className="text-[11px] uppercase tracking-[0.28em]">{p.name}</span>
                <span className="text-gold/40">•</span>
              </span>
            ))}
          </div>
        </div>

        <Reveal className="mt-10 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
            {t("partners.disclaimer")}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
