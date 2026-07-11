"use client";

import { ShieldCheck, Award, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/site/Reveal";
import { AnimatedNumber } from "@/components/site/AnimatedNumber";

const items = [
  { icon: ShieldCheck, value: 12, suffix: "M+", key: "hours" },
  { icon: Award, value: 6, suffix: "+", key: "approvals" },
  { icon: Clock, value: 96, suffix: " hrs", key: "emergency" },
] as const;

export function ServicesTrust() {
  const { t } = useTranslation();
  return (
    <section className="relative py-16 lg:py-24 dark-premium overflow-hidden">
      <div className="pointer-events-none absolute -top-32 right-1/4 h-[420px] w-[420px] rounded-full bg-gold/12 blur-[140px] anim-drift" />
      <div className="container-wide relative">
        <Reveal className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
            <span className="h-px w-8 bg-gold" />
            {t("servicesPage.trust.eyebrow")}
            <span className="h-px w-8 bg-gold" />
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.1]">
            {t("servicesPage.trust.titleA")}<br />
            <span className="text-white/55">{t("servicesPage.trust.titleB")}</span>
          </h2>
        </Reveal>

        <StaggerGroup className="grid md:grid-cols-3 gap-5 lg:gap-7">
          {items.map((s) => (
            <StaggerItem key={s.key}>
              <div className="group relative h-full rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7 lg:p-8 hover:border-gold/40 transition-all duration-500 overflow-hidden">
                <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gold/15 blur-3xl opacity-70 group-hover:opacity-100 transition-opacity" />

                <div className="relative flex items-center gap-4 mb-5">
                  <span className="h-12 w-12 rounded-xl bg-gold/15 border border-gold/25 flex items-center justify-center group-hover:bg-gold group-hover:rotate-[-6deg] transition-all duration-500">
                    <s.icon className="h-5 w-5 text-gold group-hover:text-navy transition-colors" strokeWidth={1.7} />
                  </span>
                  <div className="text-3xl lg:text-4xl font-display font-extrabold text-white tabular-nums">
                    <AnimatedNumber value={s.value} suffix={s.suffix} />
                  </div>
                </div>

                <div className="relative text-sm font-display font-semibold text-white/90 mb-2">{t(`servicesPage.trust.items.${s.key}.label`)}</div>
                <p className="relative text-[13px] text-white/60 leading-relaxed">{t(`servicesPage.trust.items.${s.key}.desc`)}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
