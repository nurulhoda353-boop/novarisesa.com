"use client";

import { FileText, Truck, HardHat, ClipboardCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/site/Reveal";

const steps = [
  { num: "01", icon: FileText, key: "rfq" },
  { num: "02", icon: Truck, key: "mob" },
  { num: "03", icon: HardHat, key: "exec" },
  { num: "04", icon: ClipboardCheck, key: "handover" },
] as const;

export function ServicesProcess() {
  const { t } = useTranslation();
  return (
    <section className="relative py-16 lg:py-24 bg-white overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/3 h-[420px] w-[420px] rounded-full bg-gold/8 blur-[140px] anim-drift" />
      <div className="container-wide relative">
        <Reveal className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
            <span className="h-px w-8 bg-gold" />
            {t("servicesPage.process.eyebrow")}
            <span className="h-px w-8 bg-gold" />
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.1]">
            {t("servicesPage.process.titleA")}<br />
            <span className="text-muted-foreground">{t("servicesPage.process.titleB")}</span>
          </h2>
        </Reveal>

        <StaggerGroup className="relative grid md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6" stagger={0.08}>
          <div className="hidden lg:block absolute top-12 left-[12%] right-[12%] h-px border-t border-dashed border-gold/40 -z-0" />

          {steps.map((s) => (
            <StaggerItem key={s.num}>
              <div className="group relative h-full bg-card border border-border rounded-2xl p-6 lg:p-7 hover:border-gold hover:shadow-elegant hover:-translate-y-1 transition-all duration-500 overflow-hidden">
                <span className="absolute top-0 left-0 h-1 w-0 group-hover:w-full bg-gold transition-all duration-700" />

                <div className="relative flex items-center justify-between mb-5">
                  <div className="h-12 w-12 rounded-xl bg-gold/10 group-hover:bg-gold flex items-center justify-center transition-all duration-500 group-hover:rotate-[-6deg]">
                    <s.icon className="h-5 w-5 text-gold group-hover:text-navy transition-colors" strokeWidth={1.7} />
                  </div>
                  <span className="text-2xl font-display font-extrabold text-gold/30 tabular-nums">{s.num}</span>
                </div>

                <h3 className="text-base lg:text-lg font-display font-bold text-navy mb-2 leading-tight">
                  {t(`servicesPage.process.steps.${s.key}.title`)}
                </h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  {t(`servicesPage.process.steps.${s.key}.desc`)}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
