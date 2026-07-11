"use client";

import Image from "next/image";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@/components/nav/AppLink";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { SectionNumber } from "./SectionNumber";
import { AnimatedHeading } from "./AnimatedHeading";
import { featuredProjects } from "@/lib/projects-data";

export function Projects() {
  const { t } = useTranslation();
  const [i, setI] = useState(0);
  const p = featuredProjects[i];
  const total = featuredProjects.length;
  const next = () => setI((i + 1) % total);
  const prev = () => setI((i - 1 + total) % total);

  return (
    <section id="projects" className="relative py-16 lg:py-24 dark-premium blueprint-bg text-white overflow-hidden">
      <div className="absolute inset-x-0 top-0 gold-divider" />
      <div className="relative container-wide">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <SectionNumber num="04" label={t("projects.eyebrow")} tone="dark" className="mb-5" />
            <AnimatedHeading
              as="h2"
              className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.05]"
              lines={[
                t("projects.title.l1"),
                { text: t("projects.title.l2"), className: "text-white/50" },
              ]}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={prev}
              data-cursor-label="Previous"
              className="h-12 w-12 rounded-full border border-white/20 hover:bg-white hover:text-navy flex items-center justify-center transition-all"
              aria-label={t("projects.prevAria")}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={next}
              data-cursor-label="Next case"
              className="h-12 w-12 rounded-full bg-gold text-navy hover:bg-white flex items-center justify-center transition-all"
              aria-label={t("projects.nextAria")}
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-7 rounded-3xl overflow-hidden shadow-elegant aspect-[4/3] lg:aspect-auto relative group">
            <Image
              key={p.img}
              src={p.img}
              alt={t(`projects.items.${p.key}.title`)}
              fill
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105 reveal"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/80 via-transparent to-transparent" />

            {/* Gold corner accents */}
            <div className="pointer-events-none absolute top-4 right-4 h-8 w-8 border-t-2 border-r-2 border-gold/70 rounded-tr-lg" />
            <div className="pointer-events-none absolute bottom-4 left-4 h-8 w-8 border-b-2 border-l-2 border-gold/70 rounded-bl-lg" />

            <div className="absolute top-6 left-6 flex items-center gap-2">
              <span className="rounded-full bg-gold px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-navy">
                {t(`projects.items.${p.key}.sector`)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                <Sparkles className="h-3 w-3 text-gold" /> {t("projects.featured")}
              </span>
            </div>
            <div className="absolute bottom-6 right-6 text-white text-sm font-mono" dir="ltr">
              {String(i + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </div>

            {/* Progress dots */}
            <div className="absolute bottom-6 left-6 flex items-center gap-1.5" dir="ltr">
              {featuredProjects.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setI(idx)}
                  aria-label={`Project ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    idx === i ? "w-8 bg-gold" : "w-1.5 bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-navy-deep/80 border border-white/10 rounded-3xl p-8 lg:p-10 shadow-card flex flex-col">
            <h3 key={p.key} className="text-3xl lg:text-4xl font-bold text-white leading-tight mb-6 reveal">
              {t(`projects.items.${p.key}.title`)}
            </h3>
            <p className="text-white/70 leading-relaxed mb-8">{t(`projects.items.${p.key}.scope`)}</p>

            <div className="grid grid-cols-2 gap-6 pt-8 border-t border-white/10">
              <Detail label={t("projects.details.client")} value={t(`projects.items.${p.key}.client`)} />
              <Detail label={t("projects.details.location")} value={t(`projects.items.${p.key}.location`)} />
              <Detail label={t("projects.details.value")} value={t(`projects.items.${p.key}.value`)} />
              <Detail label={t("projects.details.duration")} value={t(`projects.items.${p.key}.duration`)} />
            </div>

            <Link
              to="/projects/$slug"
              params={{ slug: p.slug }}
              className="mt-8 group inline-flex items-center justify-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-bold text-navy hover:bg-white transition-all"
            >
              {t("projects.viewDetails")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            to="/projects"
            className="group inline-flex items-center gap-2 rounded-full border border-gold/40 bg-white/[0.04] backdrop-blur-md px-7 py-3.5 text-sm font-semibold text-white hover:bg-gold hover:text-navy hover:border-gold transition-all"
          >
            {t("projects.viewAll")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-gold mb-1.5">{label}</div>
      <div className="text-base font-semibold text-white">{value}</div>
    </div>
  );
}
