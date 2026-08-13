"use client";

import Image from "next/image";
import { ArrowLeft, ArrowUpRight, CalendarDays, Check, Clock, Quote } from "lucide-react";
import { Link } from "@/components/nav/AppLink";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { NewsletterCTA } from "@/components/blog/NewsletterCTA";
import { BlogCard } from "@/components/blog/BlogCard";
import { useTranslatedPost, useTranslatedPosts } from "@/i18n/use-translated-blog";
import { useCmsContent } from "@/lib/cms-content";

export function BlogPostDetailView({ slug }: { slug: string }) {
  const { loading } = useCmsContent();
  const post = useTranslatedPost(slug);
  const { all } = useTranslatedPosts();
  if (!post) {
    if (loading) return <main className="min-h-screen bg-background" />;
    return <div className="min-h-screen bg-background"><Header /><main className="grid min-h-[65vh] place-items-center px-6 text-center"><div><h1 className="text-3xl font-bold text-navy">Article not found.</h1><Link to="/blog" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-gold"><ArrowLeft className="h-4 w-4" />Back to all articles</Link></div></main><Footer /></div>;
  }
  const related = all.filter((item) => item.slug !== post.slug).slice(0, 3);
  return <div className="min-h-screen bg-background"><Header /><main>
    <section className="relative overflow-hidden bg-navy-deep pb-20 pt-36 text-white lg:pb-28 lg:pt-44"><Image src={post.image} alt="" fill priority sizes="100vw" className="object-cover opacity-25" /><div className="absolute inset-0 bg-gradient-to-b from-navy-deep/70 via-navy-deep/90 to-navy-deep" /><div className="container-wide relative max-w-5xl"><Link to="/blog" className="mb-9 inline-flex items-center gap-2 text-sm text-white/65 hover:text-gold"><ArrowLeft className="h-4 w-4" />Back to all articles</Link><span className="block w-fit rounded-full bg-gold px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-navy">{post.category}</span><h1 className="mt-7 text-4xl font-bold leading-[1.06] md:text-5xl lg:text-6xl">{post.title}</h1><p className="mt-6 max-w-3xl text-lg leading-relaxed text-white/70">{post.excerpt}</p><div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-white/65"><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-gold" />{post.date}</span><span className="h-1 w-1 rounded-full bg-gold" /><span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-gold" />{post.readMins} min read</span><span className="h-1 w-1 rounded-full bg-gold" /><span>{post.author} · {post.authorRole}</span></div></div></section>
    <section className="relative bg-white"><div className="container-wide relative z-10 -mt-12 max-w-5xl"><div className="relative aspect-[16/9] overflow-hidden rounded-3xl shadow-elegant"><Image src={post.image} alt={post.title} fill sizes="(max-width: 1024px) 100vw, 1000px" className="object-cover" /></div></div></section>
    <section className="bg-background py-20 lg:py-28"><div className="container-wide grid max-w-6xl gap-12 lg:grid-cols-12"><article className="lg:col-span-8"><div className="space-y-7 text-base leading-[1.9] text-muted-foreground md:text-lg">{post.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>{post.pullQuote && <blockquote className="relative my-12 overflow-hidden rounded-3xl bg-navy p-8 text-white md:p-10"><Quote className="absolute right-6 top-5 h-16 w-16 text-gold/15" /><p className="relative text-xl font-semibold leading-relaxed md:text-2xl">“{post.pullQuote}”</p></blockquote>}<div className="mt-12 flex items-center gap-4 border-t border-border pt-8"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-lg font-bold text-gold">{post.author.charAt(0)}</div><div><div className="font-semibold text-navy">{post.author}</div><div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{post.authorRole}</div></div></div></article><aside className="lg:col-span-4"><div className="sticky top-28 rounded-3xl border border-border bg-sand-soft p-7"><div className="text-xs font-bold uppercase tracking-[0.25em] text-gold">Key takeaways</div><ul className="mt-6 space-y-4">{post.keyTakeaways.map((item) => <li key={item} className="flex gap-3 text-sm font-semibold leading-relaxed text-navy"><span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold"><Check className="h-3.5 w-3.5" /></span>{item}</li>)}</ul></div></aside></div></section>
    {related.length > 0 && <section className="bg-sand-soft py-20 lg:py-24"><div className="container-wide"><div className="mb-10 flex items-end justify-between"><div><div className="eyebrow mb-3">Continue reading</div><h2 className="text-3xl font-bold text-navy">More from Insights</h2></div><Link to="/blog" className="hidden items-center gap-2 text-sm font-semibold text-navy hover:text-gold md:inline-flex">All articles <ArrowUpRight className="h-4 w-4" /></Link></div><div className="grid gap-7 md:grid-cols-3">{related.map((item) => <BlogCard key={item.slug} post={item} compact />)}</div></div></section>}
    <NewsletterCTA />
  </main><Footer /></div>;
}
