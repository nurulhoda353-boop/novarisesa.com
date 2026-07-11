"use client";

import Image from "next/image";

import { Link } from "@/components/nav/AppLink";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, Mail, Briefcase, Users, MapPin, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
const careersImage = "/assets/manpower.jpg";

const stats = [
  { key: "stat1", icon: Users },
  { key: "stat2", icon: MapPin },
  { key: "stat3", icon: ShieldCheck },
];

export function CareersTeaser() {
  const { t } = useTranslation();

  return (
    <section className="relative py-20 lg:py-28 bg-white overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-gold/10 blur-[140px] anim-breathe" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-[420px] w-[420px] rounded-full bg-navy/5 blur-[140px]" />

      <div className="container-wide relative">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Image side */}
          <Reveal className="lg:col-span-6 order-2 lg:order-1">
            <div className="relative group">
              <div className="absolute -inset-3 bg-gradient-to-br from-gold/30 to-transparent rounded-3xl blur-2xl opacity-60 group-hover:opacity-90 transition-opacity duration-700" />
              <div className="relative h-[420px] lg:h-[480px] overflow-hidden rounded-3xl border border-border shadow-elegant">
                <Image
                  src={careersImage}
                  alt="NOVARISE workforce on a Saudi industrial project site"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-[1.4s] group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/70 via-transparent to-transparent" />

                {/* Floating badge */}
                <div className="absolute top-5 left-5 inline-flex items-center gap-2 rounded-full bg-navy/85 backdrop-blur-md border border-gold/30 px-4 py-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-gold opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.25em] text-white font-semibold">
                    {t("careersTeaser.imageBadge")}
                  </span>
                </div>

                {/* Stats overlay */}
                <div className="absolute bottom-0 inset-x-0 p-5 lg:p-6">
                  <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-4">
                    {stats.map((s) => (
                      <div key={s.key} className="text-center">
                        <s.icon className="h-4 w-4 text-gold mx-auto mb-1.5" strokeWidth={1.6} />
                        <div className="text-lg lg:text-xl font-display font-bold text-white leading-none tabular-nums">
                          {t(`careersTeaser.${s.key}Value`)}
                        </div>
                        <div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-white/75">
                          {t(`careersTeaser.${s.key}Label`)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Content side */}
          <Reveal delay={0.1} className="lg:col-span-6 order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-5">
              <span className="h-px w-8 bg-gold" />
              <Briefcase className="h-3.5 w-3.5" />
              {t("careersTeaser.eyebrow")}
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.1]">
              {t("careersTeaser.titleA")}
              <br />
              <span className="text-gradient-gold">{t("careersTeaser.titleB")}</span>
            </h2>

            <p className="mt-6 text-base lg:text-lg text-muted-foreground leading-relaxed max-w-xl">
              {t("careersTeaser.desc")}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/careers"
                className="group inline-flex items-center gap-2 rounded-full bg-navy px-7 py-3.5 text-sm font-semibold text-white shadow-elegant transition-all hover:bg-navy-deep hover:scale-[1.03]"
              >
                {t("careersTeaser.cta")}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:rotate-45" />
              </Link>
              <a
                href="mailto:ceo@novarisebd.com?subject=Career%20Application%20%E2%80%94%20NOVARISE"
                className="inline-flex items-center gap-2 rounded-full border border-navy/20 bg-white px-7 py-3.5 text-sm font-semibold text-navy hover:border-gold hover:text-gold transition-colors"
              >
                <Mail className="h-4 w-4" />
                {t("careersTeaser.ctaCv")}
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
