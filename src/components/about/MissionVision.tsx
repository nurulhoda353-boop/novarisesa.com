"use client";

import { Target, Eye, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reveal } from "@/components/site/Reveal";

export function MissionVision() {
  const { t } = useTranslation();
  const cards = [
    {
      tag: t("aboutPage.mv.missionTag"),
      icon: Target,
      title: t("aboutPage.mv.missionTitle"),
      body: t("aboutPage.mv.missionBody"),
      points: t("aboutPage.mv.missionPoints", { returnObjects: true }) as string[],
      footer: t("aboutPage.mv.missionFooter"),
    },
    {
      tag: t("aboutPage.mv.visionTag"),
      icon: Eye,
      title: t("aboutPage.mv.visionTitle"),
      body: t("aboutPage.mv.visionBody"),
      points: t("aboutPage.mv.visionPoints", { returnObjects: true }) as string[],
      footer: t("aboutPage.mv.visionFooter"),
    },
  ];

  return (
    <section id="mission-vision" className="relative py-16 lg:py-24 dark-premium overflow-hidden">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute -top-32 right-1/4 h-[420px] w-[420px] rounded-full bg-gold/10 blur-[140px] anim-drift" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 h-[460px] w-[460px] rounded-full bg-navy/40 blur-[140px] anim-breathe" />

      <div className="container-wide relative">
        <Reveal className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
            <span className="h-px w-8 bg-gold" />
            {t("aboutPage.mv.eyebrow")}
            <span className="h-px w-8 bg-gold" />
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.1]">
            {t("aboutPage.mv.headingA")}<br />
            <span className="text-white/55">{t("aboutPage.mv.headingB")}</span>
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-5 lg:gap-7">
          {cards.map((c, i) => (
            <Reveal key={c.tag} delay={0.1 + i * 0.1}>
              <article className="group relative h-full rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-7 lg:p-9 overflow-hidden hover:border-gold/40 transition-all duration-500">
                {/* gold corner glow */}
                <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-gold/15 blur-3xl opacity-70 group-hover:opacity-100 transition-opacity duration-700" />
                <span className="absolute top-0 left-0 h-1 w-0 group-hover:w-full bg-gold transition-all duration-700" />

                <div className="relative flex items-center gap-3 mb-6">
                  <span className="h-12 w-12 rounded-xl bg-gold/15 border border-gold/25 flex items-center justify-center group-hover:bg-gold group-hover:rotate-[-6deg] transition-all duration-500">
                    <c.icon className="h-5 w-5 text-gold group-hover:text-navy transition-colors" strokeWidth={1.7} />
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.32em] text-gold">{c.tag}</span>
                </div>

                <h3 className="relative text-2xl lg:text-[28px] font-display font-bold text-white leading-[1.2]">
                  {c.title}
                </h3>
                <p className="relative mt-5 text-[15px] text-white/70 leading-relaxed">{c.body}</p>

                <ul className="relative mt-7 space-y-3">
                  {c.points.map((p) => (
                    <li key={p} className="flex items-start gap-3 text-sm text-white/80">
                      <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-gold shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>

                <div className="relative mt-8 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40 group-hover:text-gold transition-colors">
                  <span className="h-px w-8 bg-current" />
                  <span>{c.footer}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 ml-auto opacity-0 group-hover:opacity-100 group-hover:rotate-45 transition-all duration-500" />
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

