"use client";

import Image from "next/image";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reveal } from "@/components/site/Reveal";
import { type BlogPost } from "@/lib/blog-data";
import { useTranslatedPosts } from "@/i18n/use-translated-blog";

const categories = ["All", "Insights", "Case Study", "Safety", "Vision 2030", "Industry"] as const;
type Category = (typeof categories)[number];

export function BlogGrid() {
  const { t } = useTranslation();
  const { posts } = useTranslatedPosts();
  const [active, setActive] = useState<Category>("All");
  const filtered = active === "All" ? posts : posts.filter((p) => p.category === active);

  return (
    <section className="relative py-20 lg:py-28 bg-sand-soft overflow-hidden">
      <div className="container-wide">
        <Reveal>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-12">
            <div className="max-w-2xl">
              <div className="eyebrow mb-3">{t("blogPage.grid.eyebrow")}</div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.05]">
                {t("blogPage.grid.titleA")} <span className="text-gradient-gold">{t("blogPage.grid.titleB")}</span>
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setActive(c)}
                  className={`relative px-4 py-2 rounded-full text-xs uppercase tracking-[0.18em] font-semibold transition-colors border ${
                    active === c
                      ? "bg-navy text-white border-navy shadow-elegant"
                      : "bg-card text-navy/70 border-border hover:border-gold hover:text-navy"
                  }`}
                >
                  {t(`blogPage.grid.categories.${c}`, { defaultValue: c })}
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        <motion.div
          key={active}
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08 } },
          }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7 lg:gap-8"
        >
          {filtered.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function PostCard({ post }: { post: BlogPost }) {
  const { t } = useTranslation();
  return (
    <motion.article
      variants={{
        hidden: { opacity: 0, y: 30 },
        show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
      }}
      className="group relative flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover-lift"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={post.image}
          alt={post.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.07]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
        <div className="absolute top-4 left-4 inline-flex items-center rounded-full bg-white/95 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-[0.22em] font-semibold text-navy">
          {t(`blogPage.grid.categories.${post.category}`, { defaultValue: post.category })}
        </div>
      </div>

      <div className="flex-1 flex flex-col p-6">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
          <span className="tabular-nums">{post.date}</span>
          <span className="h-1 w-1 rounded-full bg-gold/60" />
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {post.readMins} {t("blogPage.grid.min")}
          </span>
        </div>

        <h3 className="text-lg md:text-xl font-display font-bold tracking-tight text-navy leading-snug group-hover:text-gradient-gold transition-colors">
          {post.title}
        </h3>

        <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {post.excerpt}
        </p>

        <div className="mt-6 pt-5 border-t border-border flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-navy truncate">{post.author}</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5 truncate">
              {post.authorRole}
            </div>
          </div>
          <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-gold/10 text-gold transition-all group-hover:bg-gold group-hover:text-gold-foreground group-hover:rotate-45">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </motion.article>
  );
}
