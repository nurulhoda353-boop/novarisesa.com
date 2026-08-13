"use client";

import { BookOpen, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCmsAsset } from "@/lib/cms-content";
const heroImg = "/assets/vision-team.jpg";
import { PageHero } from "@/components/site/PageHero";

export function BlogHero() {
  const managedHeroImg = useCmsAsset("blog.hero", heroImg);
  const { t } = useTranslation();
  return (
    <PageHero
      num="04"
      eyebrow={t("blogPage.hero.eyebrow")}
      eyebrowField="blogPage.hero.eyebrow"
      icon={BookOpen}
      heroImage={managedHeroImg}
      assetKey="blog.hero"
      title="Insights & Events"
      titleField="blogPage.hero.title"
      description="Field-tested perspectives on megaproject delivery and the industry engagements where our team shares what works."
      descriptionField="blogPage.hero.description"
      crumbs={[{ label: "Insights & Events" }]}
      ctas={[
        { label: "Read latest", href: "#latest", variant: "primary", icon: BookOpen },
        { label: "Explore events", href: "#events", variant: "ghost", icon: Calendar },
      ]}
    />
  );
}
