"use client";

import { useMemo, useState } from "react";
import { CalendarDays, History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { PageHero } from "@/components/site/PageHero";
import { EventCard } from "@/components/blog/EventCard";
import { NewsletterCTA } from "@/components/blog/NewsletterCTA";
import { useTranslatedEvents } from "@/i18n/use-translated-blog";
import { ContentFaq } from "@/components/blog/ContentFaq";

type Filter = "All" | "Upcoming" | "Past";

export function EventsArchiveView() {
  const { t } = useTranslation();
  const events = useTranslatedEvents();
  const [filter, setFilter] = useState<Filter>("All");
  const upcoming = useMemo(() => events.filter((event) => event.status === "Upcoming").sort((a, b) => new Date(a.startsOn).getTime() - new Date(b.startsOn).getTime()), [events]);
  const past = useMemo(() => events.filter((event) => event.status === "Past").sort((a, b) => new Date(b.endsOn).getTime() - new Date(a.endsOn).getTime()), [events]);
  const visible = filter === "Upcoming" ? upcoming : filter === "Past" ? past : [...upcoming, ...past];
  const featured = upcoming.find((event) => event.isFeatured) ?? upcoming[0] ?? past[0];

  const filters: { value: Filter; label: string; field: string }[] = [
    { value: "All", label: t("eventsArchivePage.library.filterAll"), field: "eventsArchivePage.library.filterAll" },
    { value: "Upcoming", label: t("eventsArchivePage.library.filterUpcoming"), field: "eventsArchivePage.library.filterUpcoming" },
    { value: "Past", label: t("eventsArchivePage.library.filterPast"), field: "eventsArchivePage.library.filterPast" },
  ];
  const emptyKey = filter === "Upcoming" ? "eventsArchivePage.empty.upcoming" : filter === "Past" ? "eventsArchivePage.empty.past" : "eventsArchivePage.empty.all";

  return <div className="min-h-screen bg-background"><Header /><main>
    <PageHero
      num="05"
      eyebrow={t("eventsArchivePage.hero.eyebrow")}
      eyebrowField="eventsArchivePage.hero.eyebrow"
      icon={CalendarDays}
      heroImage="/assets/vision-team.jpg"
      title={t("eventsArchivePage.hero.title")}
      titleField="eventsArchivePage.hero.title"
      description={t("eventsArchivePage.hero.description")}
      descriptionField="eventsArchivePage.hero.description"
      crumbs={[
        { label: t("eventsArchivePage.hero.crumbInsights"), to: "/insights", field: "eventsArchivePage.hero.crumbInsights" },
        { label: t("eventsArchivePage.hero.crumbEvents"), field: "eventsArchivePage.hero.crumbEvents" },
      ]}
      ctas={[
        { label: t("eventsArchivePage.hero.ctaUpcoming"), href: "#event-library", variant: "primary", icon: CalendarDays },
        { label: t("eventsArchivePage.hero.ctaPast"), href: "#event-library", variant: "ghost", icon: History },
      ]}
    />
    {featured && <section className="border-b border-border bg-background py-12 lg:py-14"><div className="container-wide"><div className="eyebrow mb-4" data-cms-field={featured.status === "Upcoming" ? "eventsArchivePage.nextEngagement" : "eventsArchivePage.latestEngagement"} suppressContentEditableWarning>{featured.status === "Upcoming" ? t("eventsArchivePage.nextEngagement") : t("eventsArchivePage.latestEngagement")}</div><EventCard event={featured} featured /></div></section>}
    <section id="event-library" className="bg-sand-soft py-16 lg:py-20"><div className="container-wide">
      <div className="mb-9 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="eyebrow mb-3" data-cms-field="eventsArchivePage.library.eyebrow" suppressContentEditableWarning>{t("eventsArchivePage.library.eyebrow")}</div>
          <h2 className="text-3xl font-bold text-navy md:text-4xl" data-cms-field="eventsArchivePage.library.title" suppressContentEditableWarning>{t("eventsArchivePage.library.title")}</h2>
        </div>
        <div className="flex gap-2">{filters.map(({ value, label, field }) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full border px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] ${filter === value ? "border-navy bg-navy text-white" : "border-border bg-card text-navy hover:border-gold"}`} data-cms-field={field} suppressContentEditableWarning>{label}</button>)}</div>
      </div>
      {visible.length ? <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">{visible.map((event) => <EventCard key={event.slug} event={event} />)}</div> : <div className="rounded-3xl border border-border bg-card p-12 text-center"><h3 className="text-xl font-bold text-navy" data-cms-field={emptyKey} suppressContentEditableWarning>{t(emptyKey)}</h3><p className="mt-2 text-muted-foreground" data-cms-field="eventsArchivePage.empty.sub" suppressContentEditableWarning>{t("eventsArchivePage.empty.sub")}</p></div>}
    </div></section>
    <ContentFaq
      eyebrow={t("eventsArchivePage.faq.eyebrow")}
      eyebrowField="eventsArchivePage.faq.eyebrow"
      title={t("eventsArchivePage.faq.title")}
      titleField="eventsArchivePage.faq.title"
      description={t("eventsArchivePage.faq.description")}
      descriptionField="eventsArchivePage.faq.description"
      fieldPrefix="eventsArchivePage.faq"
      items={[
        { question: t("eventsArchivePage.faq.items.0.question"), answer: t("eventsArchivePage.faq.items.0.answer") },
        { question: t("eventsArchivePage.faq.items.1.question"), answer: t("eventsArchivePage.faq.items.1.answer") },
        { question: t("eventsArchivePage.faq.items.2.question"), answer: t("eventsArchivePage.faq.items.2.answer") },
      ]}
    />
    <NewsletterCTA />
  </main><Footer /></div>;
}
