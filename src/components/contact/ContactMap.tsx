"use client";

import { MapPin, Navigation } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reveal } from "@/components/site/Reveal";

export function ContactMap() {
  const { t } = useTranslation();
  return (
    <section id="map" className="relative py-16 lg:py-24 bg-sand-soft overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-gold/10 blur-[140px] anim-drift" />
      <div className="container-wide relative">
        <Reveal className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
            <span className="h-px w-8 bg-gold" />
            {t("contactPage.map.eyebrow")}
            <span className="h-px w-8 bg-gold" />
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.1]">
            {t("contactPage.map.titleA")}<br />
            <span className="text-muted-foreground">{t("contactPage.map.titleB")}</span>
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="relative rounded-2xl overflow-hidden border border-border shadow-elegant">
            <div className="pointer-events-none absolute top-3 left-3 h-16 w-16 border-l-2 border-t-2 border-gold/60 rounded-tl-2xl z-10" />
            <div className="pointer-events-none absolute bottom-3 right-3 h-16 w-16 border-r-2 border-b-2 border-gold/60 rounded-br-2xl z-10" />

            <iframe
              title="NOVARISE Head Office — Umluj"
              src="https://www.openstreetmap.org/export/embed.html?bbox=37.2535%2C25.0113%2C37.2835%2C25.0313&layer=mapnik&marker=25.0213%2C37.2685"
              className="w-full h-[440px] lg:h-[520px] border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />

            <div className="absolute bottom-6 left-6 right-6 lg:right-auto lg:max-w-md">
              <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-xl p-5 shadow-elegant">
                <div className="flex items-start gap-4">
                  <span className="h-11 w-11 rounded-xl bg-gold flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-navy" strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-gold">{t("contactPage.map.badge")}</div>
                    <div className="text-base font-display font-bold text-navy mt-0.5">{t("contactPage.map.name")}</div>
                    <div className="text-xs text-muted-foreground mt-1 leading-relaxed whitespace-pre-line">
                      {t("contactPage.map.address")}
                    </div>
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=2124+King+Faisal+Rd+Al+Bathaa+Umluj+48313"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="group mt-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-navy hover:text-gold transition-colors"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      {t("contactPage.map.directions")}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
