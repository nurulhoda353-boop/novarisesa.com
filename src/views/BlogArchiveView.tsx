"use client";

import { BookOpen, CalendarDays } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { PageHero } from "@/components/site/PageHero";
import { FeaturedPost } from "@/components/blog/FeaturedPost";
import { BlogGrid } from "@/components/blog/BlogGrid";
import { NewsletterCTA } from "@/components/blog/NewsletterCTA";
import { ContentFaq } from "@/components/blog/ContentFaq";

export function BlogArchiveView() {
  return <div className="min-h-screen bg-background"><Header /><main>
    <PageHero num="04" eyebrow="NOVARISE Journal" icon={BookOpen} heroImage="/assets/news-energy.jpg" title="Insights from the industrial frontline." description="Long-form thinking, field-tested playbooks and project stories for the people delivering Saudi Arabia's next chapter." crumbs={[{ label: "Insights", to: "/insights" }, { label: "Blog" }]} ctas={[{ label: "Latest article", href: "#latest", variant: "primary", icon: BookOpen }, { label: "Explore events", href: "/events", variant: "ghost", icon: CalendarDays }]} />
    <FeaturedPost />
    <BlogGrid />
    <ContentFaq eyebrow="Article help" title="Before you dive in." description="A few useful answers for readers following NOVARISE field insights." items={[
      { question: "How often are new articles published?", answer: "New field notes, case studies and leadership perspectives are published as soon as they are cleared for public release." },
      { question: "Can I share an article with my project team?", answer: "Yes. Each article has a public URL and is designed to be shared with colleagues, clients and delivery partners." },
      { question: "How can I receive new insights?", answer: "Subscribe to the NOVARISE Brief below for selected updates delivered to your work email." },
    ]} />
    <NewsletterCTA />
  </main><Footer /></div>;
}
