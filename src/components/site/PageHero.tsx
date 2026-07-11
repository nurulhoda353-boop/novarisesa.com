"use client";

import Image from "next/image";

import { Link } from "@/components/nav/AppLink";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reveal } from "@/components/site/Reveal";
import { AnimatedHeading } from "@/components/site/AnimatedHeading";

type Crumb = { label: string; to?: string };
type CTA = { label: string; to?: string; href?: string; variant?: "primary" | "ghost"; icon?: LucideIcon };

type Props = {
  num: string;            // "02"
  eyebrow: string;        // "About · Company"
  title: string;          // "About NOVARISE"
  description: string;    // 2–3 line summary
  icon: LucideIcon;       // small chip icon
  heroImage: string;      // background photo
  crumbs?: Crumb[];       // breadcrumb trail (excluding Home)
  ctas?: CTA[];           // optional buttons
  imageAlt?: string;
};

export function PageHero({
  num,
  eyebrow,
  title,
  description,
  icon: Icon,
  heroImage,
  crumbs = [],
  ctas = [],
  imageAlt,
}: Props) {
  const { t } = useTranslation();
  return (
    <section className="relative min-h-[64vh] lg:min-h-[72vh] flex items-end overflow-hidden dark-premium text-white">
      <div className="absolute inset-0">
        <Image
          src={heroImage}
          alt={imageAlt ?? `${title} — NOVARISE`}
          fill
          priority
          sizes="100vw"
          className="object-cover scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/85 to-navy-deep/45" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-deep/70 via-transparent to-transparent" />
      </div>

      <div className="pointer-events-none absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full bg-gold/15 blur-[140px] anim-breathe" />

      <div className="container-wide relative pt-36 pb-16 lg:pb-24">
        <div className="max-w-3xl">
          <Reveal>
            <nav className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/60 mb-7">
              <Link to="/" className="hover:text-gold transition-colors">{t("nav.home", "Home")}</Link>
              {crumbs.map((c, i) => (
                <span key={i} className="flex items-center gap-2">
                  <span className="text-white/30">/</span>
                  <span className={i === crumbs.length - 1 ? "text-gold" : ""}>{c.label}</span>
                </span>
              ))}
            </nav>

            <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 backdrop-blur-md pl-2 pr-4 py-1.5 mb-7">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold text-navy">
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              <span className="text-[10px] font-mono text-gold tracking-[0.25em]">{num}</span>
              <span className="h-1 w-1 rounded-full bg-gold" />
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/80">{eyebrow}</span>
            </div>

            <AnimatedHeading
              as="h1"
              text={title}
              trigger="mount"
              className="text-4xl md:text-5xl lg:text-[64px] font-bold tracking-tight leading-[1.05] text-white"
            />


            <p className="mt-6 text-base md:text-lg text-white/75 font-light leading-relaxed max-w-2xl">
              {description}
            </p>
          </Reveal>

          {ctas.length > 0 && (
            <Reveal delay={0.15}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                {ctas.map((cta, i) => {
                  const isPrimary = (cta.variant ?? (i === 0 ? "primary" : "ghost")) === "primary";
                  const cls = isPrimary
                    ? "group inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-gold-foreground shadow-gold transition-all hover:scale-[1.03]"
                    : "inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 backdrop-blur-md px-7 py-3.5 text-sm font-semibold text-white hover:bg-white hover:text-navy transition-colors";
                  const CTAIcon = cta.icon ?? ArrowUpRight;
                  const inner = (
                    <>
                      {!isPrimary && cta.icon ? <CTAIcon className="h-4 w-4" /> : null}
                      {cta.label}
                      {isPrimary ? (
                        <CTAIcon className="h-4 w-4 transition-transform group-hover:rotate-45" />
                      ) : null}
                    </>
                  );
                  if (cta.to) return <Link key={i} to={cta.to as string} className={cls}>{inner}</Link>;
                  return <a key={i} href={cta.href ?? "#"} className={cls}>{inner}</a>;
                })}
              </div>
            </Reveal>
          )}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 gold-divider" />
    </section>
  );
}
