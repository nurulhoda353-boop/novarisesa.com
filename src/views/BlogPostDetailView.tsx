"use client";

import Image from "next/image";
import { ArrowLeft, ArrowUpRight, CalendarDays, Check, Clock, Quote } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@/components/nav/AppLink";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { NewsletterCTA } from "@/components/blog/NewsletterCTA";
import { BlogCard } from "@/components/blog/BlogCard";
import { ContentFaq } from "@/components/blog/ContentFaq";
import { useTranslatedPost, useTranslatedPosts } from "@/i18n/use-translated-blog";
import { useCmsContent } from "@/lib/cms-content";

export function BlogPostDetailView({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const { loading } = useCmsContent();
  const post = useTranslatedPost(slug);
  const { all } = useTranslatedPosts();
  if (!post) {
    if (loading) return <main className="min-h-screen bg-background" />;
    return <div className="min-h-screen bg-background"><Header /><main className="grid min-h-[65vh] place-items-center px-6 text-center"><div><h1 className="text-3xl font-bold text-navy" data-cms-field="blogPostDetail.notFound" suppressContentEditableWarning>{t("blogPostDetail.notFound")}</h1><Link to="/blog" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-gold"><ArrowLeft className="h-4 w-4" /><span data-cms-field="blogPostDetail.backToAll" suppressContentEditableWarning>{t("blogPostDetail.backToAll")}</span></Link></div></main><Footer /></div>;
  }
  const related = all.filter((item) => item.slug !== post.slug).slice(0, 3);
  return <div className="min-h-screen bg-background"><Header /><main>
    <section className="relative overflow-hidden bg-navy-deep py-24 text-white lg:py-28"><Image src={post.image} alt="" fill priority sizes="100vw" className="object-cover opacity-20" /><div className="absolute inset-0 bg-gradient-to-b from-navy-deep/70 via-navy-deep/90 to-navy-deep" /><div className="container-wide relative max-w-5xl"><Link to="/blog" className="mb-7 inline-flex items-center gap-2 text-sm text-white/65 hover:text-gold"><ArrowLeft className="h-4 w-4" /><span data-cms-field="blogPostDetail.backToAll" suppressContentEditableWarning>{t("blogPostDetail.backToAll")}</span></Link><span className="block w-fit rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-navy">{post.category}</span><h1 className="mt-5 max-w-4xl text-4xl font-bold leading-[1.06] md:text-5xl lg:text-6xl">{post.title}</h1><div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/65"><span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-gold" />{post.date}</span><span className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-gold" />{post.readMins}<span data-cms-field="blogPostDetail.minRead" suppressContentEditableWarning>{t("blogPostDetail.minRead")}</span></span><span>{post.author} · {post.authorRole}</span></div></div></section>
    <section className="bg-background py-10 lg:py-14"><div className="container-wide grid items-start gap-8 lg:grid-cols-12"><div className="lg:col-span-8"><div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card"><div className="relative aspect-[16/9]"><Image src={post.image} alt={post.title} fill sizes="(max-width: 1024px) 100vw, 70vw" className="object-cover" /></div><div className="p-7 md:p-8"><p className="text-lg leading-relaxed text-navy md:text-xl">{post.excerpt}</p></div></div><article className="mt-10 space-y-6 text-base leading-[1.85] text-muted-foreground md:text-lg">{post.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</article>{post.pullQuote && <blockquote className="relative my-10 overflow-hidden rounded-2xl bg-navy p-7 text-white md:p-8"><Quote className="absolute right-6 top-5 h-14 w-14 text-gold/15" /><p className="relative text-xl font-semibold leading-relaxed">“{post.pullQuote}”</p></blockquote>}<div className="mt-10 flex items-center gap-4 border-t border-border pt-7"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-lg font-bold text-gold">{post.author.charAt(0)}</div><div><div className="font-semibold text-navy">{post.author}</div><div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{post.authorRole}</div></div></div></div><aside className="lg:col-span-4"><div className="sticky top-28 overflow-hidden rounded-2xl border border-border bg-card shadow-card"><div className="border-b border-border bg-sand-soft p-6"><div className="text-xs font-bold uppercase tracking-[0.22em] text-gold" data-cms-field="blogPostDetail.summary" suppressContentEditableWarning>{t("blogPostDetail.summary")}</div><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-xs uppercase tracking-wider text-muted-foreground" data-cms-field="blogPostDetail.published" suppressContentEditableWarning>{t("blogPostDetail.published")}</dt><dd className="mt-1 font-semibold text-navy">{post.date}</dd></div><div><dt className="text-xs uppercase tracking-wider text-muted-foreground" data-cms-field="blogPostDetail.readingTime" suppressContentEditableWarning>{t("blogPostDetail.readingTime")}</dt><dd className="mt-1 font-semibold text-navy">{post.readMins}<span data-cms-field="blogPostDetail.minutesSuffix" suppressContentEditableWarning>{t("blogPostDetail.minutesSuffix")}</span></dd></div><div><dt className="text-xs uppercase tracking-wider text-muted-foreground" data-cms-field="blogPostDetail.author" suppressContentEditableWarning>{t("blogPostDetail.author")}</dt><dd className="mt-1 font-semibold text-navy">{post.author}</dd></div></dl></div><div className="p-6"><div className="text-xs font-bold uppercase tracking-[0.22em] text-gold" data-cms-field="blogPostDetail.keyTakeaways" suppressContentEditableWarning>{t("blogPostDetail.keyTakeaways")}</div><ul className="mt-5 space-y-4">{post.keyTakeaways.map((item) => <li key={item} className="flex gap-3 text-sm font-semibold leading-relaxed text-navy"><span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold"><Check className="h-3.5 w-3.5" /></span>{item}</li>)}</ul><Link to="/blog" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-gold"><span data-cms-field="blogPostDetail.moreInsights" suppressContentEditableWarning>{t("blogPostDetail.moreInsights")}</span> <ArrowUpRight className="h-4 w-4" /></Link></div></div></aside></div></section>
    {related.length > 0 && <section className="border-t border-border bg-sand-soft py-16 lg:py-20"><div className="container-wide"><div className="mb-8 flex items-end justify-between"><div><div className="eyebrow mb-2" data-cms-field="blogPostDetail.continueReading" suppressContentEditableWarning>{t("blogPostDetail.continueReading")}</div><h2 className="text-3xl font-bold text-navy" data-cms-field="blogPostDetail.moreFromInsights" suppressContentEditableWarning>{t("blogPostDetail.moreFromInsights")}</h2></div><Link to="/blog" className="hidden items-center gap-2 text-sm font-semibold text-navy hover:text-gold md:inline-flex"><span data-cms-field="blogPostDetail.allArticles" suppressContentEditableWarning>{t("blogPostDetail.allArticles")}</span> <ArrowUpRight className="h-4 w-4" /></Link></div><div className="grid gap-6 md:grid-cols-3">{related.map((item) => <BlogCard key={item.slug} post={item} compact />)}</div></div></section>}
    <ContentFaq
      eyebrow={t("blogPostDetail.faq.eyebrow")}
      eyebrowField="blogPostDetail.faq.eyebrow"
      title={t("blogPostDetail.faq.title")}
      titleField="blogPostDetail.faq.title"
      description={t("blogPostDetail.faq.description")}
      descriptionField="blogPostDetail.faq.description"
      fieldPrefix="blogPostDetail.faq"
      items={[
        { question: t("blogPostDetail.faq.items.0.question"), answer: t("blogPostDetail.faq.items.0.answer") },
        { question: t("blogPostDetail.faq.items.1.question"), answer: t("blogPostDetail.faq.items.1.answer") },
      ]}
    />
    <NewsletterCTA />
  </main><Footer /></div>;
}
