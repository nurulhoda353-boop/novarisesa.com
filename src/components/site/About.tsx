"use client";

import { useTranslation } from "react-i18next";
import { Reveal, StaggerGroup, StaggerItem } from "./Reveal";
import { AnimatedHeading } from "./AnimatedHeading";
import { AnimatedNumber } from "./AnimatedNumber";

export function About() {
  const { t } = useTranslation();
  const stats: { v: number | string; suffix?: string; l: string; animate: boolean }[] = [
    { v: 2019, suffix: "", l: t("about.stats.established"), animate: true },
    { v: t("about.stats.riyadh"), l: t("about.stats.headquartered"), animate: false },
    { v: 5, suffix: "+", l: t("about.stats.verticals"), animate: true },
  ];

  return (
    <section id="about" className="relative py-14 lg:py-20 bg-sand-soft overflow-hidden">
      <div className="container-wide">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          <Reveal className="lg:col-span-5">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold mb-5">
              <span className="h-px w-8 bg-gold" />
              {t("about.eyebrow")}
            </div>
            <AnimatedHeading
              as="h2"
              className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.05]"
              lines={[
                t("about.title.l1"),
                { text: t("about.title.l2"), className: "text-gold" },
                t("about.title.l3"),
                { text: t("about.title.l4"), className: "text-muted-foreground" },
              ]}
            />
          </Reveal>

          <Reveal className="lg:col-span-7 lg:pt-4" delay={0.15}>
            <p className="text-xl text-navy font-medium leading-relaxed">
              {t("about.p1")}
            </p>
            <p className="mt-6 text-base text-muted-foreground leading-relaxed">
              {t("about.p2Prefix")}<span className="font-semibold text-navy">{t("about.p2Brands")}</span>{t("about.p2Suffix")}
            </p>

            <StaggerGroup className="mt-10 grid sm:grid-cols-3 gap-8">
              {stats.map((s) => (
                <StaggerItem key={s.l}>
                  <div className="text-3xl font-extrabold text-navy tabular-nums">
                    {s.animate ? <AnimatedNumber value={s.v as number} suffix={s.suffix} /> : s.v}
                  </div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{s.l}</div>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
