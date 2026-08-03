"use client";

import Image from "next/image";

import { Building2, Users, Globe2, Briefcase } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCmsAsset } from "@/lib/cms-content";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/site/Reveal";
import { AnimatedNumber } from "@/components/site/AnimatedNumber";
const profileImg = "/assets/manpower.jpg";

export function CompanyProfile() {
  const managedProfileImg = useCmsAsset("about.profile", profileImg);
  const { t } = useTranslation();
  const pillars = [
    { icon: Building2, label: t("aboutPage.profile.pillars.civil"), field: "aboutPage.profile.pillars.civil" },
    { icon: Users, label: t("aboutPage.profile.pillars.manpower"), field: "aboutPage.profile.pillars.manpower" },
    { icon: Briefcase, label: t("aboutPage.profile.pillars.rental"), field: "aboutPage.profile.pillars.rental" },
    { icon: Globe2, label: t("aboutPage.profile.pillars.vision"), field: "aboutPage.profile.pillars.vision" },
  ];
  const statKeys = ["workforce", "hours", "turnover", "verticals"] as const;
  const stats = statKeys.map((key) => ({
    v: Number(t(`aboutPage.profile.stats.${key}.value`)) || 0,
    suffix: t(`aboutPage.profile.stats.${key}.suffix`),
    l: t(`aboutPage.profile.stats.${key}.label`),
    labelField: `aboutPage.profile.stats.${key}.label`,
    valueField: `aboutPage.profile.stats.${key}.value`,
  }));

  return (
    <section id="company-profile" className="relative py-16 lg:py-24 bg-sand-soft overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-navy/5 blur-[120px]" />
      <div className="container-wide relative">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          <Reveal className="lg:col-span-5">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
              <span className="h-px w-8 bg-gold" />
              <span data-cms-field="aboutPage.profile.eyebrow" suppressContentEditableWarning>{t("aboutPage.profile.eyebrow")}</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.05]">
              <span data-cms-field="aboutPage.profile.titleA" suppressContentEditableWarning>{t("aboutPage.profile.titleA")}</span><br />
              <span className="text-gold" data-cms-field="aboutPage.profile.titleB" suppressContentEditableWarning>{t("aboutPage.profile.titleB")}</span><br />
              <span data-cms-field="aboutPage.profile.titleC" suppressContentEditableWarning>{t("aboutPage.profile.titleC")}</span>
            </h2>

            <div className="mt-8 relative h-72 rounded-2xl overflow-hidden border border-border shadow-elegant group" data-cms-asset="about.profile">
              <Image
                src={managedProfileImg}
                alt="NOVARISE crew on site"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/85 via-navy/20 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between text-white">
                <div className="text-[10px] uppercase tracking-[0.3em] text-gold" data-cms-field="aboutPage.profile.imageEyebrow">{t("aboutPage.profile.imageEyebrow")}</div>
                <div className="inline-flex items-center gap-2 text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold anim-breathe" />
                  <span data-cms-field="aboutPage.profile.imageBadge" suppressContentEditableWarning>{t("aboutPage.profile.imageBadge")}</span>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal className="lg:col-span-7 lg:pt-4" delay={0.15}>
            <p className="lead-paragraph text-xl text-navy font-medium leading-relaxed" data-cms-field="aboutPage.profile.lead">
              {t("aboutPage.profile.lead")}
            </p>
            <p className="mt-5 text-base text-muted-foreground leading-relaxed">
              <span data-cms-field="aboutPage.profile.bodyStart" suppressContentEditableWarning>{t("aboutPage.profile.bodyStart")}</span>
              <span className="font-semibold text-navy" data-cms-field="aboutPage.profile.bodyClients" suppressContentEditableWarning>{t("aboutPage.profile.bodyClients")}</span>
              <span data-cms-field="aboutPage.profile.bodyEnd" suppressContentEditableWarning>{t("aboutPage.profile.bodyEnd")}</span>
            </p>

            <StaggerGroup className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-6">
              {stats.map((s) => (
                <StaggerItem key={s.l}>
                  <div className="text-2xl lg:text-3xl font-display font-extrabold text-navy tabular-nums">
                    <AnimatedNumber value={s.v} suffix={s.suffix} field={s.valueField} />
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-1.5" data-cms-field={s.labelField}>
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
                    <span className="text-sm font-medium text-navy" data-cms-field={p.field} suppressContentEditableWarning>{p.label}</span>
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
