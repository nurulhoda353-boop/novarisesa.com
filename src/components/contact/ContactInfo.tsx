"use client";

import { Phone, Mail, MapPin, Clock, MessageSquare, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/site/Reveal";

export function ContactInfo() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const channels = [
    {
      icon: Phone,
      label: t("contactPage.info.channels.call.label"),
      value: "+966 55 442 9574",
      sub: t("contactPage.info.channels.call.sub"),
      href: "tel:+966554429574",
    },
    {
      icon: Mail,
      label: t("contactPage.info.channels.email.label"),
      value: "ceo@novarisebd.com",
      sub: t("contactPage.info.channels.email.sub"),
      href: "mailto:ceo@novarisebd.com",
    },
    {
      icon: MessageSquare,
      label: t("contactPage.info.channels.whatsapp.label"),
      value: "+966 55 442 9574",
      sub: t("contactPage.info.channels.whatsapp.sub"),
      href: "https://wa.me/966554429574",
    },
    {
      icon: MapPin,
      label: t("contactPage.info.channels.office.label"),
      value: t("contactPage.info.channels.office.value"),
      sub: t("contactPage.info.channels.office.sub"),
      arabic: "كفتيريا طاهي القمة، 2124 طريق الملك فيصل، حي البطحاء، أملج 48313، المملكة العربية السعودية",
      href: "#map",
    },
  ];

  return (
    <div className="space-y-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-navy to-navy-deep p-7 text-white shadow-elegant">
          <div className="pointer-events-none absolute -top-20 -right-20 h-52 w-52 rounded-full bg-gold/20 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-gold anim-breathe" />
              {t("contactPage.info.liveNow")}
            </div>
            <h3 className="mt-4 text-xl font-display font-semibold leading-snug whitespace-pre-line">
              {t("contactPage.info.headline")}
            </h3>
            <p className="mt-2 text-sm text-white/65 leading-relaxed">
              {t("contactPage.info.sub")}
            </p>
            <div className="mt-5 flex items-center gap-3 text-sm text-white/85">
              <Clock className="h-4 w-4 text-gold" strokeWidth={1.8} />
              {t("contactPage.info.responseTime")}
            </div>
          </div>
        </div>
      </Reveal>

      <StaggerGroup className="space-y-3" stagger={0.05}>
        {channels.map((c) => (
          <StaggerItem key={c.label}>
            <a
              href={c.href}
              target={c.href.startsWith("http") ? "_blank" : undefined}
              rel={c.href.startsWith("http") ? "noreferrer noopener" : undefined}
              className="group relative flex items-center gap-4 bg-card border border-border rounded-xl px-5 py-4 hover:border-gold hover:shadow-card hover:-translate-y-0.5 transition-all duration-500 overflow-hidden"
            >
              <span className="absolute left-0 top-0 h-full w-0.5 bg-gold scale-y-0 group-hover:scale-y-100 origin-top transition-transform duration-500" />

              <span className="h-11 w-11 rounded-xl bg-gold/10 group-hover:bg-gold flex items-center justify-center shrink-0 transition-all duration-500 group-hover:rotate-[-6deg]">
                <c.icon className="h-5 w-5 text-gold group-hover:text-navy transition-colors" strokeWidth={1.7} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-muted-foreground">{c.label}</div>
                <div className="text-[15px] font-display font-bold text-navy mt-0.5 break-words leading-snug" dir="ltr">{c.value}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{c.sub}</div>
                {c.arabic && isRtl && (
                  <div dir="rtl" lang="ar" className="text-[12px] text-navy/80 mt-2 pt-2 border-t border-border/60 font-medium leading-relaxed text-right">
                    {c.arabic}
                  </div>
                )}
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-gold group-hover:rotate-45 transition-all duration-500 shrink-0" />
            </a>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </div>
  );
}
