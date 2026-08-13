"use client";

import { ArrowUpRight, BookOpen, CalendarDays } from "lucide-react";
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
  const { posts } = useTranslatedPosts();
  return <div className="min-h-screen bg-background"><Header /><main>
    <BlogHero />
    <FeaturedPost />
    <section className="bg-sand-soft py-20 lg:py-24"><div className="container-wide">
      <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><div className="eyebrow mb-3"><BookOpen className="mr-2 inline h-4 w-4" />From the journal</div><h2 className="text-3xl font-bold text-navy md:text-4xl">Latest articles</h2></div><Link to="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-gold">Explore all articles <ArrowUpRight className="h-4 w-4" /></Link></div>
      <div className="grid gap-7 md:grid-cols-3">{posts.slice(0, 3).map((post) => <BlogCard key={post.slug} post={post} />)}</div>
    </div></section>
    <EventsSection />
    <section className="bg-background py-12"><div className="container-wide flex flex-col items-center justify-between gap-5 rounded-3xl border border-border bg-card p-7 text-center md:flex-row md:text-left"><div><span className="text-xs font-bold uppercase tracking-[0.25em] text-gold"><CalendarDays className="mr-2 inline h-4 w-4" />Complete event archive</span><p className="mt-2 text-lg font-semibold text-navy">Browse upcoming engagements and previous event stories.</p></div><Link to="/events" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white">Explore all events <ArrowUpRight className="h-4 w-4 text-gold" /></Link></div></section>
    <NewsletterCTA />
  </main><Footer /></div>;
}
