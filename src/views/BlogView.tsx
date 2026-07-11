"use client";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BlogHero } from "@/components/blog/BlogHero";
import { FeaturedPost } from "@/components/blog/FeaturedPost";
import { BlogGrid } from "@/components/blog/BlogGrid";
import { EventsSection } from "@/components/blog/EventsSection";
import { NewsletterCTA } from "@/components/blog/NewsletterCTA";

export function BlogView() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero (dark) → 2 light (middle brighter) → dark → light */}
        <BlogHero />
        <FeaturedPost />
        <div className="section-bright"><BlogGrid /></div>
        <EventsSection />
        <NewsletterCTA />
      </main>
      <Footer />
    </div>
  );
}
