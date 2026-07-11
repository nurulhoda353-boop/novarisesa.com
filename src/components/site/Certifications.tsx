"use client";

import { useTranslation } from "react-i18next";
import { ShieldCheck, Award, FileCheck2, BadgeCheck } from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "./Reveal";

const certs = [
  { code: "ISO 9001", key: "iso9001", icon: Award, no: "01" },
  { code: "ISO 14001", key: "iso14001", icon: FileCheck2, no: "02" },
  { code: "ISO 45001", key: "iso45001", icon: ShieldCheck, no: "03" },
  { code: "OSHA", key: "osha", icon: BadgeCheck, no: "04" },
  { code: "Aramco", key: "aramco", icon: BadgeCheck, no: "05" },
  { code: "GOSI", key: "gosi", icon: FileCheck2, no: "06" },
  { code: "ZATCA", key: "zatca", icon: FileCheck2, no: "07" },
  { code: "MOC", key: "moc", icon: ShieldCheck, no: "08" },
];

export function Certifications() {
  const { t } = useTranslation();
  return (
    <section id="certifications" className="relative py-16 lg:py-24 bg-white">
      <div className="container-wide">
        <Reveal className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold mb-5">
            <span className="h-px w-8 bg-gold" />
            {t("certifications.eyebrow")}
            <span className="h-px w-8 bg-gold" />
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.05]">
            {t("certifications.titleA")}<br />
            <span className="text-muted-foreground">{t("certifications.titleB")}</span>
          </h2>
        </Reveal>

        <StaggerGroup className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-5" stagger={0.05}>
          {certs.map((c) => (
            <StaggerItem key={c.code}>
              <div className="group relative h-full bg-card border border-border rounded-2xl p-6 lg:p-7 transition-all duration-500 hover:border-gold hover:-translate-y-1.5 hover:shadow-elegant overflow-hidden">
                <div className="absolute top-0 left-0 h-1 w-0 bg-gold transition-all duration-500 group-hover:w-full" />
                {/* Corner accent */}
                <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gold/0 blur-2xl transition-all duration-700 group-hover:bg-gold/25" />
                <span className="absolute top-4 right-5 text-[10px] font-mono text-muted-foreground/60 group-hover:text-gold/70 transition-colors">{c.no}</span>

                <div className="h-12 w-12 mb-5 rounded-xl bg-gold/10 group-hover:bg-gold flex items-center justify-center transition-all duration-500 group-hover:rotate-[-8deg] group-hover:scale-110 group-hover:shadow-gold">
                  <c.icon className="h-5 w-5 text-gold group-hover:text-navy transition-colors" strokeWidth={1.8} />
                </div>
                <div className="text-lg font-bold text-navy">{c.code}</div>
                <div className="text-xs text-muted-foreground mt-1 leading-snug">{t(`certifications.items.${c.key}`)}</div>

                {/* Verified checkmark */}
                <div className="absolute bottom-4 right-4 h-5 w-5 rounded-full bg-gold/0 group-hover:bg-gold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-75 group-hover:scale-100">
                  <svg className="h-3 w-3 text-navy" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
