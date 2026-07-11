"use client";

import Image from "next/image";

import { useTranslation } from "react-i18next";
import { Building2, Zap, Truck, HardHat, Cpu, Package, ArrowUpRight } from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "./Reveal";
import { SectionNumber } from "./SectionNumber";
const capabilitiesHero = "/assets/capabilities-hero.jpg";

const pillars = [
  { icon: Building2, no: "01", slug: "civil", key: "civil" },
  { icon: Zap, no: "02", slug: "power", key: "power" },
  { icon: Truck, no: "03", slug: "rental", key: "rental" },
  { icon: HardHat, no: "04", slug: "manpower", key: "manpower" },
  { icon: Cpu, no: "05", slug: "it", key: "it" },
  { icon: Package, no: "06", slug: "trading", key: "trading" },
];

export function Capabilities() {
  const { t } = useTranslation();

  return (
    <section id="capabilities" className="relative py-16 lg:py-24 bg-sand-soft overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-gold/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-navy/5 blur-[120px]" />

      <div className="relative container-wide">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 mb-12 items-center">
          <Reveal className="lg:col-span-7">
            <SectionNumber num="01" label={t("capabilities.eyebrow")} className="mb-6" />
            <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-navy leading-[1.1]">
              {t("capabilities.titleA")} <span className="text-muted-foreground">{t("capabilities.titleB")}</span>
            </h2>
            <p className="mt-4 text-base lg:text-lg text-muted-foreground max-w-2xl leading-relaxed">
              {t("capabilities.desc")}
            </p>
          </Reveal>
          <Reveal className="lg:col-span-5" delay={0.15}>
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden shadow-elegant border border-border">
              <Image src={capabilitiesHero} alt="NOVARISE construction site at golden hour" fill sizes="(max-width: 1024px) 100vw, 42vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-tr from-navy-deep/80 via-navy-deep/30 to-transparent" />
              <div className="absolute inset-0 p-5 flex flex-col justify-between">
                <div className="self-end inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold anim-breathe" />
                  {t("capabilities.activeBadge")}
                </div>
                <div>
                  <div className="text-white text-[10px] uppercase tracking-[0.3em] opacity-70">{t("capabilities.engineeringKsa")}</div>
                  <div className="text-white text-2xl font-bold mt-1">{t("capabilities.since")}</div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        <StaggerGroup
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-3xl overflow-hidden border border-border shadow-card"
          stagger={0.06}
        >
          {pillars.map((p) => (
            <StaggerItem key={p.key}>
              <a
                href={`/services/${p.slug}`}
                className="group relative h-full block bg-card p-6 lg:p-7 transition-all duration-500 hover:bg-navy cursor-pointer overflow-hidden"
              >
                <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gold/0 blur-3xl transition-all duration-700 group-hover:bg-gold/20" />

                <div className="relative flex items-center justify-between mb-5">
                  <div className="h-12 w-12 rounded-xl bg-gold/15 group-hover:bg-gold flex items-center justify-center transition-all duration-500 group-hover:rotate-[-6deg] group-hover:scale-110">
                    <p.icon className="h-6 w-6 text-gold group-hover:text-navy transition-colors" strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground group-hover:text-gold/70 transition-colors">{p.no}</span>
                </div>
                <h3 className="relative text-xl font-bold mb-2 text-navy group-hover:text-white transition-colors">
                  {t(`services.${p.key}.label`)}
                </h3>
                <p className="relative text-[13px] text-muted-foreground group-hover:text-white/70 leading-relaxed transition-colors">
                  {t(`capabilities.pillars.${p.key}`)}
                </p>
                <div className="relative mt-5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
                  {t("capabilities.explore")}
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:rotate-45 group-hover:translate-x-0.5" />
                </div>
              </a>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
