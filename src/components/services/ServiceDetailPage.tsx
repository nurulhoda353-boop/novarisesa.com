"use client";

import Image from "next/image";
import { Link } from "@/components/nav/AppLink";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Award,
  Phone,
  ArrowRight,
} from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/site/Reveal";
import { AnimatedNumber } from "@/components/site/AnimatedNumber";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CTA } from "@/components/site/CTA";
import { servicePages, type ServicePage } from "@/lib/services-data";
import { useTranslatedService, useServiceTitle } from "@/i18n/use-translated-service";

type Props = { service: ServicePage };

export function ServiceDetailPage({ service }: Props) {
  const translated = useTranslatedService(service.slug) ?? service;
  const relatedBase = servicePages.filter((s) => s.slug !== service.slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero service={translated} />
        <Overview service={translated} />
        <SubServices service={translated} />
        <Capabilities service={translated} />
        <Projects service={translated} />
        <Process service={translated} />
        <Certifications service={translated} />
        <Faqs service={translated} />
        <Related related={relatedBase} />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

/* ───────────────────────── HERO ───────────────────────── */
function Hero({ service }: Props) {
  const Icon = service.icon;
  const { t } = useTranslation();
  return (
    <section className="relative min-h-[80vh] lg:min-h-[88vh] flex items-end overflow-hidden dark-premium text-white">
      <div className="absolute inset-0">
        <Image
          src={service.heroImage}
          alt={`${service.title} — NOVARISE`}
          fill
          priority
          sizes="100vw"
          className="object-cover scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/85 to-navy-deep/45" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-deep/70 via-transparent to-transparent" />
      </div>

      <div className="pointer-events-none absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full bg-gold/15 blur-[140px] anim-breathe" />

      <div className="container-wide relative pt-40 pb-20 lg:pb-28">
        <div className="grid lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-8">
            <Reveal>
              <nav className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/60 mb-7">
                <Link to="/" className="hover:text-gold transition-colors">{t("servicesPage.detail.home")}</Link>
                <span className="text-white/30">/</span>
                <Link to="/services" className="hover:text-gold transition-colors">{t("servicesPage.detail.services")}</Link>
                <span className="text-white/30">/</span>
                <span className="text-gold">{service.title}</span>
              </nav>

              <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 backdrop-blur-md pl-2 pr-4 py-1.5 mb-7">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold text-navy">
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
                <span className="text-[10px] font-mono text-gold tracking-[0.25em]">{service.num}</span>
                <span className="h-1 w-1 rounded-full bg-gold" />
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/80">{service.eyebrow}</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-[64px] font-bold tracking-tight leading-[1.02] text-white max-w-4xl">
                {service.title}
              </h1>
              <p className="mt-6 text-base md:text-lg text-white/75 font-light leading-relaxed max-w-2xl">
                {service.lead}
              </p>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  to="/rfq"
                  className="group inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-gold-foreground shadow-gold transition-all hover:scale-[1.03]"
                >
                  {t("servicesPage.detail.requestQuote")}
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:rotate-45" />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 backdrop-blur-md px-7 py-3.5 text-sm font-semibold text-white hover:bg-white hover:text-navy transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  {t("servicesPage.detail.speakSales")}
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal className="lg:col-span-4" delay={0.25}>
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 shadow-elegant">
              <div className="absolute -top-3 left-6 inline-flex items-center gap-2 rounded-full bg-gold px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-navy anim-breathe" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-navy">{t("servicesPage.detail.liveCapability")}</span>
              </div>
              <div className="grid grid-cols-2 gap-5 mt-3">
                {service.stats.map((s) => (
                  <div key={s.label}>
                    <div className="text-2xl lg:text-3xl font-display font-extrabold text-white tabular-nums">
                      <AnimatedNumber value={s.value} suffix={s.suffix} decimals={Number.isInteger(s.value) ? 0 : 1} />
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/55 mt-1.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 gold-divider" />
    </section>
  );
}

/* ───────────────────────── OVERVIEW ───────────────────────── */
function Overview({ service }: Props) {
  const Icon = service.icon;
  const { t } = useTranslation();
  const checklist = t("servicesPage.detail.checklist", { returnObjects: true }) as string[];
  return (
    <section className="relative py-20 lg:py-28 bg-white overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -right-32 h-[420px] w-[420px] rounded-full bg-gold/8 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full bg-navy/5 blur-[140px]" />
      <div className="container-wide relative">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <Reveal className="lg:col-span-5">
            <div className="relative p-4 lg:p-5">
              <div className="absolute top-0 left-0 h-full w-full rounded-2xl border border-gold/30" />
              <div className="absolute bottom-0 right-0 h-24 w-24 rounded-2xl bg-gold/15 blur-xl" />

              <div className="relative h-[440px] lg:h-[520px] rounded-2xl overflow-hidden border border-border shadow-elegant group">
                <Image
                  src={service.heroImage}
                  alt={`${service.title} — Overview`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/85 via-navy-deep/20 to-transparent" />

                <div className="absolute top-5 left-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-3 py-1.5">
                  <span className="text-[10px] font-mono text-gold tracking-[0.25em]">{service.num}</span>
                  <span className="h-1 w-1 rounded-full bg-gold" />
                  <span className="text-[10px] uppercase tracking-[0.3em] text-white/85">{t("servicesPage.detail.overviewBadge")}</span>
                </div>

                <div className="absolute top-5 right-5 h-12 w-12 rounded-xl bg-gold flex items-center justify-center shadow-gold">
                  <Icon className="h-5 w-5 text-navy" strokeWidth={1.8} />
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-gold mb-2">{t("servicesPage.detail.onsiteCap")}</div>
                  <div className="text-white font-display font-bold text-lg lg:text-xl leading-snug drop-shadow-md">
                    {service.title}
                  </div>
                  <div className="mt-3 h-px w-16 bg-gold" />
                </div>
              </div>

              {service.stats?.[0] && (
                <div className="hidden md:flex absolute -bottom-6 -right-6 lg:-right-10 z-10 items-center gap-3 rounded-2xl bg-card border border-border shadow-elegant px-5 py-4">
                  <span className="h-10 w-10 rounded-xl bg-gold/15 flex items-center justify-center">
                    <Award className="h-5 w-5 text-gold" strokeWidth={1.8} />
                  </span>
                  <div>
                    <div className="text-xl font-display font-extrabold text-navy tabular-nums leading-none">
                      <AnimatedNumber value={service.stats[0].value} suffix={service.stats[0].suffix} />
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-1">
                      {service.stats[0].label}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Reveal>

          <Reveal className="lg:col-span-7" delay={0.15}>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold mb-5">
              <span className="h-px w-8 bg-gold" />
              {t("servicesPage.detail.overviewBadge")}
            </div>

            <h2 className="text-2xl md:text-[26px] lg:text-[30px] font-semibold tracking-tight text-navy leading-[1.2]">
              {service.lead}
            </h2>

            <div className="mt-5 h-px w-20 bg-gradient-to-r from-gold to-transparent" />

            <p className="mt-6 text-lg lg:text-[19px] text-muted-foreground leading-[1.8]">
              {service.intro}
            </p>

            <div className="mt-8 grid sm:grid-cols-2 gap-3">
              {(Array.isArray(checklist) ? checklist : []).map((item) => (
                <div
                  key={item}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 hover:border-gold/60 hover:shadow-card transition-all duration-500"
                >
                  <span className="h-7 w-7 shrink-0 rounded-lg bg-gold/15 group-hover:bg-gold flex items-center justify-center transition-colors duration-500">
                    <Check className="h-3.5 w-3.5 text-gold group-hover:text-navy transition-colors" strokeWidth={2.6} />
                  </span>
                  <span className="text-sm font-medium text-navy">{item}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── SUB SERVICES ───────────────────────── */
function SubServices({ service }: Props) {
  const { t } = useTranslation();
  return (
    <section className="relative py-16 lg:py-24 bg-sand-soft overflow-hidden">
      <div className="container-wide relative">
        <Reveal className="max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
            <span className="h-px w-8 bg-gold" />
            {t("servicesPage.detail.whatWeDo")}
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.1]">
            {t("servicesPage.detail.insideScopePre")} {service.title.toLowerCase()} <span className="text-muted-foreground">{t("servicesPage.detail.insideScopePost")}</span>
          </h2>
        </Reveal>

        <StaggerGroup className="grid md:grid-cols-2 lg:grid-cols-3 gap-5" stagger={0.06}>
          {service.subServices.map((s) => (
            <StaggerItem key={s.title}>
              <article className="group relative h-full bg-card border border-border rounded-2xl p-6 hover:border-gold hover:shadow-card hover:-translate-y-1 transition-all duration-500">
                <div className="flex items-start justify-between mb-5">
                  <div className="h-12 w-12 rounded-xl bg-gold/12 group-hover:bg-gold flex items-center justify-center transition-all duration-500 group-hover:rotate-[-6deg]">
                    <s.icon className="h-5 w-5 text-gold group-hover:text-navy transition-colors" strokeWidth={1.7} />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-gold group-hover:rotate-45 transition-all duration-500" />
                </div>
                <h3 className="text-[17px] font-display font-bold text-navy leading-snug">{s.title}</h3>
                <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">{s.desc}</p>
              </article>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

/* ───────────────────────── CAPABILITIES TABLE ───────────────────────── */
function Capabilities({ service }: Props) {
  const { t } = useTranslation();
  return (
    <section className="relative py-16 lg:py-24 dark-premium text-white overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-32 h-[400px] w-[400px] rounded-full bg-gold/10 blur-[140px] anim-drift" />
      <div className="container-wide relative">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          <Reveal className="lg:col-span-5">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
              <span className="h-px w-8 bg-gold" />
              {t("servicesPage.detail.capSnapshot")}
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-[42px] font-bold tracking-tight leading-[1.05] text-white">
              {service.capabilities.heading}
            </h2>
            <p className="mt-5 text-white/65 leading-relaxed">
              {t("servicesPage.detail.capIntroPre")} {service.title.toLowerCase()} {t("servicesPage.detail.capIntroPost")}
            </p>

            <Link
              to="/rfq"
              className="group mt-8 inline-flex items-center gap-2 text-sm font-semibold text-gold hover:text-white transition-colors"
            >
              {t("servicesPage.detail.capCta")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>

          <Reveal className="lg:col-span-7" delay={0.1}>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden divide-y divide-white/8">
              {service.capabilities.rows.map((row) => (
                <div
                  key={row.label}
                  className="group flex items-center justify-between gap-6 px-6 py-5 hover:bg-white/[0.04] transition-colors"
                >
                  <span className="text-sm uppercase tracking-[0.18em] text-white/55">{row.label}</span>
                  <span className="text-base lg:text-lg font-display font-bold text-white text-right">{row.value}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── PROJECTS ───────────────────────── */
function Projects({ service }: Props) {
  const { t } = useTranslation();
  return (
    <section className="relative py-16 lg:py-24 bg-white overflow-hidden">
      <div className="container-wide relative">
        <Reveal className="max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
            <span className="h-px w-8 bg-gold" />
            {t("servicesPage.detail.refProjects")}
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.1]">
            {t("servicesPage.detail.recentPre")} {service.title.toLowerCase()} <span className="text-muted-foreground">{t("servicesPage.detail.recentPost")}</span>
          </h2>
        </Reveal>

        <StaggerGroup className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" stagger={0.08}>
          {service.projects.map((p) => (
            <StaggerItem key={p.name}>
              <article className="group relative h-full rounded-2xl overflow-hidden border border-border bg-card shadow-card hover:shadow-elegant hover:-translate-y-1.5 transition-all duration-700">
                <div className="relative h-56 overflow-hidden">
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-[1400ms] group-hover:scale-[1.08]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/85 via-navy/30 to-transparent" />
                  <div className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-3 py-1.5">
                    <span className="text-[10px] font-mono text-gold tracking-[0.2em]">{p.year}</span>
                    <span className="h-1 w-1 rounded-full bg-gold" />
                    <span className="text-[10px] uppercase tracking-[0.25em] text-white/80">{t("servicesPage.detail.delivered")}</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-display font-bold text-navy leading-snug">{p.name}</h3>
                  <div className="mt-2 text-[11px] uppercase tracking-[0.22em] text-gold">{p.client}</div>
                  <p className="mt-3 text-[13px] text-muted-foreground leading-relaxed">{p.scope}</p>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

/* ───────────────────────── PROCESS ───────────────────────── */
function Process({ service }: Props) {
  const { t } = useTranslation();
  return (
    <section className="relative py-16 lg:py-24 bg-sand-soft overflow-hidden">
      <div className="container-wide relative">
        <Reveal className="max-w-2xl mb-14">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
            <span className="h-px w-8 bg-gold" />
            {t("servicesPage.detail.howEngage")}
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.1]">
            {t("servicesPage.detail.fromInquiry")} <span className="text-muted-foreground">{t("servicesPage.detail.noHandoffs")}</span>
          </h2>
        </Reveal>

        <div className="relative">
          <div className="hidden lg:block absolute top-9 left-[8%] right-[8%] h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
          <StaggerGroup className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8" stagger={0.08}>
            {service.process.map((step) => (
              <StaggerItem key={step.num}>
                <div className="relative">
                  <div className="relative z-10 flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-card border border-border shadow-card">
                    <span className="text-2xl font-display font-extrabold text-gold tabular-nums">{step.num}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-display font-bold text-navy">{step.title}</h3>
                  <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── CERTIFICATIONS ───────────────────────── */
function Certifications({ service }: Props) {
  const { t } = useTranslation();
  return (
    <section className="relative py-16 lg:py-20 bg-white overflow-hidden border-t border-border">
      <div className="container-wide relative">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <Reveal className="lg:col-span-4">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
              <span className="h-px w-8 bg-gold" />
              {t("servicesPage.detail.standards")}
            </div>
            <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-navy leading-[1.1]">
              {t("servicesPage.detail.precleared")}
            </h3>
          </Reveal>
          <Reveal className="lg:col-span-8" delay={0.1}>
            <StaggerGroup className="grid grid-cols-2 md:grid-cols-3 gap-3" stagger={0.05}>
              {service.certifications.map((c) => (
                <StaggerItem key={c}>
                  <div className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 hover:border-gold hover:shadow-card transition-all duration-500">
                    <span className="h-9 w-9 shrink-0 rounded-lg bg-gold/12 group-hover:bg-gold flex items-center justify-center transition-colors">
                      <Award className="h-4 w-4 text-gold group-hover:text-navy transition-colors" strokeWidth={1.8} />
                    </span>
                    <span className="text-[13px] font-semibold text-navy leading-tight">{c}</span>
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

/* ───────────────────────── FAQs ───────────────────────── */
function Faqs({ service }: Props) {
  const [open, setOpen] = useState<number | null>(0);
  const { t } = useTranslation();
  return (
    <section className="relative py-16 lg:py-24 bg-sand-soft overflow-hidden">
      <div className="container-wide relative">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          <Reveal className="lg:col-span-4">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
              <span className="h-px w-8 bg-gold" />
              {t("servicesPage.detail.faqEyebrow")}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-navy leading-[1.1]">
              {t("servicesPage.detail.faqTitleA")} <span className="text-muted-foreground">{t("servicesPage.detail.faqTitleB")}</span>
            </h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              {t("servicesPage.detail.faqDesc")}
            </p>
            <Link
              to="/contact"
              className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-gold transition-colors"
            >
              {t("servicesPage.detail.askQuestion")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>

          <Reveal className="lg:col-span-8" delay={0.1}>
            <div className="space-y-3">
              {service.faqs.map((f, i) => {
                const isOpen = open === i;
                return (
                  <div
                    key={f.q}
                    className={`rounded-2xl border bg-card transition-all duration-500 ${
                      isOpen ? "border-gold shadow-card" : "border-border hover:border-navy/20"
                    }`}
                  >
                    <button
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="w-full flex items-center justify-between gap-6 px-6 py-5 text-left"
                    >
                      <span className="text-base font-display font-bold text-navy leading-snug">{f.q}</span>
                      <span className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-400 ${
                        isOpen ? "bg-gold text-navy rotate-180" : "bg-muted text-navy/60"
                      }`}>
                        <ChevronDown className="h-4 w-4" strokeWidth={2.4} />
                      </span>
                    </button>
                    <div
                      className={`grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="px-6 pb-6 text-[14px] text-muted-foreground leading-relaxed">{f.a}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── RELATED ───────────────────────── */
function Related({ related }: { related: ServicePage[] }) {
  const { t } = useTranslation();
  const tTitle = useServiceTitle();
  return (
    <section className="relative py-16 lg:py-24 bg-white overflow-hidden border-t border-border">
      <div className="container-wide relative">
        <Reveal className="max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
            <span className="h-px w-8 bg-gold" />
            {t("servicesPage.detail.relatedEyebrow")}
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.1]">
            {t("servicesPage.detail.relatedTitleA")} <span className="text-muted-foreground">{t("servicesPage.detail.relatedTitleB")}</span>
          </h2>
        </Reveal>

        <StaggerGroup className="grid md:grid-cols-3 gap-5" stagger={0.07}>
          {related.map((r) => {
            const Icon = r.icon;
            const title = tTitle(r.slug, r.title);
            return (
              <StaggerItem key={r.slug}>
                <Link
                  to="/services/$slug"
                  params={{ slug: r.slug }}
                  className="group block h-full rounded-2xl overflow-hidden border border-border bg-card shadow-card hover:shadow-elegant hover:-translate-y-1.5 hover:border-gold/60 transition-all duration-700"
                >
                  <div className="relative h-44 overflow-hidden">
                    <Image
                      src={r.heroImage}
                      alt={title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-[1400ms] group-hover:scale-[1.08]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/85 via-navy/30 to-transparent" />
                    <div className="absolute top-4 right-4 h-10 w-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:bg-gold group-hover:border-gold transition-all duration-500">
                      <Icon className="h-4 w-4 text-gold group-hover:text-navy transition-colors" strokeWidth={1.8} />
                    </div>
                  </div>
                  <div className="p-6 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-gold tracking-[0.25em] mb-1.5">{r.num}</div>
                      <h3 className="text-lg font-display font-bold text-navy leading-snug">{title}</h3>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-gold-foreground transition-transform duration-500 group-hover:rotate-45">
                      <ArrowUpRight className="h-4 w-4" strokeWidth={2.2} />
                    </span>
                  </div>
                </Link>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </div>
    </section>
  );
}
