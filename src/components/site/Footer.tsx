"use client";

import Image from "next/image";
import { Link } from "@/components/nav/AppLink";
import { useTranslation } from "react-i18next";
import { Mail, Phone, MapPin, Facebook, Linkedin, Twitter, Instagram, ArrowUpRight } from "lucide-react";
const logo = "/assets/logo-white-full.png";

const linkBase =
  "inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-gold transition-colors";
const activeProps = {
  className: "inline-flex items-center gap-1.5 text-sm text-gold font-semibold",
};

export function Footer() {
  const { t } = useTranslation();

  const company: { key: keyof typeof companyLabels; to: string }[] = [
    { key: "about", to: "/about" },
    { key: "capabilities", to: "/capabilities" },
    { key: "requirements", to: "/requirements" },
    { key: "blog", to: "/blog" },
    { key: "careers", to: "/careers" },
    { key: "contact", to: "/contact" },
    { key: "rfq", to: "/rfq" },
  ];
  const companyLabels = {
    about: t("footer.links.about"),
    capabilities: t("footer.links.capabilities"),
    requirements: t("footer.links.requirements"),
    blog: t("footer.links.blog"),
    careers: t("footer.links.careers"),
    contact: t("footer.links.contact"),
    rfq: t("footer.links.rfq"),
  };

  const services: { key: string; to: string }[] = [
    { key: "civil", to: "/services/civil" },
    { key: "power", to: "/services/power" },
    { key: "rental", to: "/services/rental" },
    { key: "manpower", to: "/services/manpower" },
    { key: "it", to: "/services/it" },
    { key: "trading", to: "/services/trading" },
  ];

  return (
    <footer className="relative dark-premium text-white overflow-hidden">
      <div className="gold-divider" />
      <div className="h-1 bg-navy" />

      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-40 -left-20 h-[420px] w-[420px] rounded-full bg-gold/10 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 h-[420px] w-[420px] rounded-full bg-navy/40 blur-[140px]" />

      <div className="relative container-wide pt-12 pb-8 lg:pt-16">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 pb-10 lg:pb-14 border-b border-white/10">
          {/* Brand */}
          <div className="lg:col-span-4">
            <Link to="/" aria-label="NOVARISE — Home" className="inline-block mb-5">
              <span className="relative block h-12 lg:h-14 w-44">
                <Image
                  src={logo}
                  alt="NOVARISE Trading and Contracting Company"
                  fill
                  sizes="176px"
                  className="object-contain object-left"
                />
              </span>
            </Link>
            <p className="text-white/70 text-sm leading-relaxed max-w-sm">
              {t("footer.tagline")}
            </p>
            <a
              href="/company-profile.pdf"
              target="_blank"
              rel="noopener"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-gold/50 bg-gold/10 px-4 py-2 text-xs font-semibold text-gold hover:bg-gold hover:text-navy-deep transition-colors"
            >
              {t("footer.downloadProfile")}
            </a>
            <div className="flex items-center gap-3 mt-6">
              {[Facebook, Twitter, Linkedin, Instagram].map((Icon, i) => (
                <span
                  key={i}
                  className="h-10 w-10 rounded-full border border-white/15 flex items-center justify-center text-white/50"
                  aria-hidden="true"
                >
                  <Icon className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>

          {/* Links: two columns on mobile, original layout on desktop */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-8 lg:contents">
            <div className="lg:col-span-2">
              <h4 className="text-xs uppercase tracking-[0.2em] text-gold mb-4 lg:mb-5">{t("footer.company")}</h4>
              <ul className="space-y-3">
                {company.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className={linkBase} activeProps={activeProps} activeOptions={{ exact: true }}>
                      {companyLabels[l.key]}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-3">
              <h4 className="text-xs uppercase tracking-[0.2em] text-gold mb-4 lg:mb-5">{t("footer.servicesHeading")}</h4>
              <ul className="space-y-3">
                <li>
                  <Link to="/services" className={linkBase} activeProps={activeProps} activeOptions={{ exact: true }}>
                    {t("footer.allServices")} <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </li>
                {services.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className={linkBase} activeProps={activeProps}>
                      {t(`services.${l.key}.label`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Get in touch */}
          <div className="lg:col-span-3">
            <h4 className="text-xs uppercase tracking-[0.2em] text-gold mb-4 lg:mb-5">{t("footer.getInTouch")}</h4>
            <ul className="space-y-4 text-sm text-white/80">
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-0.5 text-gold shrink-0" />
                <span>
                  {t("footer.addressLine1")}<br />
                  {t("footer.addressLine2")}
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=2124+King+Faisal+Rd+Al+Bathaa+Umluj+48313"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 block text-[10px] uppercase tracking-[0.2em] text-gold hover:text-white transition-colors"
                  >
                    {t("footer.viewMap")}
                  </a>
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gold shrink-0" />
                <a href="tel:+966554429574" className="hover:text-gold transition" dir="ltr">+966 55 442 9574</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gold shrink-0" />
                <a href="mailto:ceo@novarisebd.com" className="hover:text-gold transition" dir="ltr">ceo@novarisebd.com</a>
              </li>
              <li className="mt-2 pt-4 border-t border-white/10">
                <div className="text-[10px] uppercase tracking-[0.28em] text-gold mb-2">{t("footer.officeHours")}</div>
                <div className="flex items-center justify-between text-xs text-white/75">
                  <span>{t("footer.sunThu")}</span>
                  <span className="tabular-nums text-white" dir="ltr">{t("footer.sunThuHours")}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-white/55 mt-1.5">
                  <span>{t("footer.friSat")}</span>
                  <span>{t("footer.byAppointment")}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 lg:pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-white/50">
          <p>{t("footer.copyright", { year: 2026 })}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>{t("footer.crLabel")} <span className="text-white/80 tabular-nums" dir="ltr">4701103544</span></span>
            <span>{t("footer.vatLabel")} <span className="text-white/80 tabular-nums" dir="ltr">300930779500003</span></span>
            <span>{t("footer.estLabel")} <span className="text-white/80" dir="ltr">2019</span></span>
          </div>
        </div>

        {/* Giant brand wordmark */}
        <div
          aria-hidden
          className="relative mt-10 lg:mt-14 select-none overflow-hidden"
          style={{ maskImage: "linear-gradient(to bottom, white 20%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, white 20%, transparent 100%)" }}
        >
          <div
            className="font-display font-black tracking-[-0.04em] leading-[0.8] text-transparent bg-clip-text"
            style={{
              fontSize: "clamp(4rem, 18vw, 16rem)",
              backgroundImage: "linear-gradient(180deg, oklch(0.755 0.135 75 / 0.35), oklch(0.755 0.135 75 / 0.03))",
              WebkitTextStroke: "1px oklch(0.755 0.135 75 / 0.18)",
            }}
          >
            NOVARISE
          </div>
        </div>
      </div>
    </footer>
  );
}
