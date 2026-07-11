"use client";

import Image from "next/image";
import { Check, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Link } from "@/components/nav/AppLink";
import { Reveal } from "@/components/site/Reveal";

type Props = {
  id: string;
  num: string;
  eyebrow: string;
  title: string;
  lead: string;
  body: string;
  bullets: string[];
  image: string;
  icon: LucideIcon;
  reverse?: boolean;
  dark?: boolean;
};

export function ServiceDetail({ id, num, eyebrow, title, lead, body, bullets, image, icon: Icon, reverse = false, dark = false }: Props) {
  return (
    <section
      id={id}
      className={`relative py-16 lg:py-24 overflow-hidden ${dark ? "dark-premium" : "bg-sand-soft"}`}
    >
      <div className={`pointer-events-none absolute -top-32 ${reverse ? "-left-32" : "-right-32"} h-[420px] w-[420px] rounded-full ${dark ? "bg-gold/10" : "bg-gold/12"} blur-[140px] anim-drift`} />
      {dark && (
        <div className="pointer-events-none absolute -bottom-32 -right-24 h-[400px] w-[400px] rounded-full bg-navy/40 blur-[120px] anim-breathe" />
      )}

      <div className="container-wide relative">
        <div className={`grid lg:grid-cols-12 gap-10 lg:gap-14 items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
          {/* Image */}
          <Reveal className="lg:col-span-6">
            <div className="relative">
              <div className="absolute -top-3 -left-3 h-20 w-20 border-l-2 border-t-2 border-gold/60 rounded-tl-2xl" />
              <div className="absolute -bottom-3 -right-3 h-20 w-20 border-r-2 border-b-2 border-gold/60 rounded-br-2xl" />

              <div className="relative h-[420px] lg:h-[480px] rounded-2xl overflow-hidden border border-border shadow-elegant group">
                <Image
                  src={image}
                  alt={`${title} — NOVARISE`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-[1200ms] group-hover:scale-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/75 via-navy/15 to-transparent" />

                <div className="absolute top-5 left-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-3 py-1.5">
                  <span className="text-[10px] font-mono text-gold tracking-[0.2em]">{num}</span>
                  <span className="h-1 w-1 rounded-full bg-gold" />
                  <span className="text-[10px] uppercase tracking-[0.25em] text-white/80">Service</span>
                </div>

                <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between text-white">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-3 py-1.5 text-[11px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold anim-breathe" />
                    Active scopes
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Content */}
          <Reveal className="lg:col-span-6" delay={0.15}>
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
              <span className="h-px w-8 bg-gold" />
              {eyebrow}
            </div>

            <div className="flex items-start gap-4 mb-5">
              <span className={`h-12 w-12 shrink-0 rounded-xl ${dark ? "bg-gold/15 border border-gold/25" : "bg-gold/10"} flex items-center justify-center`}>
                <Icon className="h-5 w-5 text-gold" strokeWidth={1.7} />
              </span>
              <h2 className={`text-3xl md:text-4xl lg:text-[42px] font-bold tracking-tight leading-[1.05] ${dark ? "text-white" : "text-navy"}`}>
                {title}
              </h2>
            </div>

            <p className={`text-lg lg:text-xl font-display font-medium leading-snug ${dark ? "text-white/90" : "text-navy"}`}>
              {lead}
            </p>
            <p className={`mt-4 text-[15px] leading-relaxed ${dark ? "text-white/65" : "text-muted-foreground"}`}>
              {body}
            </p>

            <ul className="mt-7 grid sm:grid-cols-2 gap-3">
              {bullets.map((b) => (
                <li
                  key={b}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                    dark
                      ? "border-white/10 bg-white/[0.04] hover:border-gold/40"
                      : "border-border bg-card hover:border-gold hover:shadow-card"
                  }`}
                >
                  <span className="h-7 w-7 rounded-lg bg-gold/15 flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5 text-gold" strokeWidth={2.4} />
                  </span>
                  <span className={`text-sm font-medium ${dark ? "text-white/90" : "text-navy"}`}>{b}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/rfq"
                className="group inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-gold-foreground shadow-gold transition-all hover:scale-[1.03]"
              >
                Request Quote
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:rotate-45" />
              </Link>
              <Link
                to="/services"
                className={`inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold transition-colors ${
                  dark
                    ? "border-white/25 bg-white/5 text-white hover:bg-white hover:text-navy"
                    : "border-navy/20 bg-card text-navy hover:bg-navy hover:text-white"
                }`}
              >
                Learn more
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
