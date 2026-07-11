"use client";

import { useTranslation } from "react-i18next";
import { useInView, useCountUp } from "@/hooks/use-count-up";
import Image from "next/image";
import { Calendar, Users, TrendingUp, Building2, type LucideIcon } from "lucide-react";
const workforceImg = "/assets/manpower.jpg";

export function Numbers() {
  const { t } = useTranslation();
  const { ref, visible } = useInView<HTMLElement>(0.25);

  const stats = [
    { value: 10, suffix: "+", key: "years", Icon: Calendar },
    { value: 2500, suffix: "+", key: "workforce", Icon: Users },
    { value: 25, suffix: "M", key: "turnover", Icon: TrendingUp },
    { value: 50, suffix: "+", key: "projects", Icon: Building2 },
  ];

  return (
    <section ref={ref} className="relative py-16 lg:py-20 bg-sand-soft overflow-hidden">
      <div className="relative container-wide">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold mb-4">
                <span className="h-px w-8 bg-gold" />
                {t("numbers.eyebrow")}
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-navy leading-[1.05]">
                {t("numbers.titleA")}{" "}
                <span className="text-gradient-gold">{t("numbers.titleB")}</span>
              </h2>
              <p className="mt-4 max-w-lg text-sm text-muted-foreground leading-relaxed">
                {t("numbers.desc")}
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-px bg-border/60 rounded-xl overflow-hidden border border-border/70 bg-white">
              {stats.map((s, i) => (
                <Stat
                  key={s.key}
                  value={s.value}
                  suffix={s.suffix}
                  label={t(`numbers.stats.${s.key}.label`)}
                  desc={t(`numbers.stats.${s.key}.desc`)}
                  Icon={s.Icon}
                  trigger={visible}
                  delay={i * 120}
                />
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative h-full min-h-[380px] rounded-2xl overflow-hidden border border-border shadow-elegant group">
              <Image
                src={workforceImg}
                alt="NOVARISE workforce on site"
                fill
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/85 via-navy-deep/20 to-transparent" />

              <div className="absolute top-5 left-5 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-gold anim-breathe" />
                {t("numbers.liveBadge")}
              </div>

              <div className="absolute bottom-0 inset-x-0 p-5 lg:p-6">
                <div className="text-[10px] uppercase tracking-[0.3em] text-gold mb-1">
                  {t("numbers.onGround")}
                </div>
                <div className="text-white font-display font-bold text-xl leading-tight whitespace-pre-line">
                  {t("numbers.personnelLine")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  value, suffix, label, desc, trigger, delay, Icon,
}: {
  value: number; suffix: string; label: string; desc: string;
  trigger: boolean; delay: number; Icon: LucideIcon;
}) {
  const v = useCountUp(value, trigger, 1600 + delay);
  return (
    <div className="relative bg-white p-5 lg:p-6 hover:bg-sand transition-colors group overflow-hidden">
      <div className="absolute top-0 left-0 h-px w-10 bg-gold scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-gold/0 blur-3xl transition-all duration-700 group-hover:bg-gold/15" />
      <div className="flex items-start justify-between mb-3 relative">
        <div className="text-[2rem] lg:text-[2.25rem] leading-none font-display font-extrabold text-navy tracking-tight tabular-nums">
          <span className="text-gradient-gold">
            {Math.floor(v).toLocaleString()}
          </span>
          <span className="text-gold/70 text-[1.5rem] lg:text-[1.75rem] ml-0.5">{suffix}</span>
        </div>
        <div className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-gold/80 group-hover:text-navy group-hover:bg-gold group-hover:border-gold transition-all duration-500 group-hover:rotate-[-6deg]">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-sm font-semibold text-navy leading-tight relative">{label}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5 relative">{desc}</div>
    </div>
  );
}
