"use client";

import Image from "next/image";

import { useTranslation } from "react-i18next";
import { useCmsAsset } from "@/lib/cms-content";
import { ShieldCheck } from "lucide-react";
import { Reveal } from "./Reveal";
import { AnimatedNumber } from "./AnimatedNumber";
const hseImg = "/assets/hse-safety.jpg";

export function HSE() {
  const managedHseImg = useCmsAsset("home.hse", hseImg);
  const { t } = useTranslation();
  const statKeys = ["manHours", "lti", "training", "ppe"] as const;
  const statDecimals: Record<(typeof statKeys)[number], number> = { manHours: 1, lti: 0, training: 0, ppe: 0 };
  const stats = statKeys.map((key) => ({
    key,
    v: Number(t(`hse.stats.${key}.value`)) || 0,
    suffix: t(`hse.stats.${key}.suffix`),
    decimals: statDecimals[key],
  }));

  return (
    <section id="hse" className="relative py-16 lg:py-24 bg-sand-soft overflow-hidden">
      <div className="container-wide">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <Reveal className="lg:col-span-6">
            <div className="relative">
              <div className="relative aspect-[16/11] rounded-3xl overflow-hidden shadow-elegant" data-cms-asset="home.hse">
                <Image src={managedHseImg} alt="NOVARISE safety training session" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-tr from-navy/40 via-transparent to-transparent" />
              </div>
              <div className="absolute -bottom-6 -left-6 hidden md:flex items-center gap-3 rounded-2xl bg-card border border-border shadow-elegant px-5 py-4">
                <div className="h-10 w-10 rounded-full bg-gold/15 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground" data-cms-field="hse.certified">{t("hse.certified")}</div>
                  <div className="text-sm font-bold text-navy" data-cms-field="hse.isoLine">{t("hse.isoLine")}</div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal className="lg:col-span-6" delay={0.15}>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold mb-5">
              <span className="h-px w-8 bg-gold" />
              <span data-cms-field="hse.eyebrow" suppressContentEditableWarning>{t("hse.eyebrow")}</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.05]">
              <span data-cms-field="hse.titleA" suppressContentEditableWarning>{t("hse.titleA")}</span><br />
              <span className="text-gradient-gold" data-cms-field="hse.titleB" suppressContentEditableWarning>{t("hse.titleB")}</span>
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed" data-cms-field="hse.desc">
              {t("hse.desc")}
            </p>

            <div className="mt-10 grid grid-cols-2 gap-px bg-border rounded-2xl overflow-hidden border border-border shadow-card">
              {stats.map((s) => (
                <div key={s.key} className="bg-card p-6">
                  <div className="text-3xl lg:text-4xl font-display font-extrabold text-navy tabular-nums">
                    <AnimatedNumber value={s.v} suffix={s.suffix} decimals={s.decimals ?? 0} field={`hse.stats.${s.key}.value`} />
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-2" data-cms-field={`hse.stats.${s.key}.label`}>{t(`hse.stats.${s.key}.label`)}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
