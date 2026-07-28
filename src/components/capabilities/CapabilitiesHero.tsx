"use client";

import { Layers, ArrowUpRight, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCmsAsset } from "@/lib/cms-content";
const heroImg = "/assets/capabilities-hero.jpg";
import { PageHero } from "@/components/site/PageHero";

export function CapabilitiesHero() {
  const managedHeroImg = useCmsAsset("capabilities.hero", heroImg);
  const { t } = useTranslation();
  return (
    <PageHero
      num="03"
      eyebrow={t("capabilitiesPage.hero.eyebrow")}
      icon={Layers}
      heroImage={managedHeroImg}
      title={t("capabilitiesPage.hero.title")}
      description={t("capabilitiesPage.hero.description")}
      crumbs={[{ label: t("capabilitiesPage.hero.crumb") }]}
      ctas={[
        { label: t("capabilitiesPage.hero.ctaPrimary"), to: "/rfq", variant: "primary", icon: ArrowUpRight },
        { label: t("capabilitiesPage.hero.ctaSecondary"), to: "/contact", variant: "ghost", icon: Phone },
      ]}
    />
  );
}
