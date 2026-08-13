"use client";

import Image from "next/image";
import { ArrowUpRight, Clock } from "lucide-react";
import { Link } from "@/components/nav/AppLink";
import { useTranslatedPosts } from "@/i18n/use-translated-blog";

export function HomeInsights() {
  const { featured, all } = useTranslatedPosts();
  const secondary = all.filter((post) => post.slug !== featured.slug).slice(0, 2);
  return (
    <section className="border-y border-border bg-sand-soft py-14 lg:py-16">
      <div className="container-wide">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="eyebrow mb-2">Latest insights</div><h2 className="text-3xl font-bold leading-[1.05] text-navy md:text-4xl">Ideas from the field.</h2></div>
          <Link to="/blog" className="inline-flex items-center gap-2 self-start text-sm font-semibold text-navy hover:text-gold">All articles <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-12">
          <Link to="/blog/$slug" params={{ slug: featured.slug }} className="group grid min-h-[280px] border-b border-border lg:col-span-7 lg:grid-cols-[42%_1fr] lg:border-b-0 lg:border-r">
            <div className="relative min-h-48 overflow-hidden lg:min-h-full"><Image src={featured.image} alt={featured.title} fill sizes="(max-width: 1024px) 100vw, 35vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" /><div className="absolute inset-0 bg-gradient-to-t from-navy-deep/45 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-navy-deep/30" /></div>
            <div className="flex flex-col justify-center p-6 lg:p-7"><span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Featured · {featured.category}</span><h3 className="mt-3 text-xl font-bold leading-snug text-navy transition-colors group-hover:text-gold">{featured.title}</h3><p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{featured.excerpt}</p><div className="mt-5 flex items-center gap-3 text-xs text-muted-foreground"><span>{featured.date}</span><span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-gold" />{featured.readMins} min</span></div></div>
          </Link>
          <div className="divide-y divide-border lg:col-span-5">{secondary.map((post) => <Link key={post.slug} to="/blog/$slug" params={{ slug: post.slug }} className="group grid min-h-[140px] grid-cols-[120px_1fr] gap-4 p-4 transition-colors hover:bg-sand-soft"><div className="relative overflow-hidden rounded-xl"><Image src={post.image} alt={post.title} fill sizes="120px" className="object-cover transition-transform duration-500 group-hover:scale-105" /></div><div className="flex min-w-0 flex-col justify-center"><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold">{post.category}</span><h3 className="mt-2 line-clamp-2 text-base font-bold leading-snug text-navy group-hover:text-gold">{post.title}</h3><span className="mt-3 text-xs text-muted-foreground">{post.date} · {post.readMins} min read</span></div></Link>)}</div>
        </div>
      </div>
    </section>
  );
}
