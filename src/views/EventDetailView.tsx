"use client";

import Image from "next/image";
import { ArrowLeft, ArrowUpRight, CalendarDays, Check, Clock3, MapPin } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Link } from "@/components/nav/AppLink";
import { EventCard } from "@/components/blog/EventCard";
import { NewsletterCTA } from "@/components/blog/NewsletterCTA";
import { useTranslatedEvent, useTranslatedEvents } from "@/i18n/use-translated-blog";
import { useCmsContent } from "@/lib/cms-content";

export function EventDetailView({ slug }: { slug: string }) {
  const { loading } = useCmsContent();
  const event = useTranslatedEvent(slug);
  const all = useTranslatedEvents();
  if (!event) {
    if (loading) return <main className="min-h-screen bg-background" />;
    return <div className="min-h-screen bg-background"><Header /><main className="grid min-h-[65vh] place-items-center px-6 text-center"><div><h1 className="text-3xl font-bold text-navy">Event not found.</h1><Link to="/events" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-gold"><ArrowLeft className="h-4 w-4" />Back to events</Link></div></main><Footer /></div>;
  }
  const related = all.filter((item) => item.slug !== event.slug).sort((a, b) => Number(b.status === "Upcoming") - Number(a.status === "Upcoming")).slice(0, 3);
  const past = event.status === "Past";
  return <div className="min-h-screen bg-background"><Header /><main>
    <section className="relative overflow-hidden bg-navy-deep pb-24 pt-36 text-white lg:pb-32 lg:pt-44">
      <Image src={event.image} alt="" fill priority sizes="100vw" className="object-cover opacity-30" /><div className="absolute inset-0 bg-gradient-to-b from-navy-deep/70 via-navy-deep/85 to-navy-deep" />
      <div className="container-wide relative"><Link to="/events" className="mb-9 inline-flex items-center gap-2 text-sm text-white/65 hover:text-gold"><ArrowLeft className="h-4 w-4" />Back to all events</Link><div className="flex flex-wrap gap-2"><span className="rounded-full bg-gold px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-navy">{event.type}</span><span className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em]">{event.status}</span></div><h1 className="mt-7 max-w-5xl text-4xl font-bold leading-[1.05] md:text-5xl lg:text-6xl">{event.title}</h1><p className="mt-6 max-w-3xl text-lg leading-relaxed text-white/70">{event.description}</p>
        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/75"><span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-gold" />{event.date}</span><span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-gold" />{event.time}</span><span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-gold" />{event.location}</span></div>
      </div>
    </section>
    <section className="relative bg-white"><div className="container-wide relative z-10 -mt-14"><div className="relative aspect-[16/7] min-h-[300px] overflow-hidden rounded-3xl shadow-elegant"><Image src={event.image} alt={event.title} fill sizes="100vw" className="object-cover" /></div></div></section>
    <section className="bg-background py-20 lg:py-28"><div className="container-wide grid gap-12 lg:grid-cols-12">
      <div className="lg:col-span-7"><div className="eyebrow mb-4">Event overview</div><h2 className="text-3xl font-bold text-navy md:text-4xl">Why this engagement matters.</h2><div className="mt-7 space-y-5 text-base leading-relaxed text-muted-foreground md:text-lg">{event.overview.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></div>
      <aside className="lg:col-span-5"><div className="rounded-3xl bg-navy p-7 text-white shadow-elegant md:p-9"><div className="text-xs font-bold uppercase tracking-[0.25em] text-gold">Event information</div><dl className="mt-7 space-y-5"><div><dt className="text-xs uppercase tracking-wider text-white/45">Date</dt><dd className="mt-1 font-semibold">{event.date}</dd></div><div><dt className="text-xs uppercase tracking-wider text-white/45">Time</dt><dd className="mt-1 font-semibold">{event.time}</dd></div><div><dt className="text-xs uppercase tracking-wider text-white/45">Venue</dt><dd className="mt-1 font-semibold">{event.venue}</dd></div><div><dt className="text-xs uppercase tracking-wider text-white/45">Location</dt><dd className="mt-1 font-semibold">{event.location}</dd></div></dl><Link to="/contact" className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-semibold text-navy">{past ? "Discuss this event" : "Request a meeting"}<ArrowUpRight className="h-4 w-4" /></Link></div></aside>
    </div></section>
    <section className="bg-sand-soft py-20 lg:py-28"><div className="container-wide grid gap-12 lg:grid-cols-12"><div className="lg:col-span-7"><div className="eyebrow mb-4">Programme</div><h2 className="text-3xl font-bold text-navy">Event agenda.</h2><div className="mt-8 space-y-4">{event.agenda.map((item, index) => <div key={`${item.time}-${index}`} className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[110px_1fr]"><span className="text-sm font-bold text-gold">{item.time}</span><div><h3 className="font-bold text-navy">{item.title}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p></div></div>)}</div></div><div className="lg:col-span-5"><div className="eyebrow mb-4">What to expect</div><h2 className="text-3xl font-bold text-navy">Key takeaways.</h2><ul className="mt-8 space-y-4">{event.takeaways.map((item) => <li key={item} className="flex gap-3 rounded-2xl bg-white p-5 text-sm font-semibold text-navy shadow-card"><span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold"><Check className="h-4 w-4" /></span>{item}</li>)}</ul></div></div></section>
    {related.length > 0 && <section className="bg-background py-20 lg:py-24"><div className="container-wide"><div className="mb-9 flex items-end justify-between"><div><div className="eyebrow mb-3">Continue exploring</div><h2 className="text-3xl font-bold text-navy">More events</h2></div><Link to="/events" className="hidden items-center gap-2 text-sm font-semibold text-navy hover:text-gold md:inline-flex">All events <ArrowUpRight className="h-4 w-4" /></Link></div><div className="grid gap-7 md:grid-cols-3">{related.map((item) => <EventCard key={item.slug} event={item} />)}</div></div></section>}
    <NewsletterCTA />
  </main><Footer /></div>;
}
