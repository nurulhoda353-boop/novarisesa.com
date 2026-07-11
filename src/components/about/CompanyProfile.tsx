"use client";

import Image from "next/image";

import { Building2, Users, Globe2, Briefcase } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/site/Reveal";
import { AnimatedNumber } from "@/components/site/AnimatedNumber";
const profileImg = "/assets/manpower.jpg";

export function CompanyProfile() {
  const { t } = useTranslation();
  const pillars = [
    { icon: Building2, label: t("aboutPage.profile.pillars.civil") },
    { icon: Users, label: t("aboutPage.profile.pillars.manpower") },
    { icon: Briefcase, label: t("aboutPage.profile.pillars.rental") },
    { icon: Globe2, label: t("aboutPage.profile.pillars.vision") },
  ];
  const stats = [
    { v: 2500, suffix: "+", l: t("aboutPage.profile.stats.workforce") },
    { v: 12, suffix: "M+", l: t("aboutPage.profile.stats.hours") },
    { v: 25, suffix: "M", l: t("aboutPage.profile.stats.turnover") },
    { v: 6, suffix: "+", l: t("aboutPage.profile.stats.verticals") },
  ];

  return (
    <section id="company-profile" className="relative py-16 lg:py-24 bg-sand-soft overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-navy/5 blur-[120px]" />
      <div className="container-wide relative">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          <Reveal className="lg:col-span-5">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
              <span className="h-px w-8 bg-gold" />
              {t("aboutPage.profile.eyebrow")}
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.05]">
              {t("aboutPage.profile.titleA")}<br />
              <span className="text-gold">{t("aboutPage.profile.titleB")}</span><br />
              {t("aboutPage.profile.titleC")}
            </h2>

            <div className="mt-8 relative h-72 rounded-2xl overflow-hidden border border-border shadow-elegant group">
              <Image
                src={profileImg}
                alt="NOVARISE crew on site"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/85 via-navy/20 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between text-white">
                <div className="text-[10px] uppercase tracking-[0.3em] text-gold">{t("aboutPage.profile.imageEyebrow")}</div>
                <div className="inline-flex items-center gap-2 text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold anim-breathe" />
                  {t("aboutPage.profile.imageBadge")}
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal className="lg:col-span-7 lg:pt-4" delay={0.15}>
            <p className="lead-paragraph text-xl text-navy font-medium leading-relaxed">
              {t("aboutPage.profile.lead")}
            </p>
            <p className="mt-5 text-base text-muted-foreground leading-relaxed">
              {t("aboutPage.profile.bodyStart")}
              <span className="font-semibold text-navy">{t("aboutPage.profile.bodyClients")}</span>
              {t("aboutPage.profile.bodyEnd")}
            </p>

            <StaggerGroup className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-6">
              {stats.map((s) => (
                <StaggerItem key={s.l}>
                  <div className="text-2xl lg:text-3xl font-display font-extrabold text-navy tabular-nums">
                    <AnimatedNumber value={s.v} suffix={s.suffix} />
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-1.5">
                    {s.l}
                  </div>
                </StaggerItem>
              ))}
            </StaggerGroup>

            <StaggerGroup className="mt-10 grid sm:grid-cols-2 gap-3" stagger={0.06}>
              {pillars.map((p) => (
                <StaggerItem key={p.label}>
                  <div className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 hover:border-gold hover:shadow-card transition-all duration-500">
                    <span className="h-9 w-9 rounded-lg bg-gold/10 group-hover:bg-gold flex items-center justify-center transition-colors duration-500">
                      <p.icon className="h-4 w-4 text-gold group-hover:text-navy transition-colors" strokeWidth={1.8} />
                    </span>
                    <span className="text-sm font-medium text-navy">{p.label}</span>
                  </div>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

