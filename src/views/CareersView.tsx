"use client";

import { useTranslation } from "react-i18next";
import {
  Briefcase,
  HardHat,
  ShieldCheck,
  GraduationCap,
  TrendingUp,
  Heart,
  Globe,
  Users,
  MapPin,
  Clock,
  ArrowUpRight,
  Mail,
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { PageHero } from "@/components/site/PageHero";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/site/Reveal";
import { CTA } from "@/components/site/CTA";

const heroImage = "/assets/manpower.jpg";

const APPLY_EMAIL = "ceo@novarisebd.com";

const benefits = [
  { icon: ShieldCheck, key: "safety" },
  { icon: GraduationCap, key: "training" },
  { icon: TrendingUp, key: "growth" },
  { icon: Heart, key: "welfare" },
  { icon: Globe, key: "scale" },
  { icon: Users, key: "team" },
];

const openings = [
  { id: "site-engineer", icon: HardHat },
  { id: "qaqc-inspector", icon: ShieldCheck },
  { id: "scaffolder", icon: HardHat },
  { id: "electrician", icon: HardHat },
  { id: "hse-officer", icon: ShieldCheck },
  { id: "project-manager", icon: Briefcase },
];

export function CareersView() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <PageHero
          num="07"
          eyebrow={t("careersPage.hero.eyebrow")}
          title={t("careersPage.hero.title")}
          description={t("careersPage.hero.description")}
          icon={Briefcase}
          heroImage={heroImage}
          crumbs={[{ label: t("careersPage.hero.crumb") }]}
          ctas={[
            {
              label: t("careersPage.hero.ctaApply"),
              href: `mailto:${APPLY_EMAIL}?subject=${encodeURIComponent("Career Application — NOVARISE")}`,
            },
            {
              label: t("careersPage.hero.ctaOpenings"),
              href: "#openings",
              variant: "ghost",
            },
          ]}
        />

        {/* Why work with us */}
        <section className="relative py-16 lg:py-24 bg-white overflow-hidden">
          <div className="pointer-events-none absolute -top-40 -right-40 h-[480px] w-[480px] rounded-full bg-gold/10 blur-[140px] anim-breathe" />
          <div className="container-wide relative">
            <Reveal className="text-center max-w-2xl mx-auto mb-14">
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
                <span className="h-px w-8 bg-gold" />
                {t("careersPage.why.eyebrow")}
                <span className="h-px w-8 bg-gold" />
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.1]">
                {t("careersPage.why.titleA")}
                <br />
                <span className="text-muted-foreground">{t("careersPage.why.titleB")}</span>
              </h2>
              <p className="mt-6 text-base text-muted-foreground leading-relaxed">
                {t("careersPage.why.lead")}
              </p>
            </Reveal>

            <StaggerGroup
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6"
              stagger={0.06}
            >
              {benefits.map((b, i) => (
                <StaggerItem key={b.key}>
                  <article className="group relative h-full bg-card border border-border rounded-2xl p-6 lg:p-7 shadow-card hover:shadow-elegant hover:-translate-y-1 hover:border-gold transition-all duration-500 overflow-hidden">
                    <span className="absolute top-0 left-0 h-1 w-0 group-hover:w-full bg-gold transition-all duration-700" />
                    <span className="absolute top-4 right-5 text-[10px] font-mono tracking-[0.2em] text-muted-foreground/50">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="h-11 w-11 rounded-xl bg-gold/10 group-hover:bg-gold flex items-center justify-center mb-5 transition-all duration-500 group-hover:rotate-[-6deg]">
                      <b.icon
                        className="h-5 w-5 text-gold group-hover:text-navy transition-colors"
                        strokeWidth={1.6}
                      />
                    </div>
                    <h3 className="text-base lg:text-lg font-display font-bold text-navy mb-2 leading-tight">
                      {t(`careersPage.benefits.${b.key}.title`)}
                    </h3>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      {t(`careersPage.benefits.${b.key}.desc`)}
                    </p>
                  </article>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </section>

        {/* Openings */}
        <section
          id="openings"
          className="relative py-16 lg:py-24 dark-premium text-white overflow-hidden"
        >
          <div className="absolute inset-x-0 top-0 gold-divider" />
          <div className="container-wide relative">
            <Reveal className="max-w-2xl mb-12">
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
                <span className="h-px w-8 bg-gold" />
                {t("careersPage.openings.eyebrow")}
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] text-white">
                {t("careersPage.openings.titleA")}{" "}
                <span className="text-gradient-gold">{t("careersPage.openings.titleB")}</span>
              </h2>
              <p className="mt-5 text-white/70 leading-relaxed">
                {t("careersPage.openings.lead")}
              </p>
            </Reveal>

            <StaggerGroup className="grid md:grid-cols-2 gap-5" stagger={0.05}>
              {openings.map((o) => {
                const subject = encodeURIComponent(
                  `Application — ${t(`careersPage.roles.${o.id}.title`)}`,
                );
                return (
                  <StaggerItem key={o.id}>
                    <article className="group relative h-full bg-navy/40 border border-white/10 rounded-2xl p-6 lg:p-7 hover:border-gold/60 hover:bg-navy/60 transition-all duration-500">
                      <div className="flex items-start gap-4">
                        <div className="h-11 w-11 shrink-0 rounded-xl bg-gold/15 group-hover:bg-gold flex items-center justify-center transition-all duration-500">
                          <o.icon
                            className="h-5 w-5 text-gold group-hover:text-navy transition-colors"
                            strokeWidth={1.6}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg lg:text-xl font-display font-bold text-white leading-tight">
                            {t(`careersPage.roles.${o.id}.title`)}
                          </h3>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] uppercase tracking-[0.2em] text-white/55">
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 text-gold" />
                              {t(`careersPage.roles.${o.id}.location`)}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="h-3 w-3 text-gold" />
                              {t(`careersPage.roles.${o.id}.type`)}
                            </span>
                          </div>
                          <p className="mt-4 text-[13.5px] text-white/70 leading-relaxed">
                            {t(`careersPage.roles.${o.id}.desc`)}
                          </p>
                          <a
                            href={`mailto:${APPLY_EMAIL}?subject=${subject}`}
                            className="group/btn mt-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold hover:text-white transition-colors"
                          >
                            <span>{t("careersPage.openings.apply")}</span>
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold text-navy transition-transform duration-300 group-hover/btn:translate-x-0.5 group-hover/btn:rotate-45">
                              <ArrowUpRight className="h-3 w-3" strokeWidth={2.4} />
                            </span>
                          </a>
                        </div>
                      </div>
                    </article>
                  </StaggerItem>
                );
              })}
            </StaggerGroup>

            <Reveal delay={0.1} className="mt-12">
              <div className="rounded-2xl border border-gold/30 bg-gold/5 p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.3em] text-gold mb-2">
                    {t("careersPage.spontaneous.eyebrow")}
                  </div>
                  <h3 className="text-xl lg:text-2xl font-display font-bold text-white leading-tight">
                    {t("careersPage.spontaneous.title")}
                  </h3>
                  <p className="mt-2 text-sm text-white/70 max-w-xl leading-relaxed">
                    {t("careersPage.spontaneous.desc")}
                  </p>
                </div>
                <a
                  href={`mailto:${APPLY_EMAIL}?subject=${encodeURIComponent("Spontaneous Application — NOVARISE Careers")}`}
                  className="group inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-navy shadow-gold transition-all hover:scale-[1.03] shrink-0"
                >
                  <Mail className="h-4 w-4" />
                  {t("careersPage.spontaneous.cta")}
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:rotate-45" />
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        <CTA />
      </main>
      <Footer />
    </div>
  );
}
