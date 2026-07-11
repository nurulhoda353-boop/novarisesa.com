"use client";

import Image from "next/image";

import { Quote, ArrowUpRight } from "lucide-react";
import { Link } from "@/components/nav/AppLink";
import { useTranslation } from "react-i18next";
import { Reveal } from "@/components/site/Reveal";
const ceoImg = "/assets/ceo-portrait.jpg";

export function CEOMessage() {
  const { t } = useTranslation();
  return (
    <section id="ceo-message" className="relative py-16 lg:py-24 bg-white overflow-hidden">
      {/* Ambient */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-gold/12 blur-[140px] anim-breathe" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-[420px] w-[420px] rounded-full bg-navy/5 blur-[120px]" />

      <div className="container-wide relative">
        <Reveal className="max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
            <span className="h-px w-8 bg-gold" />
            {t("aboutPage.ceo.eyebrow")}
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.1]">
            {t("aboutPage.ceo.headingA")}<br />
            <span className="text-muted-foreground">{t("aboutPage.ceo.headingB")}</span>
          </h2>
        </Reveal>

        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Portrait card */}
          <Reveal className="lg:col-span-5" delay={0.1}>
            <div className="relative">
              {/* Decorative gold frame */}
              <div className="absolute -top-3 -left-3 h-24 w-24 border-l-2 border-t-2 border-gold/60 rounded-tl-2xl" />
              <div className="absolute -bottom-3 -right-3 h-24 w-24 border-r-2 border-b-2 border-gold/60 rounded-br-2xl" />

              <div className="relative h-[520px] rounded-2xl overflow-hidden border border-border shadow-elegant group">
                <Image
                  src={ceoImg}
                  alt="Portrait of the CEO of NOVARISE"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-[1200ms] group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/80 via-navy/10 to-transparent" />

                {/* Floating name plate */}
                <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-white/15 bg-white/8 backdrop-blur-xl p-5">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-gold mb-1">{t("aboutPage.ceo.role")}</div>
                  <div className="text-xl font-display font-bold text-white">{t("aboutPage.ceo.name")}</div>
                  <div className="text-xs text-white/60 mt-1">{t("aboutPage.ceo.company")}</div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Letter */}
          <Reveal className="lg:col-span-7 lg:pt-2" delay={0.2}>
            <div className="relative rounded-2xl border border-border bg-card p-7 lg:p-10 shadow-card overflow-hidden">
              <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gold/10 blur-3xl" />

              <Quote className="h-10 w-10 text-gold/70" strokeWidth={1.4} />

              <p className="mt-6 text-lg lg:text-xl font-display font-medium text-navy leading-snug">
                {t("aboutPage.ceo.quoteStart")}
                <span className="text-gold">{t("aboutPage.ceo.quoteHighlight")}</span>
              </p>

              <div className="mt-6 space-y-5 text-[15px] text-muted-foreground leading-relaxed">
                <p>{t("aboutPage.ceo.p1")}</p>
                <p>{t("aboutPage.ceo.p2")}</p>
                <p>{t("aboutPage.ceo.p3")}</p>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-border">
                <div>
                  <div className="font-display font-bold text-navy">{t("aboutPage.ceo.name")}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t("aboutPage.ceo.signatureRole")}</div>
                </div>
                <Link
                  to="/rfq"
                  className="group inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-xs uppercase tracking-[0.2em] font-semibold text-white hover:bg-gold hover:text-gold-foreground transition-colors"
                >
                  {t("aboutPage.ceo.cta")}
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:rotate-45" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

