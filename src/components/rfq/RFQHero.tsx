"use client";

import { FileText, ArrowUpRight, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
const heroImg = "/assets/hero-industrial.jpg";
import { PageHero } from "@/components/site/PageHero";

export function RFQHero() {
  const { t } = useTranslation();
  return (
    <PageHero
      num="06"
      eyebrow={t("rfqPage.hero.eyebrow")}
      icon={FileText}
      heroImage={heroImg}
      title={t("rfqPage.hero.title")}
      description={t("rfqPage.hero.description")}
      crumbs={[{ label: t("rfqPage.hero.crumb") }]}
      ctas={[
        { label: t("rfqPage.hero.ctaPrimary"), href: "#rfq-form", variant: "primary", icon: ArrowUpRight },
        { label: t("rfqPage.hero.ctaSecondary"), to: "/contact", variant: "ghost", icon: Phone },
      ]}
    />
  );
}
