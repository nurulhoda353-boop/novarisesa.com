"use client";

import { useTranslation } from "react-i18next";
import { Quote } from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "./Reveal";

const items = [
  { key: "aramco", initials: "SA", color: "bg-gold" },
  { key: "sabic", initials: "SB", color: "bg-navy" },
  { key: "samsung", initials: "SE", color: "bg-navy-deep" },
];

export function Testimonials() {
  const { t } = useTranslation();
  return (
    <section id="testimonials" className="relative py-16 lg:py-24 bg-sand-soft overflow-hidden">
      <div className="container-wide">
        <Reveal className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold mb-5">
            <span className="h-px w-8 bg-gold" />
            {t("testimonials.eyebrow")}
            <span className="h-px w-8 bg-gold" />
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.05]">
            {t("testimonials.titleA")}<br />
            <span className="text-muted-foreground">{t("testimonials.titleB")}</span>
          </h2>
        </Reveal>

        <StaggerGroup className="grid md:grid-cols-3 gap-6 lg:gap-7" stagger={0.1}>
          {items.map((it) => (
            <StaggerItem key={it.key}>
              <article className="group relative h-full bg-card border border-border rounded-3xl p-8 lg:p-9 shadow-card hover:shadow-elegant hover:-translate-y-1 transition-all duration-500 flex flex-col">
                <Quote className="h-8 w-8 text-gold mb-6 opacity-80" strokeWidth={1.6} />
                <p className="text-base lg:text-lg text-navy leading-relaxed flex-1">&ldquo;{t(`testimonials.items.${it.key}.q`)}&rdquo;</p>
                <div className="mt-8 pt-6 border-t border-border flex items-center gap-4">
                  <div className={`h-11 w-11 rounded-full ${it.color} flex items-center justify-center text-white text-sm font-display font-bold shrink-0`}>
                    {it.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-navy">{t(`testimonials.items.${it.key}.name`)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">{t(`testimonials.items.${it.key}.org`)}</div>
                  </div>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerGroup>

        <Reveal className="mt-12 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            {t("testimonials.disclaimer")}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
