"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowUpRight, CalendarDays, Clock } from "lucide-react";
import { Link } from "@/components/nav/AppLink";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/site/Reveal";
import { NewsletterCTA } from "@/components/blog/NewsletterCTA";
import { useTranslatedPost, useTranslatedPosts } from "@/i18n/use-translated-blog";
import { useCmsContent } from "@/lib/cms-content";

export function BlogPostDetailView({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const { loading } = useCmsContent();
  const post = useTranslatedPost(slug);
  const { all } = useTranslatedPosts();

  if (!post) {
    if (loading) return <main className="min-h-screen bg-background" />;
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="min-h-[60vh] grid place-items-center text-center px-6">
          <div>
            <p className="text-navy font-display text-2xl font-bold mb-3">{t("blogPage.notFound", "Article not found.")}</p>
            <Link to="/blog" className="text-gold font-semibold inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> {t("blogPage.back", "Back to Insights")}
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const others = all.filter((p) => p.slug !== post.slug).slice(0, 3);
  const paragraphs = post.paragraphs && post.paragraphs.length ? post.paragraphs : [post.excerpt];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="relative pt-32 pb-16 lg:pt-40 lg:pb-20 dark-premium text-white overflow-hidden">
          <div className="absolute inset-0 opacity-25">
            <Image src={post.image} alt="" fill priority sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-navy-deep/70 via-navy-deep/90 to-navy-deep" />
          </div>
          <div className="container-wide relative max-w-4xl">
            <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-gold transition-colors mb-8">
              <ArrowLeft className="h-4 w-4" /> {t("blogPage.back", "Back to Insights")}
            </Link>
            <span className="inline-flex items-center rounded-full bg-gold px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-navy mb-6">
              {t(`blogPage.grid.categories.${post.category}`, { defaultValue: post.category })}
            </span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] mb-6">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {post.date}</span>
              <span className="h-1 w-1 rounded-full bg-gold/60" />
              <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {post.readMins} {t("blogPage.grid.min", "min read")}</span>
              <span className="h-1 w-1 rounded-full bg-gold/60" />
              <span>{post.author} · {post.authorRole}</span>
            </div>
          </div>
        </section>

        <section className="relative bg-white">
          <div className="container-wide px-4 sm:px-6 lg:px-8 -mt-10 lg:-mt-16 relative z-10 max-w-4xl">
            <div className="relative rounded-3xl overflow-hidden shadow-elegant aspect-[16/9]">
              <Image src={post.image} alt={post.title} fill sizes="(max-width: 1024px) 100vw, 900px" className="object-cover" />
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20 section-bright">
          <div className="container-wide max-w-3xl">
            <Reveal>
              <div className="space-y-6 text-base md:text-lg text-muted-foreground leading-relaxed">
                {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </Reveal>
            <div className="mt-12 pt-8 border-t border-border flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gold/15 flex items-center justify-center text-gold font-display font-bold">
                {post.author.slice(0, 1)}
              </div>
              <div>
                <div className="text-sm font-semibold text-navy">{post.author}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-[0.18em]">{post.authorRole}</div>
              </div>
            </div>
          </div>
        </section>

        {others.length > 0 && (
          <section className="relative py-16 lg:py-24 bg-sand-soft overflow-hidden">
            <div className="container-wide">
              <Reveal className="max-w-2xl mb-10">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-navy leading-[1.1]">
                  {t("blogPage.moreLabel", "More from Insights")}
                </h2>
              </Reveal>
              <div className="grid md:grid-cols-3 gap-6">
                {others.map((other) => (
                  <Link key={other.slug} to="/blog/$slug" params={{ slug: other.slug }} className="group block rounded-2xl overflow-hidden border border-border bg-card hover:shadow-card hover:-translate-y-1 transition-all duration-500">
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <Image src={other.image} alt={other.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-[1100ms] group-hover:scale-[1.07]" />
                    </div>
                    <div className="p-5">
                      <h3 className="text-base font-display font-bold text-navy leading-snug group-hover:text-gold transition-colors">{other.title}</h3>
                      <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gold">
                        {t("blogPage.viewAll", "Read")} <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <NewsletterCTA />
      </main>
      <Footer />
    </div>
  );
}
