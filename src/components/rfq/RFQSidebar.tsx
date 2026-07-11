"use client";

import { Clock, FileText, ShieldCheck, Phone, Mail, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/site/Reveal";

export function RFQSidebar() {
  const { t } = useTranslation();
  const steps = t("rfqPage.sidebar.steps", { returnObjects: true }) as string[];
  const trustData = t("rfqPage.sidebar.trust", { returnObjects: true }) as { title: string; desc: string }[];
  const trustIcons = [Clock, FileText, ShieldCheck];
  const trust = trustData.map((d, i) => ({ ...d, icon: trustIcons[i] ?? Clock }));

  return (
    <div className="space-y-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-navy to-navy-deep p-7 text-white shadow-elegant">
          <div className="pointer-events-none absolute -top-20 -right-20 h-52 w-52 rounded-full bg-gold/20 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-gold anim-breathe" />
              {t("rfqPage.sidebar.badge")}
            </div>
            <h3 className="mt-4 text-xl font-display font-semibold leading-snug whitespace-pre-line">
              {t("rfqPage.sidebar.title")}
            </h3>
            <ul className="mt-5 space-y-3 text-sm text-white/80">
              {steps.map((s, i) => (
                <li key={s} className="flex items-start gap-3">
                  <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center text-[10px] font-mono text-gold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7 pt-5 border-t border-white/10 space-y-3 text-sm">
              <a href="tel:+966554429574" className="group flex items-center gap-3 text-white/85 hover:text-gold transition-colors">
                <span className="h-8 w-8 rounded-full border border-white/15 bg-white/5 flex items-center justify-center group-hover:border-gold/40 transition-colors">
                  <Phone className="h-3.5 w-3.5 text-gold" />
                </span>
                +966 55 442 9574
              </a>
              <a href="mailto:ceo@novarisebd.com" className="group flex items-center gap-3 text-white/85 hover:text-gold transition-colors">
                <span className="h-8 w-8 rounded-full border border-white/15 bg-white/5 flex items-center justify-center group-hover:border-gold/40 transition-colors">
                  <Mail className="h-3.5 w-3.5 text-gold" />
                </span>
                ceo@novarisebd.com
              </a>
            </div>
          </div>
        </div>
      </Reveal>

      <StaggerGroup className="grid grid-cols-1 gap-4" stagger={0.06}>
        {trust.map((tr) => (
          <StaggerItem key={tr.title}>
            <div className="group relative bg-card border border-border rounded-2xl p-5 hover:border-gold hover:shadow-card transition-all duration-500 overflow-hidden">
              <span className="absolute top-0 left-0 h-1 w-0 group-hover:w-full bg-gold transition-all duration-700" />
              <div className="flex items-center gap-4">
                <span className="h-11 w-11 rounded-xl bg-gold/10 group-hover:bg-gold flex items-center justify-center shrink-0 transition-all duration-500 group-hover:rotate-[-6deg]">
                  <tr.icon className="h-5 w-5 text-gold group-hover:text-navy transition-colors" strokeWidth={1.7} />
                </span>
                <div className="min-w-0">
                  <div className="text-base font-display font-bold text-navy">{tr.title}</div>
                  <div className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{tr.desc}</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-gold group-hover:rotate-45 transition-all duration-500 ml-auto shrink-0" />
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </div>
  );
}
