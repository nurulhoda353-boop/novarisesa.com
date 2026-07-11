"use client";

import { Briefcase, ArrowUpRight, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
const heroImg = "/assets/capabilities-hero.jpg";
import { PageHero } from "@/components/site/PageHero";

export function ServicesHero() {
  const { t } = useTranslation();
  return (
    <PageHero
      num="01"
      eyebrow={t("servicesPage.hero.eyebrow")}
      icon={Briefcase}
      heroImage={heroImg}
      title={t("servicesPage.hero.title")}
      description={t("servicesPage.hero.description")}
      crumbs={[{ label: t("servicesPage.hero.crumb") }]}
      ctas={[
        { label: t("servicesPage.hero.ctaQuote"), to: "/rfq", variant: "primary", icon: ArrowUpRight },
        { label: t("servicesPage.hero.ctaSales"), to: "/contact", variant: "ghost", icon: Phone },
      ]}
    />
  );
}
