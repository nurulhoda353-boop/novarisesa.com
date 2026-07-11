"use client";

import Image from "next/image";

import { Building2, Zap, Truck, HardHat, Cpu, Package, ArrowUpRight, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/site/Reveal";
const imgCivil = "/assets/project-civil.jpg";
const imgPower = "/assets/project-power.jpg";
const imgRental = "/assets/project-equipment.jpg";
const imgManpower = "/assets/manpower.jpg";
const imgIT = "/assets/vision-team.jpg";
const imgTrading = "/assets/industry-oilgas.jpg";

type Card = { id: string; num: string; icon: LucideIcon; image: string; titleFallback: string; shortFallback: string };

export const services: Card[] = [
  { id: "civil", num: "01", icon: Building2, image: imgCivil, titleFallback: "Civil Construction", shortFallback: "Foundations, structural works and site development for refineries, petrochemical plants and large-scale industrial megaprojects across the Kingdom — delivered to Aramco and SABIC standards." },
  { id: "power", num: "02", icon: Zap, image: imgPower, titleFallback: "Power Plants", shortFallback: "End-to-end EPC support for power generation, substations, transmission lines and high-voltage cabling — engineered for utilities, IPPs and heavy industrial facilities." },
  { id: "rental", num: "03", icon: Truck, image: imgRental, titleFallback: "Heavy Equipment Rental", shortFallback: "Owned fleet of cranes up to 250T, manlifts, telehandlers, generators and earth-moving machinery — available bare or with certified operators on long and short-term contracts." },
  { id: "manpower", num: "04", icon: HardHat, image: imgManpower, titleFallback: "Manpower Supply", shortFallback: "2,500+ Aramco-grade certified tradesmen on standby — welders, riggers, scaffolders, electricians and supervisors — mobilized within days for shutdowns and turnarounds." },
  { id: "it", num: "05", icon: Cpu, image: imgIT, titleFallback: "IT Solutions", shortFallback: "Industrial IT infrastructure, automation, SCADA integration, networking and site connectivity for plants, camps and remote project locations across Saudi Arabia." },
  { id: "trading", num: "06", icon: Package, image: imgTrading, titleFallback: "Materials Trading", shortFallback: "Reliable sourcing and supply of structural steel, cement, MEP materials, safety equipment and consumables — backed by vetted vendors and on-time logistics." },
];

export function ServicesOverview() {
  const { t } = useTranslation();
  return (
    <section className="relative py-16 lg:py-24 bg-white overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -right-40 h-[480px] w-[480px] rounded-full bg-gold/10 blur-[140px] anim-breathe" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full bg-navy/5 blur-[140px] anim-drift" />

      <div className="container-wide relative">
        <Reveal className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
            <span className="h-px w-8 bg-gold" />
            {t("servicesPage.overview.eyebrow")}
            <span className="h-px w-8 bg-gold" />
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.1]">
            {t("servicesPage.overview.titleA")}<br />
            <span className="text-muted-foreground">{t("servicesPage.overview.titleB")}</span>
          </h2>
        </Reveal>

        <StaggerGroup className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7" stagger={0.07}>
          {services.map((s) => {
            const title = t(`serviceDetails.${s.id}.title`, { defaultValue: s.titleFallback });
            const short = t(`serviceDetails.${s.id}.lead`, { defaultValue: s.shortFallback });
            return (
              <StaggerItem key={s.id}>
                <article className="group relative h-full bg-card border border-border rounded-2xl overflow-hidden shadow-card hover:shadow-elegant hover:-translate-y-1.5 hover:border-gold/60 transition-all duration-700 flex flex-col">
                  <div className="relative h-56 overflow-hidden">
                    <Image
                      src={s.image}
                      alt={`${title} — NOVARISE`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.08]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/90 via-navy/40 to-navy/10" />
                    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-tr from-transparent via-gold/10 to-gold/30 transition-opacity duration-700" />

                    <div className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-navy/70 backdrop-blur-md px-3 py-1.5 shadow-md">
                      <span className="text-[10px] font-mono text-gold tracking-[0.2em]">{s.num}</span>
                      <span className="h-1 w-1 rounded-full bg-gold" />
                      <span className="text-[10px] uppercase tracking-[0.25em] text-white">{t("servicesPage.overview.serviceLabel")}</span>
                    </div>

                    <div className="absolute top-4 right-4 h-10 w-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:bg-gold group-hover:border-gold transition-all duration-500">
                      <s.icon className="h-4 w-4 text-gold group-hover:text-navy transition-colors" strokeWidth={1.8} />
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <h3 className="text-xl lg:text-2xl font-display font-bold text-white leading-tight drop-shadow-md">
                        {title}
                      </h3>
                      <div className="mt-2 h-px w-10 bg-gold transition-all duration-500 group-hover:w-24" />
                    </div>
                  </div>

                  <div className="relative p-5 lg:p-6 flex flex-col flex-1">
                    <p className="text-[13.5px] text-muted-foreground leading-relaxed">{short}</p>

                    <a
                      href={`/services/${s.id}`}
                      className="group/btn mt-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-navy hover:text-gold transition-colors self-start"
                    >
                      <span>{t("servicesPage.overview.learnMore")}</span>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold text-gold-foreground transition-transform duration-300 group-hover/btn:translate-x-0.5 group-hover/btn:rotate-45">
                        <ArrowUpRight className="h-3 w-3" strokeWidth={2.4} />
                      </span>
                    </a>
                  </div>
                </article>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </div>
    </section>
  );
}
