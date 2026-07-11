"use client";

import { Flame, FlaskConical, Zap, Building, Factory, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/site/Reveal";

const industries = [
  { icon: Flame, key: "oilGas" },
  { icon: FlaskConical, key: "petrochem" },
  { icon: Zap, key: "power" },
  { icon: Building, key: "infra" },
  { icon: Factory, key: "manufacturing" },
  { icon: Truck, key: "logistics" },
] as const;

export function ServicesIndustries() {
  const { t } = useTranslation();
  return (
    <section className="relative py-16 lg:py-24 bg-sand-soft overflow-hidden">
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-[420px] w-[420px] rounded-full bg-gold/12 blur-[140px] anim-breathe" />
      <div className="container-wide relative">
        <Reveal className="max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
            <span className="h-px w-8 bg-gold" />
            {t("servicesPage.industries.eyebrow")}
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.1]">
            {t("servicesPage.industries.titleA")}<br />
            <span className="text-muted-foreground">{t("servicesPage.industries.titleB")}</span>
          </h2>
        </Reveal>

        <StaggerGroup className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" stagger={0.05}>
          {industries.map((s) => (
            <StaggerItem key={s.key}>
              <div className="group relative h-full bg-card border border-border rounded-2xl p-5 hover:border-gold hover:shadow-card hover:-translate-y-0.5 transition-all duration-500 text-center">
                <div className="h-11 w-11 mx-auto mb-3 rounded-xl bg-gold/10 group-hover:bg-gold flex items-center justify-center transition-all duration-500 group-hover:rotate-[-6deg]">
                  <s.icon className="h-5 w-5 text-gold group-hover:text-navy transition-colors" strokeWidth={1.7} />
                </div>
                <div className="text-sm font-display font-bold text-navy">{t(`servicesPage.industries.items.${s.key}.label`)}</div>
                <div className="text-[11px] text-muted-foreground mt-1 leading-snug">{t(`servicesPage.industries.items.${s.key}.desc`)}</div>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
