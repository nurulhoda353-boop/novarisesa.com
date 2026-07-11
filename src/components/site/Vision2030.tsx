"use client";

import Image from "next/image";

import { useTranslation } from "react-i18next";
import { Leaf, Users2, Globe2 } from "lucide-react";
import { Reveal } from "./Reveal";
import { AnimatedNumber } from "./AnimatedNumber";
const skylineImg = "/assets/vision-skyline.jpg";
const teamImg = "/assets/vision-team.jpg";

export function Vision2030() {
  const { t } = useTranslation();
  const pillars = [
    { icon: Users2, key: "expertise" },
    { icon: Leaf, key: "sustainable" },
    { icon: Globe2, key: "economic" },
  ];

  return (
    <section id="vision" className="relative py-16 lg:py-24 bg-sand-soft overflow-hidden">
      <div className="container-wide">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <Reveal className="lg:col-span-6">
            <div className="relative">
              <div className="grid grid-cols-5 grid-rows-6 gap-4 h-[520px]">
                <div className="relative col-span-3 row-span-4 rounded-2xl overflow-hidden shadow-elegant">
                  <Image src={skylineImg} alt="Riyadh skyline at sunset" fill sizes="(max-width: 1024px) 60vw, 30vw" className="object-cover" />
                </div>
                <div className="relative col-span-2 row-span-3 col-start-4 row-start-2 rounded-2xl overflow-hidden shadow-elegant border-4 border-background">
                  <Image src={teamImg} alt="NOVARISE team on site" fill sizes="(max-width: 1024px) 40vw, 20vw" className="object-cover" />
                </div>
                <div className="col-span-3 row-span-2 col-start-1 row-start-5 rounded-2xl bg-navy text-white p-6 flex flex-col justify-between shadow-elegant">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-gold">{t("vision.tileEyebrow")}</div>
                  <div>
                    <div className="text-4xl font-extrabold text-gold tabular-nums">
                      <AnimatedNumber value={2030} />
                    </div>
                    <div className="text-xs text-white/60 mt-1">{t("vision.horizon")}</div>
                  </div>
                </div>
                <div className="col-span-2 row-span-2 col-start-4 row-start-5 rounded-2xl gradient-gold p-6 flex flex-col justify-between shadow-gold">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-navy">{t("vision.ksa")}</div>
                  <div className="text-navy text-sm font-bold leading-tight">
                    {t("vision.aligned")}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal className="lg:col-span-6" delay={0.15}>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold mb-5">
              <span className="h-px w-8 bg-gold" />
              {t("vision.eyebrow")}
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.05]">
              {t("vision.title.l1")}<br />
              {t("vision.title.l2")}<br />
              <span className="text-gradient-gold">{t("vision.title.l3")}</span>
            </h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              {t("vision.desc")}
            </p>

            <div className="mt-10 grid sm:grid-cols-3 gap-6">
              <KPI value={65} suffix="%" label={t("vision.kpis.saudization")} />
              <KPI value={85} suffix="%" label={t("vision.kpis.local")} />
              <KPI value={100} suffix="%" label={t("vision.kpis.hse")} />
            </div>

            <div className="mt-10 grid gap-3">
              {pillars.map((c) => (
                <div
                  key={c.key}
                  className="group flex gap-4 items-start bg-card border border-border rounded-xl p-4 hover:border-gold hover:shadow-card transition-all"
                >
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-gold text-navy flex items-center justify-center transition-colors">
                    <c.icon className="h-4 w-4" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-navy">{t(`vision.pillars.${c.key}.title`)}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{t(`vision.pillars.${c.key}.desc`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function KPI({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  return (
    <div className="border-t-2 border-gold pt-4">
      <div className="text-3xl font-extrabold text-navy tabular-nums">
        <AnimatedNumber value={value} suffix={suffix} />
      </div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
