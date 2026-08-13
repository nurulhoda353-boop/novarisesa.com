"use client";

import { useMemo, useState } from "react";
import { Reveal } from "@/components/site/Reveal";
import { useTranslatedPosts } from "@/i18n/use-translated-blog";
import { BlogCard } from "./BlogCard";

const PAGE_SIZE = 6;

export function BlogGrid({ heading = true }: { heading?: boolean }) {
  const { all } = useTranslatedPosts();
  const [active, setActive] = useState("All");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const categories = useMemo(() => ["All", ...Array.from(new Set(all.map((post) => post.category)))], [all]);
  const filtered = active === "All" ? all : all.filter((post) => post.category === active);
  const visible = filtered.slice(0, visibleCount);

  return (
    <section className="relative overflow-hidden bg-sand-soft py-20 lg:py-28">
      <div className="container-wide">
        <Reveal>
          <div className="mb-12 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            {heading && <div className="max-w-2xl"><div className="eyebrow mb-3">Article library</div><h2 className="text-3xl font-bold leading-[1.05] text-navy md:text-4xl lg:text-5xl">Latest thinking and field stories.</h2></div>}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button key={category} type="button" onClick={() => { setActive(category); setVisibleCount(PAGE_SIZE); }} className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${active === category ? "border-navy bg-navy text-white" : "border-border bg-card text-navy/70 hover:border-gold"}`}>{category}</button>
              ))}
            </div>
          </div>
        </Reveal>
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">{visible.map((post) => <BlogCard key={post.slug} post={post} />)}</div>
        {visibleCount < filtered.length && <div className="mt-12 text-center"><button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-navy transition-colors hover:border-gold hover:text-gold">Load more articles</button></div>}
      </div>
    </section>
  );
}
