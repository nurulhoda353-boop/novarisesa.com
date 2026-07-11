"use client";

import Image from "next/image";

import { useTranslation } from "react-i18next";
import { Flame, FlaskConical, Zap, Hammer, Mountain, Anchor } from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "./Reveal";
const industryImg = "/assets/industry-oilgas.jpg";

const industriesList = [
  { icon: Flame, key: "oilGas" },
  { icon: FlaskConical, key: "petrochem" },
  { icon: Zap, key: "power" },
  { icon: Hammer, key: "infra" },
  { icon: Mountain, key: "mining" },
  { icon: Anchor, key: "marine" },
];

export function Industries() {
  const { t } = useTranslation();
  return (
    <section id="industries" className="relative py-16 lg:py-24 dark-premium text-white overflow-hidden">
      <div className="absolute inset-x-0 top-0 gold-divider" />
      <div className="container-wide">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <Reveal className="lg:col-span-5">
            <div className="relative">
              <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-elegant">
                <Image src={industryImg} alt="Saudi oil and gas refinery at golden hour" fill sizes="(max-width: 1024px) 100vw, 42vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/90 via-navy-deep/20 to-transparent" />
              </div>
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <div className="text-[10px] uppercase tracking-[0.3em] text-gold mb-2">{t("industries.imgEyebrow")}</div>
                <div className="text-2xl font-display font-bold leading-tight whitespace-pre-line">{t("industries.imgTitle")}</div>
              </div>
              <div className="hidden md:block absolute -top-5 -right-5 rounded-2xl bg-gold text-navy px-5 py-3 shadow-gold">
                <div className="text-[10px] uppercase tracking-[0.25em] font-semibold">{t("industries.badgeBrand")}</div>
                <div className="text-xs font-bold">{t("industries.badgeText")}</div>
              </div>
            </div>
          </Reveal>

          <div className="lg:col-span-7">
            <Reveal>
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold mb-5">
                <span className="h-px w-8 bg-gold" />
                {t("industries.eyebrow")}
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.05] text-white">
                {t("industries.title.l1")}<br />
                <span className="text-gradient-gold">{t("industries.title.l2")}</span><br />
                {t("industries.title.l3")}
              </h2>
            </Reveal>

            <StaggerGroup className="mt-10 grid sm:grid-cols-2 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10" stagger={0.06}>
              {industriesList.map((s) => (
                <StaggerItem key={s.key}>
                  <div className="group h-full bg-navy-deep p-6 lg:p-7 transition-colors hover:bg-navy">
                    <div className="flex items-start gap-4">
                      <div className="h-11 w-11 shrink-0 rounded-xl bg-gold/15 group-hover:bg-gold flex items-center justify-center transition-all duration-500 group-hover:rotate-[-6deg]">
                        <s.icon className="h-5 w-5 text-gold group-hover:text-navy transition-colors" strokeWidth={1.6} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-bold text-white">{t(`industries.list.${s.key}.name`)}</div>
                        <div className="text-xs text-white/60 mt-1.5 leading-relaxed">{t(`industries.list.${s.key}.desc`)}</div>
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </div>
      </div>
    </section>
  );
}
