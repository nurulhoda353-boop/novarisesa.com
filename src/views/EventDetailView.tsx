"use client";

import Image from "next/image";
import { ArrowLeft, ArrowUpRight, CalendarDays, Check, Clock3, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Link } from "@/components/nav/AppLink";
import { EventCard } from "@/components/blog/EventCard";
import { NewsletterCTA } from "@/components/blog/NewsletterCTA";
import { ContentFaq } from "@/components/blog/ContentFaq";
import { useTranslatedEvent, useTranslatedEvents } from "@/i18n/use-translated-blog";
import { useCmsContent } from "@/lib/cms-content";

export function EventDetailView({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const { loading } = useCmsContent();
  const event = useTranslatedEvent(slug);
  const all = useTranslatedEvents();
  if (!event) {
    if (loading) return <main className="min-h-screen bg-background" />;
    return <div className="min-h-screen bg-background"><Header /><main className="grid min-h-[65vh] place-items-center px-6 text-center"><div><h1 className="text-3xl font-bold text-navy" data-cms-field="eventDetail.notFound" suppressContentEditableWarning>{t("eventDetail.notFound")}</h1><Link to="/events" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-gold"><ArrowLeft className="h-4 w-4" /><span data-cms-field="eventDetail.backToEvents" suppressContentEditableWarning>{t("eventDetail.backToEvents")}</span></Link></div></main><Footer /></div>;
  }
  const related = all.filter((item) => item.slug !== event.slug).sort((a, b) => Number(b.status === "Upcoming") - Number(a.status === "Upcoming")).slice(0, 3);
  const past = event.status === "Past";
  return <div className="min-h-screen bg-background"><Header /><main>
    <section className="relative overflow-hidden bg-navy-deep py-24 text-white lg:py-28"><Image src={event.image} alt="" fill priority sizes="100vw" className="object-cover opacity-25" /><div className="absolute inset-0 bg-gradient-to-b from-navy-deep/70 via-navy-deep/90 to-navy-deep" /><div className="container-wide relative max-w-5xl"><Link to="/events" className="mb-7 inline-flex items-center gap-2 text-sm text-white/65 hover:text-gold"><ArrowLeft className="h-4 w-4" /><span data-cms-field="eventDetail.backToAllEvents" suppressContentEditableWarning>{t("eventDetail.backToAllEvents")}</span></Link><div className="flex flex-wrap gap-2"><span className="rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-navy">{event.type}</span><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]">{event.status}</span></div><h1 className="mt-5 max-w-4xl text-4xl font-bold leading-[1.05] md:text-5xl lg:text-6xl">{event.title}</h1><div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/65"><span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-gold" />{event.date}</span><span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-gold" />{event.time}</span><span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-gold" />{event.location}</span></div></div></section>
    <section className="bg-background py-10 lg:py-14"><div className="container-wide grid items-start gap-8 lg:grid-cols-12"><div className="lg:col-span-8"><div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card"><div className="relative aspect-[16/9]"><Image src={event.image} alt={event.title} fill sizes="(max-width: 1024px) 100vw, 70vw" className="object-cover" /></div><div className="p-7 md:p-8"><div className="eyebrow mb-3" data-cms-field="eventDetail.overview" suppressContentEditableWarning>{t("eventDetail.overview")}</div><p className="text-lg leading-relaxed text-navy md:text-xl">{event.description}</p></div></div><article className="mt-10"><div className="space-y-5 text-base leading-[1.85] text-muted-foreground md:text-lg">{event.overview.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><div className="mt-10"><div className="eyebrow mb-4" data-cms-field="eventDetail.programme" suppressContentEditableWarning>{t("eventDetail.programme")}</div><h2 className="text-3xl font-bold text-navy" data-cms-field="eventDetail.agendaTitle" suppressContentEditableWarning>{t("eventDetail.agendaTitle")}</h2><div className="mt-6 divide-y divide-border border-y border-border">{event.agenda.map((item, index) => <div key={`${item.time}-${index}`} className="grid gap-3 py-5 sm:grid-cols-[110px_1fr]"><span className="text-sm font-bold text-gold">{item.time}</span><div><h3 className="font-bold text-navy">{item.title}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p></div></div>)}</div></div></article></div><aside className="lg:col-span-4"><div className="sticky top-28 overflow-hidden rounded-2xl border border-border bg-card shadow-card"><div className="border-b border-border bg-sand-soft p-6"><div className="text-xs font-bold uppercase tracking-[0.22em] text-gold" data-cms-field="eventDetail.information" suppressContentEditableWarning>{t("eventDetail.information")}</div><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-xs uppercase tracking-wider text-muted-foreground" data-cms-field="eventDetail.date" suppressContentEditableWarning>{t("eventDetail.date")}</dt><dd className="mt-1 font-semibold text-navy">{event.date}</dd></div><div><dt className="text-xs uppercase tracking-wider text-muted-foreground" data-cms-field="eventDetail.venue" suppressContentEditableWarning>{t("eventDetail.venue")}</dt><dd className="mt-1 font-semibold text-navy">{event.venue}</dd></div><div><dt className="text-xs uppercase tracking-wider text-muted-foreground" data-cms-field="eventDetail.location" suppressContentEditableWarning>{t("eventDetail.location")}</dt><dd className="mt-1 font-semibold text-navy">{event.location}</dd></div></dl><Link to="/contact" className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-navy px-4 py-3 text-sm font-semibold text-white"><span data-cms-field={past ? "eventDetail.discussEvent" : "eventDetail.requestMeeting"} suppressContentEditableWarning>{past ? t("eventDetail.discussEvent") : t("eventDetail.requestMeeting")}</span><ArrowUpRight className="h-4 w-4 text-gold" /></Link></div><div className="p-6"><div className="text-xs font-bold uppercase tracking-[0.22em] text-gold" data-cms-field="eventDetail.whatToExpect" suppressContentEditableWarning>{t("eventDetail.whatToExpect")}</div><ul className="mt-5 space-y-4">{event.takeaways.map((item) => <li key={item} className="flex gap-3 text-sm font-semibold leading-relaxed text-navy"><span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold"><Check className="h-3.5 w-3.5" /></span>{item}</li>)}</ul></div></div></aside></div></section>
    {related.length > 0 && <section className="border-t border-border bg-sand-soft py-16 lg:py-20"><div className="container-wide"><div className="mb-8 flex items-end justify-between"><div><div className="eyebrow mb-2" data-cms-field="eventDetail.continueExploring" suppressContentEditableWarning>{t("eventDetail.continueExploring")}</div><h2 className="text-3xl font-bold text-navy" data-cms-field="eventDetail.moreEvents" suppressContentEditableWarning>{t("eventDetail.moreEvents")}</h2></div><Link to="/events" className="hidden items-center gap-2 text-sm font-semibold text-navy hover:text-gold md:inline-flex"><span data-cms-field="eventDetail.allEvents" suppressContentEditableWarning>{t("eventDetail.allEvents")}</span> <ArrowUpRight className="h-4 w-4" /></Link></div><div className="grid gap-6 md:grid-cols-3">{related.map((item) => <EventCard key={item.slug} event={item} />)}</div></div></section>}
    <ContentFaq
      eyebrow={t("eventDetail.faq.eyebrow")}
      eyebrowField="eventDetail.faq.eyebrow"
      title={t("eventDetail.faq.title")}
      titleField="eventDetail.faq.title"
      description={t("eventDetail.faq.description")}
      descriptionField="eventDetail.faq.description"
      fieldPrefix="eventDetail.faq"
      items={[
        { question: t("eventDetail.faq.items.0.question"), answer: t("eventDetail.faq.items.0.answer") },
        { question: t("eventDetail.faq.items.1.question"), answer: t("eventDetail.faq.items.1.answer") },
      ]}
    />
    <NewsletterCTA />
  </main><Footer /></div>;
}
