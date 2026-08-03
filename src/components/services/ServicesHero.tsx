"use client";

import { Briefcase, ArrowUpRight, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCmsAsset } from "@/lib/cms-content";
const heroImg = "/assets/capabilities-hero.jpg";
import { PageHero } from "@/components/site/PageHero";

export function ServicesHero() {
  const managedHeroImg = useCmsAsset("services.hero", heroImg);
  const { t } = useTranslation();
  return (
    <PageHero
      num="01"
      eyebrow={t("servicesPage.hero.eyebrow")}
      eyebrowField="servicesPage.hero.eyebrow"
      icon={Briefcase}
      heroImage={managedHeroImg}
      assetKey="services.hero"
      title={t("servicesPage.hero.title")}
      titleField="servicesPage.hero.title"
      description={t("servicesPage.hero.description")}
      descriptionField="servicesPage.hero.description"
      crumbs={[{ label: t("servicesPage.hero.crumb") }]}
      ctas={[
        { label: t("servicesPage.hero.ctaQuote"), to: "/rfq", variant: "primary", icon: ArrowUpRight },
        { label: t("servicesPage.hero.ctaSales"), to: "/contact", variant: "ghost", icon: Phone },
      ]}
    />
  );
}
