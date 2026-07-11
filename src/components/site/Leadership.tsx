"use client";

import Image from "next/image";

import { useTranslation } from "react-i18next";
import { Quote } from "lucide-react";
const ceo = "/assets/ceo-portrait.jpg";

export function Leadership() {
  const { t } = useTranslation();
  return (
    <section id="leadership" className="relative py-16 lg:py-24 dark-premium text-white overflow-hidden">
      <div className="absolute inset-x-0 top-0 gold-divider" />
      <div className="container-wide">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 relative">
            <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-elegant relative">
              <Image src={ceo} alt={t("leadership.name")} fill sizes="(max-width: 1024px) 100vw, 42vw" className="object-cover" />
            </div>
            <div className="absolute -top-6 -right-6 h-20 w-20 rounded-2xl gradient-gold flex items-center justify-center shadow-gold rotate-3">
              <Quote className="h-9 w-9 text-navy" />
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold mb-5">
              <span className="h-px w-8 bg-gold" />
              {t("leadership.eyebrow")}
            </div>
            <blockquote className="text-2xl md:text-3xl lg:text-4xl font-display font-medium text-white leading-[1.25]">
              {t("leadership.quotePre")}
              <span className="text-gold">{t("leadership.quoteAccent")}</span>
              {t("leadership.quotePost")}
            </blockquote>
            <p className="mt-8 text-base text-white/70 leading-relaxed max-w-2xl">
              {t("leadership.body")}
            </p>
            <div className="mt-8">
              <div className="text-2xl font-bold text-white">{t("leadership.name")}</div>
              <div className="text-sm text-gold uppercase tracking-[0.2em] mt-1">{t("leadership.role")}</div>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <div className="h-px w-16 bg-gold" />
              <a href="mailto:mamun@novarisebd.com" className="text-sm font-semibold text-white hover:text-gold transition" dir="ltr">
                mamun@novarisebd.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
