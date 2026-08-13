"use client";

import Image from "next/image";
import { ArrowUpRight, Clock } from "lucide-react";
import { Link } from "@/components/nav/AppLink";
import type { BlogPost } from "@/lib/blog-data";

export function BlogCard({ post, compact = false }: { post: BlogPost; compact?: boolean }) {
  return (
    <Link to="/blog/$slug" params={{ slug: post.slug }} className="block h-full">
      <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-500 hover:-translate-y-1 hover:border-gold/60 hover:shadow-elegant">
        <div className={`relative overflow-hidden ${compact ? "aspect-[16/9]" : "aspect-[16/10]"}`}>
          <Image src={post.image} alt={post.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-[1000ms] group-hover:scale-[1.06]" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/70 via-transparent to-transparent" />
          <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-navy">
            {post.category}
          </span>
        </div>
        <div className={`flex flex-1 flex-col ${compact ? "p-5" : "p-6"}`}>
          <div className="mb-3 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>{post.date}</span><span className="h-1 w-1 rounded-full bg-gold" />
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {post.readMins} min read</span>
          </div>
          <h3 className={`${compact ? "text-base" : "text-lg md:text-xl"} font-display font-bold leading-snug text-navy transition-colors group-hover:text-gold`}>{post.title}</h3>
          {!compact && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>}
          <div className="mt-auto flex items-center justify-between border-t border-border pt-5 text-xs font-semibold text-navy">
            <span className="truncate">{post.author}</span>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gold/10 text-gold transition-all group-hover:rotate-45 group-hover:bg-gold group-hover:text-navy"><ArrowUpRight className="h-4 w-4" /></span>
          </div>
        </div>
      </article>
    </Link>
  );
}
