"use client";

import Image from "next/image";

import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";
import { Reveal } from "./Reveal";
import { AnimatedNumber } from "./AnimatedNumber";
const hseImg = "/assets/hse-safety.jpg";

export function HSE() {
  const { t } = useTranslation();
  const stats = [
    { v: 2.1, suffix: "M+", key: "manHours", decimals: 1 },
    { v: 0, suffix: "", key: "lti" },
    { v: 12000, suffix: "+", key: "training" },
    { v: 100, suffix: "%", key: "ppe" },
  ];

  return (
    <section id="hse" className="relative py-16 lg:py-24 bg-sand-soft overflow-hidden">
      <div className="container-wide">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <Reveal className="lg:col-span-6">
            <div className="relative">
              <div className="relative aspect-[16/11] rounded-3xl overflow-hidden shadow-elegant">
                <Image src={hseImg} alt="NOVARISE safety training session" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-tr from-navy/40 via-transparent to-transparent" />
              </div>
              <div className="absolute -bottom-6 -left-6 hidden md:flex items-center gap-3 rounded-2xl bg-card border border-border shadow-elegant px-5 py-4">
                <div className="h-10 w-10 rounded-full bg-gold/15 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{t("hse.certified")}</div>
                  <div className="text-sm font-bold text-navy">{t("hse.isoLine")}</div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal className="lg:col-span-6" delay={0.15}>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold mb-5">
              <span className="h-px w-8 bg-gold" />
              {t("hse.eyebrow")}
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.05]">
              {t("hse.titleA")}<br />
              <span className="text-gradient-gold">{t("hse.titleB")}</span>
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
              {t("hse.desc")}
            </p>

            <div className="mt-10 grid grid-cols-2 gap-px bg-border rounded-2xl overflow-hidden border border-border shadow-card">
              {stats.map((s) => (
                <div key={s.key} className="bg-card p-6">
                  <div className="text-3xl lg:text-4xl font-display font-extrabold text-navy tabular-nums">
                    <AnimatedNumber value={s.v} suffix={s.suffix} decimals={s.decimals ?? 0} />
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-2">{t(`hse.stats.${s.key}`)}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
