"use client";

import { Info, ArrowUpRight, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCmsAsset } from "@/lib/cms-content";
const heroImg = "/assets/vision-skyline.jpg";
import { PageHero } from "@/components/site/PageHero";

export function AboutHero() {
  const managedHeroImg = useCmsAsset("about.hero", heroImg);
  const { t } = useTranslation();
  return (
    <PageHero
      num={t("aboutPage.hero.num")}
      eyebrow={t("aboutPage.hero.eyebrow")}
      eyebrowField="aboutPage.hero.eyebrow"
      icon={Info}
      heroImage={managedHeroImg}
      assetKey="about.hero"
      title={t("aboutPage.hero.title")}
      titleField="aboutPage.hero.title"
      description={t("aboutPage.hero.description")}
      descriptionField="aboutPage.hero.description"
      crumbs={[{ label: t("aboutPage.hero.crumb") }]}
      ctas={[
        { label: t("aboutPage.hero.ctaProfile"), href: "/company-profile.pdf", variant: "primary", icon: ArrowUpRight },
        { label: t("aboutPage.hero.ctaSales"), to: "/contact", variant: "ghost", icon: Phone },
      ]}
    />
  );
}
