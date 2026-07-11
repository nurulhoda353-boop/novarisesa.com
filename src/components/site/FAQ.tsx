"use client";

import { useState } from "react";
import { Link } from "@/components/nav/AppLink";
import { useTranslation } from "react-i18next";
import { Plus, MessageCircle, Phone, Mail, ArrowUpRight } from "lucide-react";
import { Reveal } from "./Reveal";

export function FAQ() {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(0);
  const faqs = t("faq.items", { returnObjects: true }) as { q: string; a: string }[];

  return (
    <section id="faq" className="relative py-16 lg:py-24 bg-sand-soft overflow-hidden">
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[460px] w-[460px] rounded-full bg-gold/10 blur-[130px] anim-drift" />
      <div className="container-wide relative">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <Reveal>
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
                <span className="h-px w-8 bg-gold" />
                {t("faq.eyebrow")}
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.1]">
                {t("faq.titleA")}<br />
                <span className="text-muted-foreground">{t("faq.titleB")}</span>
              </h2>
              <p className="mt-5 text-sm text-muted-foreground leading-relaxed max-w-md">
                {t("faq.desc")}
              </p>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="mt-8 relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-navy to-navy-deep p-7 text-white shadow-elegant">
                <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-gold/20 blur-3xl" />
                <div className="relative">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-gold">
                    <MessageCircle className="h-3 w-3" />
                    {t("faq.stillCurious")}
                  </div>
                  <h3 className="mt-4 text-xl font-display font-semibold leading-snug whitespace-pre-line">
                    {t("faq.talkTitle")}
                  </h3>
                  <p className="mt-2 text-sm text-white/65 leading-relaxed">
                    {t("faq.talkDesc")}
                  </p>

                  <div className="mt-6 space-y-3 text-sm">
                    <a href="tel:+966554429574" className="group flex items-center gap-3 text-white/85 hover:text-gold transition-colors" dir="ltr">
                      <span className="h-8 w-8 rounded-full border border-white/15 bg-white/5 flex items-center justify-center group-hover:border-gold/40 transition-colors">
                        <Phone className="h-3.5 w-3.5 text-gold" />
                      </span>
                      +966 55 442 9574
                    </a>
                    <a href="mailto:ceo@novarisebd.com" className="group flex items-center gap-3 text-white/85 hover:text-gold transition-colors" dir="ltr">
                      <span className="h-8 w-8 rounded-full border border-white/15 bg-white/5 flex items-center justify-center group-hover:border-gold/40 transition-colors">
                        <Mail className="h-3.5 w-3.5 text-gold" />
                      </span>
                      ceo@novarisebd.com
                    </a>
                  </div>

                  <Link
                    to="/rfq"
                    className="group mt-7 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-gold-foreground shadow-gold transition-transform hover:scale-[1.03]"
                  >
                    {t("nav.requestRfq")}
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:rotate-45" />
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal className="lg:col-span-7">
            <div className="divide-y divide-border border-y border-border">
              {faqs.map((f, i) => {
                const isOpen = open === i;
                return (
                  <div key={i} className="group">
                    <button
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="w-full flex items-start justify-between gap-6 py-6 text-left transition-colors hover:text-navy"
                      aria-expanded={isOpen}
                    >
                      <div className="flex items-start gap-5 min-w-0">
                        <span className="text-[11px] font-mono tracking-[0.2em] text-gold mt-1.5 shrink-0">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="text-lg lg:text-xl font-display font-medium text-navy leading-snug">
                          {f.q}
                        </span>
                      </div>
                      <span
                        className={`h-9 w-9 shrink-0 rounded-full border flex items-center justify-center transition-all duration-500 ${
                          isOpen ? "bg-gold border-gold rotate-45" : "border-border bg-card"
                        }`}
                      >
                        <Plus className={`h-4 w-4 transition-colors ${isOpen ? "text-navy" : "text-navy"}`} strokeWidth={2} />
                      </span>
                    </button>
                    <div
                      className={`grid transition-all duration-500 ease-out ${
                        isOpen ? "grid-rows-[1fr] opacity-100 pb-7" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="pl-12 pr-12 text-sm lg:text-base text-muted-foreground leading-relaxed max-w-2xl">
                          {f.a}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
