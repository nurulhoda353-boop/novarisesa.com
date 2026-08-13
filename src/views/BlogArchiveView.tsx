"use client";

import { BookOpen, CalendarDays } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { PageHero } from "@/components/site/PageHero";
import { FeaturedPost } from "@/components/blog/FeaturedPost";
import { BlogGrid } from "@/components/blog/BlogGrid";
import { NewsletterCTA } from "@/components/blog/NewsletterCTA";

export function BlogArchiveView() {
  return <div className="min-h-screen bg-background"><Header /><main>
    <PageHero num="04" eyebrow="NOVARISE Journal" icon={BookOpen} heroImage="/assets/news-energy.jpg" title="Insights from the industrial frontline." description="Long-form thinking, field-tested playbooks and project stories for the people delivering Saudi Arabia's next chapter." crumbs={[{ label: "Insights", to: "/insights" }, { label: "Blog" }]} ctas={[{ label: "Latest article", href: "#latest", variant: "primary", icon: BookOpen }, { label: "Explore events", href: "/events", variant: "ghost", icon: CalendarDays }]} />
    <FeaturedPost />
    <BlogGrid />
    <NewsletterCTA />
  </main><Footer /></div>;
}
