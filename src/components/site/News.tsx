"use client";

import Image from "next/image";

import { useTranslation } from "react-i18next";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/components/nav/AppLink";
const supplyImg = "/assets/news-supply-chain.jpg";
const safetyImg = "/assets/news-safety.jpg";
const energyImg = "/assets/news-energy.jpg";

const images = [supplyImg, safetyImg, energyImg];

export function News() {
  const { t } = useTranslation();
  const items = t("news.items", { returnObjects: true }) as { cat: string; date: string; title: string; read: string }[];

  return (
    <section id="insights" className="relative py-16 lg:py-24 bg-sand-soft overflow-hidden">
      <div className="relative container-wide">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold mb-5">
              <span className="h-px w-8 bg-gold" />
              {t("news.eyebrow")}
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.05]">
              {t("news.title")}
            </h2>
          </div>
          <Link to="/blog" className="hidden md:inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-gold transition-colors">
            {t("news.allArticles")} <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {items.map((n, i) => (
            <article
              key={n.title}
              className="group bg-card rounded-2xl overflow-hidden border border-border hover:border-gold hover:shadow-elegant transition-all"
            >
              <div className="aspect-[16/10] relative overflow-hidden">
                <Image src={images[i]} alt={n.title} fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/60 via-transparent to-transparent" />
                <div className="absolute top-4 left-4 rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-navy">
                  {n.cat}
                </div>
                <div className="absolute bottom-4 right-4 text-white text-[11px] uppercase tracking-wider">
                  {n.date}
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold text-navy leading-snug group-hover:text-gold transition-colors min-h-[3.5rem]">
                  {n.title}
                </h3>
                <div className="mt-5 pt-5 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{n.read}</span>
                  <ArrowUpRight className="h-4 w-4 text-gold group-hover:rotate-45 transition-all" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
