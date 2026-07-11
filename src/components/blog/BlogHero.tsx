"use client";

import { BookOpen, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
const heroImg = "/assets/vision-team.jpg";
import { PageHero } from "@/components/site/PageHero";

export function BlogHero() {
  const { t } = useTranslation();
  return (
    <PageHero
      num="04"
      eyebrow={t("blogPage.hero.eyebrow")}
      icon={BookOpen}
      heroImage={heroImg}
      title={t("blogPage.hero.title")}
      description={t("blogPage.hero.description")}
      crumbs={[{ label: t("blogPage.hero.crumb") }]}
      ctas={[
        { label: t("blogPage.hero.ctaPrimary"), href: "#latest", variant: "primary", icon: BookOpen },
        { label: t("blogPage.hero.ctaSecondary"), href: "#events", variant: "ghost", icon: Calendar },
      ]}
    />
  );
}
