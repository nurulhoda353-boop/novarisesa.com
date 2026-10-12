"use client";

import { BookOpen, CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { PageHero } from "@/components/site/PageHero";
import { FeaturedPost } from "@/components/blog/FeaturedPost";
import { BlogGrid } from "@/components/blog/BlogGrid";
import { NewsletterCTA } from "@/components/blog/NewsletterCTA";
import { ContentFaq } from "@/components/blog/ContentFaq";

export function BlogArchiveView() {
  const { t } = useTranslation();
  return <div className="min-h-screen bg-background"><Header /><main>
    <PageHero
      num="04"
      eyebrow={t("blogArchivePage.hero.eyebrow")}
      eyebrowField="blogArchivePage.hero.eyebrow"
      icon={BookOpen}
      heroImage="/assets/news-energy.jpg"
      title={t("blogArchivePage.hero.title")}
      titleField="blogArchivePage.hero.title"
      description={t("blogArchivePage.hero.description")}
      descriptionField="blogArchivePage.hero.description"
      crumbs={[
        { label: t("blogArchivePage.hero.crumbInsights"), to: "/insights", field: "blogArchivePage.hero.crumbInsights" },
        { label: t("blogArchivePage.hero.crumbBlog"), field: "blogArchivePage.hero.crumbBlog" },
      ]}
      ctas={[
        { label: t("blogArchivePage.hero.ctaLatest"), href: "#latest", variant: "primary", icon: BookOpen },
        { label: t("blogArchivePage.hero.ctaEvents"), href: "/events", variant: "ghost", icon: CalendarDays },
      ]}
    />
    <FeaturedPost />
    <BlogGrid />
    <ContentFaq
      eyebrow={t("blogArchivePage.faq.eyebrow")}
      eyebrowField="blogArchivePage.faq.eyebrow"
      title={t("blogArchivePage.faq.title")}
      titleField="blogArchivePage.faq.title"
      description={t("blogArchivePage.faq.description")}
      descriptionField="blogArchivePage.faq.description"
      fieldPrefix="blogArchivePage.faq"
      items={[
        { question: t("blogArchivePage.faq.items.0.question"), answer: t("blogArchivePage.faq.items.0.answer") },
        { question: t("blogArchivePage.faq.items.1.question"), answer: t("blogArchivePage.faq.items.1.answer") },
        { question: t("blogArchivePage.faq.items.2.question"), answer: t("blogArchivePage.faq.items.2.answer") },
      ]}
    />
    <NewsletterCTA />
  </main><Footer /></div>;
}
