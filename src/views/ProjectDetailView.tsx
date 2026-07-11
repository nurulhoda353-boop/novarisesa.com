"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  Coins,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Link } from "@/components/nav/AppLink";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/site/Reveal";
import { ContactForm } from "@/components/contact/ContactForm";
import { allProjects, type Project } from "@/lib/projects-data";
import { projectContent, projectFaq } from "@/lib/projects-content";

export function ProjectDetailView({ project }: { project: Project }) {
  const { t, i18n } = useTranslation();
  const k = project.key;
  const lang = (i18n.language?.startsWith("ar") ? "ar" : "en") as "en" | "ar";

  const content = projectContent[k];
  const faqs = projectFaq[lang];

  const currentIdx = allProjects.findIndex((p) => p.slug === project.slug);
  const nextProject = allProjects[(currentIdx + 1) % allProjects.length];
  const prevProject = allProjects[(currentIdx - 1 + allProjects.length) % allProjects.length];

  const stats = [
    { icon: Briefcase, label: t("projects.details.client"), value: t(`projects.items.${k}.client`) },
    { icon: MapPin, label: t("projects.details.location"), value: t(`projects.items.${k}.location`) },
    { icon: Coins, label: t("projects.details.value"), value: t(`projects.items.${k}.value`) },
    { icon: Calendar, label: t("projects.details.duration"), value: t(`projects.items.${k}.duration`) },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 dark-premium text-white overflow-hidden">
          <div className="absolute inset-0 opacity-25">
            <Image src={project.img} alt="" fill priority sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-navy-deep/70 via-navy-deep/90 to-navy-deep" />
          </div>
          <div className="container-wide relative">
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-gold transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("projects.back")}
            </Link>

            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="rounded-full bg-gold px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-navy">
                  {t(`projects.items.${k}.sector`)}
                </span>
                {project.featured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white">
                    <Sparkles className="h-3 w-3 text-gold" /> {t("projects.featured")}
                  </span>
                )}
                <span className="text-[11px] uppercase tracking-[0.3em] text-white/50 font-mono" dir="ltr">
                  #{String(project.rank).padStart(2, "0")} · {t("projects.rankLabel")}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] mb-8">
                {t(`projects.items.${k}.title`)}
              </h1>
              <p className="text-lg md:text-xl text-white/70 leading-relaxed max-w-3xl">
                {t(`projects.items.${k}.scope`)}
              </p>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 gold-divider" />
        </section>

        {/* Cover image */}
        <section className="relative bg-white">
          <div className="container-wide px-4 sm:px-6 lg:px-8 -mt-12 lg:-mt-20 relative z-10">
            <div className="relative rounded-3xl overflow-hidden shadow-elegant aspect-[16/9] lg:aspect-[21/9]">
              <Image src={project.img} alt={t(`projects.items.${k}.title`)} fill sizes="(max-width: 1024px) 100vw, 1200px" className="object-cover" />
            </div>
          </div>
        </section>

        {/* Stats grid */}
        <section className="py-14 lg:py-20 bg-white">
          <div className="container-wide">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 h-full hover:border-gold/40 hover:shadow-card transition-all"
                >
                  <s.icon className="h-6 w-6 text-gold mb-4" />
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">{s.label}</div>
                  <div className="text-lg font-bold text-navy leading-tight">{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Overview + Highlights */}
        <section className="py-16 lg:py-24 section-bright">
          <div className="container-wide">
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-14">
              <Reveal className="lg:col-span-7">
                <div className="inline-flex items-center gap-3 mb-5">
                  <span className="h-px w-8 bg-gold" />
                  <span className="text-[11px] uppercase tracking-[0.3em] text-gold font-semibold">
                    {t("projects.overview")}
                  </span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-navy leading-tight mb-6">
                  {t(`projects.items.${k}.title`)}
                </h2>
                <div className="space-y-5 text-base md:text-lg text-muted-foreground leading-relaxed">
                  {content?.long[lang].map((p, i) => <p key={i}>{p}</p>) ?? (
                    <p>{t(`projects.items.${k}.scope`)}</p>
                  )}
                </div>
              </Reveal>

              <Reveal className="lg:col-span-5">
                <div className="rounded-3xl bg-navy text-white p-8 lg:p-10 shadow-elegant relative overflow-hidden">
                  <div className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-gold/15 blur-3xl" />
                  <div className="relative">
                    <div className="inline-flex items-center gap-3 mb-4">
                      <span className="h-px w-8 bg-gold" />
                      <span className="text-[11px] uppercase tracking-[0.3em] text-gold font-semibold">
                        {t("projects.highlightsEyebrow")}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold mb-6">{t("projects.highlightsTitle")}</h3>
                    <ul className="space-y-3.5">
                      {(content?.highlights[lang] ?? []).map((h, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          </span>
                          <span className="text-sm text-white/85 leading-relaxed">{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="relative py-16 lg:py-24 dark-premium text-white overflow-hidden">
          <div className="absolute inset-x-0 top-0 gold-divider" />
          <div className="container-wide max-w-4xl relative">
            <Reveal>
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-3 mb-3">
                  <span className="h-px w-8 bg-gold" />
                  <span className="text-[11px] uppercase tracking-[0.3em] text-gold font-semibold">
                    {t("projects.faqEyebrow")}
                  </span>
                  <span className="h-px w-8 bg-gold" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                  {t("projects.faqTitle")}
                </h2>
              </div>
            </Reveal>
            <FaqList items={faqs} />
          </div>
          <div className="absolute inset-x-0 bottom-0 gold-divider" />
        </section>

        {/* Contact form */}
        <section className="py-16 lg:py-24 section-bright">
          <div className="container-wide">
            <Reveal>
              <div className="text-center max-w-2xl mx-auto mb-10">
                <div className="inline-flex items-center gap-3 mb-3">
                  <span className="h-px w-8 bg-gold" />
                  <span className="text-[11px] uppercase tracking-[0.3em] text-gold font-semibold">
                    {t("projects.contactEyebrow")}
                  </span>
                  <span className="h-px w-8 bg-gold" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-navy leading-tight">
                  {t("projects.contactTitle")}
                </h2>
              </div>
            </Reveal>
            <div className="max-w-3xl mx-auto">
              <ContactForm />
            </div>
          </div>
        </section>

        {/* Prev / Next */}
        <section className="py-14 bg-muted/30 border-t border-border">
          <div className="container-wide">
            <div className="grid md:grid-cols-2 gap-5">
              <Link
                to="/projects/$slug"
                params={{ slug: prevProject.slug }}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 hover:border-gold/50 hover:shadow-card transition-all"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-navy group-hover:bg-gold group-hover:text-navy transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                    {t("common.previous", "Previous")}
                  </span>
                  <span className="block truncate text-base font-display font-bold text-navy group-hover:text-gold transition-colors">
                    {t(`projects.items.${prevProject.key}.title`)}
                  </span>
                </span>
              </Link>

              <Link
                to="/projects/$slug"
                params={{ slug: nextProject.slug }}
                className="group flex items-center justify-end gap-4 rounded-2xl border border-border bg-card p-5 text-right hover:border-gold/50 hover:shadow-card transition-all"
              >
                <span className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                    {t("common.next", "Next")}
                  </span>
                  <span className="block truncate text-base font-display font-bold text-navy group-hover:text-gold transition-colors">
                    {t(`projects.items.${nextProject.key}.title`)}
                  </span>
                </span>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-navy group-hover:bg-gold group-hover:text-navy transition-colors">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function FaqList({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-3">
      {items.map((f, i) => {
        const isOpen = open === i;
        return (
          <div
            key={f.q}
            className={`rounded-2xl border transition-all duration-500 ${
              isOpen ? "border-gold bg-white/[0.05]" : "border-white/10 hover:border-white/25"
            }`}
          >
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-6 px-6 py-5 text-left"
            >
              <span className="text-base font-display font-bold text-white leading-snug">{f.q}</span>
              <span
                className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-400 ${
                  isOpen ? "bg-gold text-navy rotate-180" : "bg-white/10 text-white/60"
                }`}
              >
                <ChevronDown className="h-4 w-4" strokeWidth={2.4} />
              </span>
            </button>
            <div
              className={`grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-6 pb-6 text-[14px] text-white/70 leading-relaxed">{f.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
