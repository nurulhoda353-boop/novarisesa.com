"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { useCmsAsset } from "@/lib/cms-content";
import { Link } from "@/components/nav/AppLink";
import { ArrowUpRight, Download, Phone, Mail, MapPin, type LucideIcon } from "lucide-react";
import { Reveal } from "./Reveal";
const meetingImg = "/assets/cta-meeting.jpg";

export function CTA() {
  const managedMeetingImg = useCmsAsset("global.cta", meetingImg);
  const { t } = useTranslation();
  return (
    <section id="contact" className="relative py-16 lg:py-24 bg-background overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-8 lg:-bottom-14 left-0 right-0 overflow-hidden select-none"
      >
        <div className="container-wide">
          <span className="section-num block text-[22vw] lg:text-[15vw] leading-[0.85] opacity-[0.10] whitespace-nowrap" data-cms-field="cta.letsBuild">
            {t("cta.letsBuild")}
          </span>
        </div>
      </div>

      <div className="container-wide relative">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <Reveal className="lg:col-span-5">
            <div className="relative">
              <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-elegant" data-cms-asset="global.cta">
                <Image
                  src={managedMeetingImg}
                  alt="NOVARISE leadership reviewing project blueprints"
                  fill
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 hidden md:block bg-card border border-border rounded-2xl shadow-elegant px-6 py-5 max-w-[230px]">
                <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground" data-cms-field="cta.saudiCr">{t("cta.saudiCr")}</div>
                <div className="text-xl font-extrabold text-navy mt-1 tabular-nums" dir="ltr">4701103544</div>
                <div className="text-xs text-muted-foreground mt-1" data-cms-field="cta.crStatus">{t("cta.crStatus")}</div>
              </div>
              <div className="absolute -top-5 -left-5 hidden md:flex items-center gap-2 rounded-full bg-navy text-white px-4 py-2 text-[11px] uppercase tracking-[0.25em] shadow-elegant">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                <span data-cms-field="cta.available" suppressContentEditableWarning>{t("cta.available")}</span>
              </div>
            </div>
          </Reveal>

          <Reveal className="lg:col-span-7" delay={0.15}>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold mb-5">
              <span className="h-px w-8 bg-gold" />
              <span data-cms-field="cta.eyebrow" suppressContentEditableWarning>{t("cta.eyebrow")}</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.02]">
              <span data-cms-field="cta.titleA" suppressContentEditableWarning>{t("cta.titleA")}</span><br />
              <span data-cms-field="cta.titleB" suppressContentEditableWarning>{t("cta.titleB")}</span>{" "}
              <span className="text-gradient-gold" data-cms-field="cta.titleAccent" suppressContentEditableWarning>{t("cta.titleAccent")}</span>
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed" data-cms-field="cta.desc">
              {t("cta.desc")}
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/rfq"
                className="group inline-flex items-center gap-3 rounded-full bg-navy px-7 py-4 text-sm font-semibold text-white shadow-elegant transition-all hover:bg-navy-deep hover:scale-[1.02]"
              >
                <span data-cms-field="cta.submitRfq" suppressContentEditableWarning>{t("cta.submitRfq")}</span>
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:rotate-45" />
              </Link>
              <a
                href="/company-profile.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 rounded-full border border-navy/15 bg-card px-7 py-4 text-sm font-semibold text-navy hover:border-gold hover:text-gold transition-all"
              >
                <Download className="h-4 w-4" />
                <span data-cms-field="cta.capability" suppressContentEditableWarning>{t("cta.capability")}</span>
              </a>
            </div>

            <div className="mt-10 grid sm:grid-cols-2 xl:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden border border-border">
              <ContactRow icon={Phone} label={t("cta.contact.call")} labelField="cta.contact.call" value="+966 55 442 9574" href="tel:+966554429574" ltr />
              <ContactRow icon={Mail} label={t("cta.contact.email")} labelField="cta.contact.email" value="info@novarisesa.com" href="mailto:info@novarisesa.com" ltr />
              <ContactRow icon={MapPin} label={t("cta.contact.headOffice")} labelField="cta.contact.headOffice" value={t("cta.contact.headOfficeValue")} valueField="cta.contact.headOfficeValue" href="https://www.google.com/maps/search/?api=1&query=6563+King+Faisal+Rd+2124+Al+Bathaa+District+Umluj+48313" />
              <ContactRow icon={MapPin} label={t("cta.contact.branchOffice")} labelField="cta.contact.branchOffice" value={t("cta.contact.branchOfficeValue")} valueField="cta.contact.branchOfficeValue" href="https://www.google.com/maps/search/?api=1&query=4342+8805+Jubail+City+Center+Al+Jubayl+35514" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function ContactRow({ icon: Icon, label, labelField, value, valueField, href, ltr }: { icon: LucideIcon; label: string; labelField: string; value: string; valueField?: string; href: string; ltr?: boolean }) {
  return (
    <a href={href} className="group flex items-center gap-3 bg-card hover:bg-navy hover:text-white px-5 py-5 transition-colors">
      <div className="h-10 w-10 rounded-full bg-gold/15 group-hover:bg-gold flex items-center justify-center transition-colors">
        <Icon className="h-4 w-4 text-gold group-hover:text-navy" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground group-hover:text-white/60" data-cms-field={labelField}>{label}</div>
        <div className="text-sm font-semibold text-navy group-hover:text-gold break-words" dir={ltr ? "ltr" : undefined} data-cms-field={valueField}>{value}</div>
      </div>
    </a>
  );
}
