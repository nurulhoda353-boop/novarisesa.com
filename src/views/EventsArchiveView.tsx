"use client";

import { useMemo, useState } from "react";
import { CalendarDays, History } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { PageHero } from "@/components/site/PageHero";
import { EventCard } from "@/components/blog/EventCard";
import { NewsletterCTA } from "@/components/blog/NewsletterCTA";
import { useTranslatedEvents } from "@/i18n/use-translated-blog";
import { ContentFaq } from "@/components/blog/ContentFaq";

type Filter = "All" | "Upcoming" | "Past";

export function EventsArchiveView() {
  const events = useTranslatedEvents();
  const [filter, setFilter] = useState<Filter>("All");
  const upcoming = useMemo(() => events.filter((event) => event.status === "Upcoming").sort((a, b) => new Date(a.startsOn).getTime() - new Date(b.startsOn).getTime()), [events]);
  const past = useMemo(() => events.filter((event) => event.status === "Past").sort((a, b) => new Date(b.endsOn).getTime() - new Date(a.endsOn).getTime()), [events]);
  const visible = filter === "Upcoming" ? upcoming : filter === "Past" ? past : [...upcoming, ...past];
  const featured = upcoming.find((event) => event.isFeatured) ?? upcoming[0] ?? past[0];

  return <div className="min-h-screen bg-background"><Header /><main>
    <PageHero num="05" eyebrow="NOVARISE Events" icon={CalendarDays} heroImage="/assets/vision-team.jpg" title="Meet us where industry moves forward." description="Explore upcoming conferences, exhibitions and leadership sessions—plus recaps from the engagements where ideas became action." crumbs={[{ label: "Insights", to: "/insights" }, { label: "Events" }]} ctas={[{ label: "Upcoming events", href: "#event-library", variant: "primary", icon: CalendarDays }, { label: "Past events", href: "#event-library", variant: "ghost", icon: History }]} />
    {featured && <section className="border-b border-border bg-background py-12 lg:py-14"><div className="container-wide"><div className="eyebrow mb-4">{featured.status === "Upcoming" ? "Next engagement" : "Latest engagement"}</div><EventCard event={featured} featured /></div></section>}
    <section id="event-library" className="bg-sand-soft py-16 lg:py-20"><div className="container-wide">
      <div className="mb-9 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><div className="eyebrow mb-3">Event library</div><h2 className="text-3xl font-bold text-navy md:text-4xl">Upcoming and previous events.</h2></div><div className="flex gap-2">{(["All", "Upcoming", "Past"] as Filter[]).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full border px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] ${filter === value ? "border-navy bg-navy text-white" : "border-border bg-card text-navy hover:border-gold"}`}>{value}</button>)}</div></div>
      {visible.length ? <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">{visible.map((event) => <EventCard key={event.slug} event={event} />)}</div> : <div className="rounded-3xl border border-border bg-card p-12 text-center"><h3 className="text-xl font-bold text-navy">No {filter.toLowerCase()} events right now.</h3><p className="mt-2 text-muted-foreground">New engagements will be announced here.</p></div>}
    </div></section>
    <ContentFaq eyebrow="Event help" title="Plan your visit." description="Everything you need before requesting a meeting or following an event recap." items={[
      { question: "How do I request a meeting at an upcoming event?", answer: "Open the event page and use the meeting request button. Our team will confirm availability and the best time to connect." },
      { question: "What happens to an event after its date passes?", answer: "It moves automatically to Past events while staying available as a full event story and recap." },
      { question: "Can I receive upcoming event announcements?", answer: "Subscribe to the NOVARISE Brief below to receive selected event and industry updates." },
    ]} />
    <NewsletterCTA />
  </main><Footer /></div>;
}
