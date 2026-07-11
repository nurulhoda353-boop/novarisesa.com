"use client";

import { useTranslation } from "react-i18next";
import { ShieldCheck, Clock, Users, Award, Wrench, TrendingUp } from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "./Reveal";

const reasons = [
  { icon: ShieldCheck, num: "01", key: "approved" },
  { icon: Clock, num: "02", key: "mobilize" },
  { icon: Users, num: "03", key: "workforce" },
  { icon: Wrench, num: "04", key: "fleet" },
  { icon: Award, num: "05", key: "hse" },
  { icon: TrendingUp, num: "06", key: "vision" },
];

export function WhyChooseUs() {
  const { t } = useTranslation();
  return (
    <section id="why-us" className="relative py-16 lg:py-24 bg-sand-soft overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-gold/15 blur-[140px] anim-breathe" />
      <div className="container-wide relative">
        <Reveal className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
            <span className="h-px w-8 bg-gold" />
            {t("whyUs.eyebrow")}
            <span className="h-px w-8 bg-gold" />
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.1]">
            {t("whyUs.titleA")}<br />
            <span className="text-muted-foreground">{t("whyUs.titleB")}</span>
          </h2>
        </Reveal>

        <StaggerGroup className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6" stagger={0.06}>
          {reasons.map((r) => (
            <StaggerItem key={r.num}>
              <article className="group relative h-full bg-card border border-border rounded-2xl p-6 lg:p-7 shadow-card hover:shadow-elegant hover:-translate-y-1 hover:border-gold transition-all duration-500 overflow-hidden">
                <span className="absolute top-0 left-0 h-1 w-0 group-hover:w-full bg-gold transition-all duration-700" />
                <span className="absolute top-4 right-5 text-[10px] font-mono tracking-[0.2em] text-muted-foreground/50">{r.num}</span>
                <div className="h-11 w-11 rounded-xl bg-gold/10 group-hover:bg-gold flex items-center justify-center mb-5 transition-all duration-500 group-hover:rotate-[-6deg]">
                  <r.icon className="h-5 w-5 text-gold group-hover:text-navy transition-colors" strokeWidth={1.6} />
                </div>
                <h3 className="text-base lg:text-lg font-display font-bold text-navy mb-2 leading-tight">{t(`whyUs.items.${r.key}.title`)}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{t(`whyUs.items.${r.key}.desc`)}</p>
              </article>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
