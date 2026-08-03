"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useCmsAsset } from "@/lib/cms-content";
import { useEditMode } from "@/components/cms/EditModeContext";
const heroImg = "/assets/hero-industrial.jpg";
import { AnimatedNumber } from "./AnimatedNumber";
import { MagneticButton } from "./MagneticButton";

export function Hero() {
  const managedHeroImg = useCmsAsset("home.hero", heroImg);
  const { editing } = useEditMode();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yImg = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "18%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  // Title lines: line 2 = gold gradient, line 3 = underline-draw
  const titleLines: { text: string; gold?: boolean; underline?: boolean; field: string }[] = [
    { text: t("hero.title.line1"), field: "hero.title.line1" },
    { text: t("hero.title.line2"), gold: true, field: "hero.title.line2" },
    { text: t("hero.title.line3"), underline: true, field: "hero.title.line3" },
  ];

  const statKeys = ["workforce", "turnover", "years", "verticals", "specialists", "hours"] as const;
  const stats = statKeys.map((key) => ({
    key,
    v: Number(t(`hero.stats.${key}.value`)) || 0,
    suffix: t(`hero.stats.${key}.suffix`),
    l: t(`hero.stats.${key}.label`),
    pct: Number(t(`hero.stats.${key}.pct`)) || 0,
  }));



  return (
    <section
      ref={ref}
      className="relative min-h-[100svh] lg:h-[88vh] lg:min-h-[640px] lg:max-h-[900px] flex items-start lg:items-center overflow-hidden"
    >
      <motion.div style={{ y: yImg }} data-cms-asset="home.hero" className="absolute inset-0 will-change-transform">
        <motion.img
          src={managedHeroImg}
          alt="Saudi Arabian industrial megaproject at golden hour"
          className="w-full h-[115%] object-cover origin-center"
          width={1920}
          height={1080}
          initial={reduce ? false : { scale: 1.08, x: "-1%", y: "0%" }}
          animate={reduce ? undefined : { scale: 1.14, x: "1%", y: "-1.5%" }}
          transition={{ duration: 10, ease: [0.45, 0, 0.55, 1], repeat: Infinity, repeatType: "reverse" }}
        />
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 grid-lines opacity-30" />
      </motion.div>


      <div className="relative z-10 container-wide w-full pt-28 sm:pt-32 lg:pt-24 pb-16 lg:pb-16">
        <div className="grid lg:grid-cols-12 gap-10 items-start lg:items-center">
          <div className="lg:col-span-8">
            <motion.p
              initial={editing ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.25 }}
              className={`${isRtl ? "font-sans text-left" : "font-arabic text-left"} text-xl md:text-3xl text-gold mb-3`}
              dir={isRtl ? "ltr" : "rtl"}
              style={{ unicodeBidi: "isolate" }}
            >
              <span data-cms-field="hero.tagline" suppressContentEditableWarning>{t("hero.tagline")}</span>
            </motion.p>
            <h1 data-tr className="text-white font-display font-bold leading-[1.12] tracking-tight text-4xl md:text-6xl lg:text-7xl">
              {editing ? titleLines.map((line, lineIdx) => (
                <span
                  key={lineIdx}
                  className={`block overflow-visible ${line.gold ? "text-gradient-gold" : ""} ${line.underline ? "underline-draw" : ""}`}
                  data-cms-field={line.field}
                  suppressContentEditableWarning
                >
                  {line.text}
                </span>
              )) : titleLines.map((line, lineIdx) => {
                const words = line.text.split(" ");
                return (
                  <span key={lineIdx} className="block overflow-visible">
                    {words.map((w, wIdx) => {
                      const delay = 0.35 + lineIdx * 0.18 + wIdx * 0.09;
                      return (
                        <motion.span
                          key={w + wIdx}
                          initial={{ opacity: 0, y: 44 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
                          className={`inline-block overflow-visible mr-[0.22em] ${line.gold ? "text-gradient-gold" : ""} ${line.underline && wIdx === words.length - 1 ? "underline-draw" : ""}`}
                        >
                          {w}
                        </motion.span>
                      );
                    })}
                  </span>
                );
              })}
            </h1>
            <motion.p
              initial={editing ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="mt-6 max-w-2xl text-base md:text-lg text-white/75 leading-relaxed"
            >
              <span data-cms-field="hero.subtitle" suppressContentEditableWarning>{t("hero.subtitle")}</span>
            </motion.p>

            <motion.div
              initial={editing ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.95 }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <MagneticButton
                href="/capabilities"
                {...{ "data-cursor-label": "Explore" }}
                className="group rounded-full bg-gold px-7 py-4 text-sm font-semibold text-gold-foreground shadow-gold"
              >
                <span data-cms-field="hero.cta" suppressContentEditableWarning>{t("hero.cta")}</span>
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:rotate-45" />
              </MagneticButton>
            </motion.div>
          </div>

          <motion.div
            initial={editing ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.05, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-4"
          >
            <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl p-5 lg:p-6 shadow-elegant">
              <div className="text-xs uppercase tracking-[0.25em] text-gold mb-4" data-cms-field="hero.glance">{t("hero.glance")}</div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-4 lg:gap-x-5">
                {stats.map((s, i) => (
                  <motion.div
                    key={s.key}
                    initial={editing ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1.2 + i * 0.08 }}
                  >
                    <div className="text-2xl lg:text-[1.6rem] font-display font-bold text-white tabular-nums">
                      <AnimatedNumber value={s.v} suffix={s.suffix} field={`hero.stats.${s.key}.value`} />
                    </div>
                    <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        initial={editing ? false : { width: 0 }}
                        animate={{ width: `${s.pct}%` }}
                        transition={{ duration: 1.4, delay: 1.4 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full bg-gradient-to-r from-gold/70 to-gold"
                      />
                    </div>
                    <div
                      className="text-[10px] leading-tight uppercase tracking-wider text-white/60 mt-2"
                      data-cms-field={`hero.stats.${s.key}.label`}
                    >
                      {s.l}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

          </motion.div>
        </div>
      </div>

      <motion.div
        style={{ opacity }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2.5"
      >
        <span className="text-[10px] uppercase tracking-[0.4em] text-gold/90 font-semibold" data-cms-field="hero.scroll">{t("hero.scroll")}</span>
        <div className="relative h-10 w-6 rounded-full border border-gold/50 flex items-start justify-center pt-1.5 overflow-hidden">
          <motion.span
            className="h-1.5 w-1 rounded-full bg-gold"
            animate={{ y: [0, 14, 0], opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </section>
  );
}
