"use client";

import Image from "next/image";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { Link } from "@/components/nav/AppLink";
import { useTranslatedEvents } from "@/i18n/use-translated-blog";
import { selectEventPreview } from "@/lib/blog-data";

export function EventsSection() {
  const events = selectEventPreview(useTranslatedEvents(), 3);
  const primary = events[0];
  if (!primary) return null;
  return (
    <section id="events" className="relative overflow-hidden border-y border-white/10 bg-navy-deep py-16 text-white lg:py-20">
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-gold/10 blur-[120px]" />
      <div className="container-wide relative">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-gold"><CalendarDays className="h-4 w-4" />Events & engagements</div><h2 className="text-3xl font-bold leading-[1.08] text-white md:text-4xl">Where we connect next.</h2></div>
          <Link to="/events" className="inline-flex items-center gap-2 self-start text-sm font-semibold text-white hover:text-gold">Explore all events <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid overflow-hidden rounded-2xl border border-white/15 bg-white/[0.05] lg:grid-cols-12">
          <Link to="/events/$slug" params={{ slug: primary.slug }} className="group grid min-h-[260px] lg:col-span-7 lg:grid-cols-[42%_1fr] lg:border-r lg:border-white/10">
            <div className="relative min-h-44 overflow-hidden lg:min-h-full"><Image src={primary.image} alt={primary.title} fill sizes="(max-width: 1024px) 100vw, 35vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" /><div className="absolute inset-0 bg-gradient-to-t from-navy-deep/60 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-navy-deep/25" /></div>
            <div className="flex flex-col justify-center p-6 lg:p-7"><div className="flex items-center gap-2"><span className="rounded-full bg-gold px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-navy">{primary.status === "Upcoming" ? "Next event" : "Recent event"}</span><span className="text-[10px] uppercase tracking-[0.17em] text-white/55">{primary.type}</span></div><h3 className="mt-4 text-xl font-bold leading-snug text-white group-hover:text-gold">{primary.title}</h3><div className="mt-4 space-y-1.5 text-xs text-white/60"><span className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-gold" />{primary.date}</span><span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-gold" />{primary.location}</span></div></div>
          </Link>
          <div className="divide-y divide-white/10 lg:col-span-5">{events.slice(1).map((event) => <Link key={event.slug} to="/events/$slug" params={{ slug: event.slug }} className="group flex min-h-[130px] items-center gap-4 p-5 transition-colors hover:bg-white/[0.05]"><div className="w-12 shrink-0 rounded-xl border border-gold/30 bg-gold/10 py-2 text-center"><span className="block text-xl font-black leading-none text-gold">{event.dateShort.day}</span><span className="mt-1 block text-[9px] font-bold tracking-[0.2em] text-white/60">{event.dateShort.month}</span></div><div className="min-w-0"><span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">{event.status} · {event.type}</span><h3 className="mt-1 line-clamp-2 text-base font-bold leading-snug text-white group-hover:text-gold">{event.title}</h3><p className="mt-2 truncate text-xs text-white/55">{event.location}</p></div></Link>)}</div>
        </div>
      </div>
    </section>
  );
}
