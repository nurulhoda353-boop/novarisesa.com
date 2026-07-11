"use client";

import { motion } from "framer-motion";
import { Link } from "@/components/nav/AppLink";
import { MapPin, ArrowUpRight, CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reveal } from "@/components/site/Reveal";
import { useTranslatedEvents } from "@/i18n/use-translated-blog";

export function EventsSection() {
  const { t } = useTranslation();
  const events = useTranslatedEvents();
  return (
    <section id="events" className="relative py-20 lg:py-28 dark-premium text-white overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full bg-gold/10 blur-[160px] anim-drift" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

      <div className="relative container-wide">
        <Reveal>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-14">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-gold anim-breathe" />
                {t("blogPage.events.eyebrow")}
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold tracking-tight text-white leading-[1.05]">
                {t("blogPage.events.titleA")} <span className="text-gradient-gold">{t("blogPage.events.titleB")}</span>
              </h2>
              <p className="mt-5 text-white/70 text-base md:text-lg leading-relaxed">
                {t("blogPage.events.sub")}
              </p>
            </div>

            <Link
              to="/contact"
              className="self-start lg:self-end inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-md px-5 py-3 text-sm font-semibold text-white hover:bg-white hover:text-navy transition-colors"
            >
              <CalendarDays className="h-4 w-4" /> {t("blogPage.events.cta")}
            </Link>
          </div>
        </Reveal>

        <div className="grid gap-5">
          {events.map((e, i) => (
            <motion.div
              key={e.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="group relative grid grid-cols-12 gap-5 lg:gap-8 items-center rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-5 lg:p-7 hover:border-gold/40 hover:bg-white/[0.06] transition-colors"
            >
              <div className="col-span-3 md:col-span-2">
                <div className="relative rounded-xl border border-gold/30 bg-gold/10 px-3 py-4 text-center">
                  <div className="text-3xl md:text-4xl font-display font-black text-gold tabular-nums leading-none">
                    {e.dateShort.day}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.25em] text-white/70">
                    {e.dateShort.month}
                  </div>
                </div>
              </div>

              <div className="col-span-9 md:col-span-7">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.22em] text-white/80">
                    {e.type}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-gold/15 text-gold px-2.5 py-0.5 text-[10px] uppercase tracking-[0.22em]">
                    {e.status}
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-display font-semibold text-white leading-snug group-hover:text-gold transition-colors">
                  {e.title}
                </h3>
                <p className="mt-2 text-sm text-white/65 leading-relaxed max-w-2xl">{e.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-white/60">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-gold" /> {e.date}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-gold" /> {e.location}
                  </span>
                </div>
              </div>

              <div className="col-span-12 md:col-span-3 flex md:justify-end">
                <Link
                  to="/contact"
                  className="group/btn inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-gold-foreground shadow-gold transition-transform hover:scale-[1.03]"
                >
                  {t("blogPage.events.register")}
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover/btn:rotate-45" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
