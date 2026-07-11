"use client";

import Image from "next/image";

import { ArrowUpRight, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reveal } from "@/components/site/Reveal";
import { useTranslatedPosts } from "@/i18n/use-translated-blog";

export function FeaturedPost() {
  const { t } = useTranslation();
  const { featured: p } = useTranslatedPosts();
  return (
    <section id="latest" className="relative py-14 lg:py-20 bg-background overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

      <div className="container-wide relative">
        <Reveal>
          <div className="flex items-end justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="h-px w-10 bg-gold" />
                <span className="eyebrow !mb-0">{t("blogPage.featured.eyebrow")}</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-navy leading-[1.1]">
                {t("blogPage.featured.titleA")} <span className="text-gradient-gold italic font-display">{t("blogPage.featured.titleB")}</span>
              </h2>
            </div>
            <div className="hidden md:flex flex-col items-end text-right">
              <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{t("blogPage.featured.issueLabel")}</span>
              <span className="font-display text-base text-navy tabular-nums mt-0.5">{t("blogPage.featured.issueValue")}</span>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <article
            data-cursor-label="Read story"
            className="group relative grid lg:grid-cols-12 gap-6 lg:gap-10 items-center"
          >
            <div className="lg:col-span-6 relative">
              <div className="relative aspect-[16/10] overflow-hidden rounded-sm">
                <Image
                  src={p.image}
                  alt={p.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                />
                <span className="absolute top-0 left-0 h-8 w-8 border-t-2 border-l-2 border-gold" />
                <span className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-gold" />
                <div className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full bg-navy/90 backdrop-blur-md px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-gold">
                  {t(`blogPage.grid.categories.${p.category}`, { defaultValue: p.category })}
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                <span className="tabular-nums tracking-wider">{p.date}</span>
                <span className="h-1 w-1 rounded-full bg-gold/60" />
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> {p.readMins} {t("blogPage.featured.minRead")}
                </span>
              </div>

              <h3 className="font-display font-bold tracking-tight text-navy leading-[1.15] text-xl md:text-2xl lg:text-[28px] group-hover:text-gradient-gold transition-colors">
                {p.title}
              </h3>

              <div className="mt-4 h-px w-16 bg-gold" />

              <p className="mt-4 text-sm md:text-[15px] text-muted-foreground leading-relaxed line-clamp-3">
                {p.excerpt}
              </p>

              <div className="mt-6 flex items-center justify-between gap-4 pt-5 border-t border-border">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-navy truncate">{p.author}</div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
                    {p.authorRole}
                  </div>
                </div>
                <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gold text-gold-foreground shadow-gold transition-transform group-hover:rotate-45">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </article>
        </Reveal>
      </div>
    </section>
  );
}
