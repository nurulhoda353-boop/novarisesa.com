"use client";

import { useTranslation } from "react-i18next";
import { FileText, ClipboardList, Truck, HardHat, CheckCircle2 } from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "./Reveal";

const steps = [
  { no: "01", icon: FileText, key: "rfq" },
  { no: "02", icon: ClipboardList, key: "planning" },
  { no: "03", icon: Truck, key: "mobilization" },
  { no: "04", icon: HardHat, key: "execution" },
  { no: "05", icon: CheckCircle2, key: "handover" },
];

export function Process() {
  const { t } = useTranslation();
  return (
    <section id="process" className="relative py-16 lg:py-24 bg-white overflow-hidden">
      <div className="container-wide">
        <Reveal className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold mb-5">
            <span className="h-px w-8 bg-gold" />
            {t("process.eyebrow")}
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.05]">
            {t("process.title.l1")}<br />
            <span className="text-muted-foreground">{t("process.title.l2")}</span>
          </h2>
        </Reveal>

        <div className="relative">
          <div className="hidden lg:block absolute top-7 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

          <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-6 relative" stagger={0.08}>
            {steps.map((s) => (
              <StaggerItem key={s.no}>
                <div className="group relative text-center">
                  <div className="relative mx-auto mb-6 h-14 w-14 rounded-full bg-card border-2 border-gold flex items-center justify-center shadow-card transition-transform duration-500 group-hover:-translate-y-1 group-hover:shadow-gold">
                    <s.icon className="h-6 w-6 text-navy" strokeWidth={1.6} />
                    <span className="absolute -top-2 -right-2 h-6 min-w-6 px-1.5 rounded-full bg-navy text-white text-[10px] font-mono font-bold flex items-center justify-center">
                      {s.no}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-navy mb-2">{t(`process.steps.${s.key}.title`)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-[14rem] mx-auto">{t(`process.steps.${s.key}.desc`)}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </div>
    </section>
  );
}
