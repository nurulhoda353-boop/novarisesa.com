"use client";

import Image from "next/image";
import { ArrowUpRight, Clock } from "lucide-react";
import { Link } from "@/components/nav/AppLink";
import { useTranslatedPosts } from "@/i18n/use-translated-blog";
import { BlogCard } from "@/components/blog/BlogCard";

export function HomeInsights() {
  const { featured, all } = useTranslatedPosts();
  const secondary = all.filter((post) => post.slug !== featured.slug).slice(0, 2);
  return (
    <section className="relative overflow-hidden bg-sand-soft py-20 lg:py-28">
      <div className="container-wide">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="eyebrow mb-4">Latest insights</div>
            <h2 className="text-3xl font-bold leading-[1.05] text-navy md:text-4xl lg:text-5xl">Ideas built on field experience.</h2>
          </div>
          <Link to="/insights" className="inline-flex items-center gap-2 self-start text-sm font-semibold text-navy transition-colors hover:text-gold">Explore Blog & Events <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid gap-7 lg:grid-cols-12">
          <Link to="/blog/$slug" params={{ slug: featured.slug }} className="group relative min-h-[460px] overflow-hidden rounded-3xl lg:col-span-7">
            <Image src={featured.image} alt={featured.title} fill sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover transition-transform duration-[1200ms] group-hover:scale-[1.05]" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/55 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-7 md:p-9">
              <span className="rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-navy">Featured · {featured.category}</span>
              <h3 className="mt-5 max-w-2xl text-2xl font-bold leading-tight text-white md:text-4xl">{featured.title}</h3>
              <div className="mt-5 flex items-center gap-4 text-sm text-white/70"><span>{featured.date}</span><span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-gold" />{featured.readMins} min read</span></div>
            </div>
          </Link>
          <div className="grid gap-7 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
            {secondary.map((post) => <BlogCard key={post.slug} post={post} compact />)}
          </div>
        </div>
        <div className="mt-9 text-center"><Link to="/blog" className="inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]">Explore all articles <ArrowUpRight className="h-4 w-4 text-gold" /></Link></div>
      </div>
    </section>
  );
}
