"use client";

import Image from "next/image";
import { Link } from "@/components/nav/AppLink";
import { useTranslation } from "react-i18next";
import { Mail, Phone, MapPin, ArrowUpRight } from "lucide-react";
import { useCmsAsset, useCmsNavigation } from "@/lib/cms-content";

const logo = "/assets/logo-white-full.png";

const linkBase = "group inline-flex items-center gap-1.5 text-sm leading-6 text-white/65 transition-colors hover:text-gold";
const activeProps = { className: "group inline-flex items-center gap-1.5 text-sm leading-6 text-gold font-semibold" };

export function Footer() {
  const { t } = useTranslation();
  const managedLogo = useCmsAsset("brand.logoWhite", logo);
  const managedFooter = useCmsNavigation("footer");
  const company = managedFooter.length
    ? managedFooter.map((item) => ({ label: item.label, to: item.url }))
    : [
        { label: t("footer.links.about"), to: "/about" },
        { label: t("footer.links.capabilities"), to: "/capabilities" },
        { label: t("footer.links.requirements"), to: "/requirements" },
        { label: t("footer.links.blog"), to: "/insights" },
        { label: t("footer.links.careers"), to: "/careers" },
        { label: t("footer.links.contact"), to: "/contact" },
        { label: t("footer.links.rfq"), to: "/rfq" },
      ];
  const services = [
    { key: "civil", to: "/services/civil" },
    { key: "power", to: "/services/power" },
    { key: "rental", to: "/services/rental" },
    { key: "manpower", to: "/services/manpower" },
    { key: "it", to: "/services/it" },
    { key: "trading", to: "/services/trading" },
  ];
  const offices = [
    { id: "headOffice", href: "https://www.google.com/maps/search/?api=1&query=6563+King+Faisal+Rd+2124+Al+Bathaa+District+Umluj+48313" },
    { id: "branchOffice", href: "https://www.google.com/maps/search/?api=1&query=4342+8805+Jubail+City+Center+Al+Jubail+35514" },
  ];

  return (
    <footer className="footer-premium relative overflow-hidden text-white">
      <div className="gold-divider" />
      <div className="relative container-wide py-10 lg:py-12">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr_1.1fr] lg:gap-12">
          <section className="max-w-sm">
            <Link to="/" aria-label="NOVARISE home" className="inline-block">
              <span className="relative block h-12 w-48" data-cms-asset="brand.logoWhite">
                <Image src={managedLogo} alt="NOVARISE Trading and Contracting Company" fill sizes="192px" className="object-contain object-left" />
              </span>
            </Link>
            <div className="mt-6 h-px w-10 bg-gold/70" />
            <p className="mt-4 text-sm leading-6 text-white/65" data-cms-field="footer.tagline">{t("footer.tagline")}</p>
            <a
              href="/company-profile.pdf"
              target="_blank"
              rel="noopener"
              className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-gold transition-colors hover:text-white"
            >
              <span data-cms-field="footer.downloadProfile" suppressContentEditableWarning>{t("footer.downloadProfile")}</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </section>

          <section className="grid grid-cols-2 gap-8 border-t border-white/10 pt-8 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
            <div>
              <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-gold" data-cms-field="footer.company">{t("footer.company")}</h2>
              <ul className="space-y-1.5">
                {company.map((item) => (
                  <li key={item.to}><Link to={item.to} className={linkBase} activeProps={activeProps} activeOptions={{ exact: true }}>{item.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-gold" data-cms-field="footer.servicesHeading">{t("footer.servicesHeading")}</h2>
              <ul className="space-y-1.5">
                <li><Link to="/services" className={linkBase} activeProps={activeProps} activeOptions={{ exact: true }}><span data-cms-field="footer.allServices" suppressContentEditableWarning>{t("footer.allServices")}</span><ArrowUpRight className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link></li>
                {services.map((item) => (
                  <li key={item.to}><Link to={item.to} className={linkBase} activeProps={activeProps}><span data-cms-field={`services.${item.key}.label`} suppressContentEditableWarning>{t(`services.${item.key}.label`)}</span></Link></li>
                ))}
              </ul>
            </div>
          </section>

          <section className="border-t border-white/10 pt-8 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
            <h2 className="mb-5 text-[10px] font-bold uppercase tracking-[0.24em] text-gold" data-cms-field="footer.getInTouch">{t("footer.getInTouch")}</h2>
            <div className="space-y-4">
              {offices.map((office) => (
                <div className="flex items-start gap-3" key={office.id}>
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <div className="min-w-0 text-sm leading-5 text-white/70">
                    <strong className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gold" data-cms-field={`footer.${office.id}.label`} suppressContentEditableWarning>{t(`footer.${office.id}.label`)}</strong>
                    <span data-cms-field={`footer.${office.id}.address`} suppressContentEditableWarning>{t(`footer.${office.id}.address`)}</span>
                    <a href={office.href} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-block text-[10px] font-semibold uppercase tracking-[0.18em] text-gold transition-colors hover:text-white"><span data-cms-field="footer.viewMap" suppressContentEditableWarning>{t("footer.viewMap")}</span></a>
                  </div>
                </div>
              ))}
              <div className="grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2 lg:grid-cols-1">
                <a href="tel:+966554429574" className="inline-flex items-center gap-3 text-sm text-white/70 transition-colors hover:text-gold" dir="ltr"><Phone className="h-4 w-4 shrink-0 text-gold" />+966 55 442 9574</a>
                <a href="mailto:info@novarisesa.com" className="inline-flex items-center gap-3 text-sm text-white/70 transition-colors hover:text-gold" dir="ltr"><Mail className="h-4 w-4 shrink-0 text-gold" />info@novarisesa.com</a>
              </div>
              <div className="border-t border-white/10 pt-4">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-gold" data-cms-field="footer.officeHours">{t("footer.officeHours")}</div>
                <div className="grid grid-cols-[1fr_auto] gap-y-1.5 text-xs text-white/55"><span data-cms-field="footer.sunThu">{t("footer.sunThu")}</span><span className="text-white/80" dir="ltr" data-cms-field="footer.sunThuHours">{t("footer.sunThuHours")}</span><span data-cms-field="footer.friSat">{t("footer.friSat")}</span><span data-cms-field="footer.byAppointment">{t("footer.byAppointment")}</span></div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-5 text-[11px] text-white/45 md:flex-row md:items-center md:justify-between">
          <p>{t("footer.copyright", { year: 2026 })}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <span><span data-cms-field="footer.crLabel">{t("footer.crLabel")}</span> <span className="text-white/65" dir="ltr">4701103544</span></span>
            <span><span data-cms-field="footer.vatLabel">{t("footer.vatLabel")}</span> <span className="text-white/65" dir="ltr">300930779500003</span></span>
            <span><span data-cms-field="footer.estLabel">{t("footer.estLabel")}</span> <span className="text-white/65" dir="ltr">2019</span></span>
          </div>
        </div>
      </div>
    </footer>
  );
}
