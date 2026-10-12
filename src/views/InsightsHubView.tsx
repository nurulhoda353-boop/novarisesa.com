"use client";

import { ArrowUpRight, BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BlogHero } from "@/components/blog/BlogHero";
import { FeaturedPost } from "@/components/blog/FeaturedPost";
import { BlogCard } from "@/components/blog/BlogCard";
import { EventsSection } from "@/components/blog/EventsSection";
import { NewsletterCTA } from "@/components/blog/NewsletterCTA";
import { Link } from "@/components/nav/AppLink";
import { useTranslatedPosts } from "@/i18n/use-translated-blog";

export function InsightsHubView() {
  const { t } = useTranslation();
  const { posts } = useTranslatedPosts();
  return <div className="min-h-screen bg-background"><Header /><main>
    <BlogHero />
    <FeaturedPost />
    <section className="bg-sand-soft py-16 lg:py-20"><div className="container-wide">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><div className="eyebrow mb-3"><BookOpen className="mr-2 inline h-4 w-4" /><span data-cms-field="insightsHub.eyebrow" suppressContentEditableWarning>{t("insightsHub.eyebrow")}</span></div><h2 className="text-3xl font-bold text-navy md:text-4xl" data-cms-field="insightsHub.title" suppressContentEditableWarning>{t("insightsHub.title")}</h2></div><Link to="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-gold"><span data-cms-field="insightsHub.exploreAll" suppressContentEditableWarning>{t("insightsHub.exploreAll")}</span> <ArrowUpRight className="h-4 w-4" /></Link></div>
      <div className="grid gap-6 md:grid-cols-3">{posts.slice(0, 3).map((post) => <BlogCard key={post.slug} post={post} />)}</div>
    </div></section>
    <EventsSection />
    <NewsletterCTA />
  </main><Footer /></div>;
}
