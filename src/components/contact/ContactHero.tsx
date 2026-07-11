"use client";

import { MessageSquare, Phone, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
const heroImg = "/assets/cta-meeting.jpg";
import { PageHero } from "@/components/site/PageHero";

export function ContactHero() {
  const { t } = useTranslation();
  return (
    <PageHero
      num="05"
      eyebrow={t("contactPage.hero.eyebrow")}
      icon={MessageSquare}
      heroImage={heroImg}
      title={t("contactPage.hero.title")}
      description={t("contactPage.hero.description")}
      crumbs={[{ label: t("contactPage.hero.crumb") }]}
      ctas={[
        { label: "+966 55 442 9574", href: "tel:+966554429574", variant: "primary", icon: Phone },
        { label: "ceo@novarisebd.com", href: "mailto:ceo@novarisebd.com", variant: "ghost", icon: Mail },
      ]}
    />
  );
}
