"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { ArrowRight, Sparkles, MapPin, Coins, Clock } from "lucide-react";
import { Link } from "@/components/nav/AppLink";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { AnimatedHeading } from "@/components/site/AnimatedHeading";
import { TiltCard } from "@/components/site/TiltCard";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/site/Reveal";
import { allProjects } from "@/lib/projects-data";

export function ProjectsView() {
  const { t } = useTranslation();
  const featured = allProjects.filter((p) => p.featured);
  const rest = allProjects.filter((p) => !p.featured);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-16 lg:pt-40 lg:pb-24 dark-premium text-white overflow-hidden">
          <div className="container-wide relative">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-3 mb-6">
                <span className="h-px w-8 bg-gold" />
                <span className="text-[11px] uppercase tracking-[0.3em] text-gold">
                  {t("projects.eyebrow")}
                </span>
              </div>
              <AnimatedHeading
                as="h1"
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]"
                trigger="mount"
                lines={[
                  t("projects.title.l1"),
                  { text: t("projects.title.l2"), className: "text-white/50" },
                ]}
              />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 gold-divider" />
        </section>

        {/* Featured — 4 large cards in 2-col grid */}
        <section className="relative py-16 lg:py-24 bg-white">
          <div className="container-wide">
            <Reveal>
              <div className="flex items-end justify-between gap-6 mb-10 lg:mb-14">
                <div>
                  <div className="inline-flex items-center gap-3 mb-3">
                    <span className="h-px w-8 bg-gold" />
                    <span className="text-[11px] uppercase tracking-[0.3em] text-gold font-semibold">
                      {t("projects.featuredLabel")}
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-navy leading-tight">
                    {t("projects.featuredLabel")}
                  </h2>
                </div>
                <div className="hidden md:block text-xs font-mono text-muted-foreground" dir="ltr">
                  01 — {String(featured.length).padStart(2, "0")}
                </div>
              </div>
            </Reveal>

            <StaggerGroup className="grid md:grid-cols-2 gap-7 lg:gap-9">
              {featured.map((p, idx) => (
                <StaggerItem key={p.key}>
                  <TiltCard intensity={4} className="rounded-3xl h-full">
                    <Link
                      to="/projects/$slug"
                      params={{ slug: p.slug }}
                      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-card transition-shadow duration-500 hover:shadow-elegant"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <Image
                          src={p.img}
                          alt={t(`projects.items.${p.key}.title`)}
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-cover transition-transform duration-[1200ms] group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/20 to-transparent" />
                        <div className="absolute top-5 left-5 flex flex-col gap-2 items-start">
                          <span className="rounded-full bg-gold px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-navy shadow-gold">
                            {t(`projects.items.${p.key}.sector`)}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                            <Sparkles className="h-3 w-3 text-gold" /> {t("projects.featured")}
                          </span>
                        </div>
                        <div
                          className="absolute top-5 right-5 font-mono text-xs text-white/90 bg-navy/60 backdrop-blur px-2.5 py-1 rounded-full"
                          dir="ltr"
                        >
                          #{String(idx + 1).padStart(2, "0")}
                        </div>
                        <div className="absolute bottom-0 inset-x-0 p-6 lg:p-7">
                          <h3 className="text-xl lg:text-2xl font-bold text-white leading-tight mb-2 group-hover:text-gold transition-colors">
                            {t(`projects.items.${p.key}.title`)}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-white/80">
                            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3 w-3 text-gold" />{t(`projects.items.${p.key}.location`)}</span>
                            <span className="inline-flex items-center gap-1.5"><Coins className="h-3 w-3 text-gold" />{t(`projects.items.${p.key}.value`)}</span>
                            <span className="inline-flex items-center gap-1.5"><Clock className="h-3 w-3 text-gold" />{t(`projects.items.${p.key}.duration`)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col flex-1 p-6 lg:p-8">
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-5">
                          {t(`projects.items.${p.key}.scope`)}
                        </p>
                        <div className="mt-auto flex items-center justify-between pt-5 border-t border-border">
                          <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                            {t(`projects.items.${p.key}.client`)}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy group-hover:text-gold transition-colors">
                            {t("projects.viewDetails")}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </TiltCard>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </section>

        {/* Rest — 6 compact cards in 3-col grid */}
        <section className="relative py-16 lg:py-24 section-bright">
          <div className="container-wide">
            <Reveal>
              <div className="flex items-end justify-between gap-6 mb-10 lg:mb-14">
                <div>
                  <div className="inline-flex items-center gap-3 mb-3">
                    <span className="h-px w-8 bg-gold" />
                    <span className="text-[11px] uppercase tracking-[0.3em] text-gold font-semibold">
                      {t("projects.moreLabel")}
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-navy leading-tight">
                    {t("projects.moreLabel")}
                  </h2>
                </div>
                <div className="hidden md:block text-xs font-mono text-muted-foreground" dir="ltr">
                  {String(featured.length + 1).padStart(2, "0")} — {String(allProjects.length).padStart(2, "0")}
                </div>
              </div>
            </Reveal>

            <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
              {rest.map((p, idx) => (
                <StaggerItem key={p.key}>
                  <Link
                    to="/projects/$slug"
                    params={{ slug: p.slug }}
                    className="group block h-full overflow-hidden rounded-2xl border border-border bg-card shadow-card hover:shadow-elegant transition-all duration-500 hover:-translate-y-1"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <Image
                        src={p.img}
                        alt={t(`projects.items.${p.key}.title`)}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-[1000ms] group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-transparent to-transparent" />
                      <span className="absolute top-3 left-3 rounded-full bg-gold/95 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-navy">
                        {t(`projects.items.${p.key}.sector`)}
                      </span>
                      <span
                        className="absolute top-3 right-3 font-mono text-[10px] text-white/90 bg-navy/60 backdrop-blur px-2 py-0.5 rounded-full"
                        dir="ltr"
                      >
                        #{String(featured.length + idx + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="text-base font-bold text-navy leading-snug mb-2 line-clamp-2 group-hover:text-gold transition-colors">
                        {t(`projects.items.${p.key}.title`)}
                      </h3>
                      <div className="space-y-1.5 text-[12px] text-muted-foreground mb-4">
                        <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-gold shrink-0" />{t(`projects.items.${p.key}.location`)}</div>
                        <div className="flex items-center gap-1.5"><Coins className="h-3 w-3 text-gold shrink-0" />{t(`projects.items.${p.key}.value`)}</div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          {t(`projects.items.${p.key}.duration`)}
                        </span>
                        <ArrowRight className="h-4 w-4 text-navy group-hover:text-gold group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerGroup>

            <div className="mt-16 text-center">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-navy px-8 py-4 text-sm font-semibold text-white shadow-elegant transition-all hover:bg-navy-deep hover:scale-[1.03]"
              >
                {t("projects.ctaContact")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
