"use client";

import Image from "next/image";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { Link } from "@/components/nav/AppLink";
import type { EventItem } from "@/lib/blog-data";

export function EventCard({ event, featured = false, dark = false }: { event: EventItem; featured?: boolean; dark?: boolean }) {
  const past = event.status === "Past";
  if (featured) {
    return (
      <Link to="/events/$slug" params={{ slug: event.slug }} className="group relative block min-h-[330px] overflow-hidden rounded-2xl border border-white/10 shadow-elegant lg:min-h-[360px]">
        <Image src={event.image} alt={event.title} fill sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover transition-transform duration-[1200ms] group-hover:scale-[1.05]" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/60 to-navy-deep/5" />
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-7">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-navy">{past ? "Recent event" : "Next event"}</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white">{event.type}</span>
          </div>
          <h3 className="max-w-3xl text-2xl font-bold leading-tight text-white md:text-3xl">{event.title}</h3>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/75">
            <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-gold" />{event.date}</span>
            <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-gold" />{event.location}</span>
          </div>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-gold">{past ? "View event recap" : "View event"}<ArrowUpRight className="h-4 w-4 transition-transform group-hover:rotate-45" /></span>
        </div>
      </Link>
    );
  }

  return (
    <Link to="/events/$slug" params={{ slug: event.slug }} className="block h-full">
      <article className={`group flex h-full flex-col overflow-hidden rounded-2xl border transition-all duration-500 hover:-translate-y-1 ${dark ? "border-white/10 bg-white/[0.05] hover:border-gold/50" : "border-border bg-card hover:border-gold/60 hover:shadow-elegant"}`}>
        <div className="relative aspect-[16/9] overflow-hidden">
          <Image src={event.image} alt={event.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-[1000ms] group-hover:scale-[1.06]" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/70 via-transparent to-transparent" />
          <div className="absolute left-4 top-4 rounded-xl border border-gold/40 bg-navy-deep/90 px-3 py-2 text-center text-white backdrop-blur">
            <span className="block text-2xl font-black leading-none text-gold">{event.dateShort.day}</span>
            <span className="mt-1 block text-[9px] font-bold tracking-[0.25em]">{event.dateShort.month}</span>
          </div>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] ${dark ? "bg-white/10 text-white" : "bg-navy/5 text-navy"}`}>{event.type}</span>
            <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-gold">{event.status}</span>
          </div>
          <h3 className={`text-lg font-bold leading-snug transition-colors group-hover:text-gold ${dark ? "text-white" : "text-navy"}`}>{event.title}</h3>
          <p className={`mt-3 line-clamp-2 text-sm leading-relaxed ${dark ? "text-white/60" : "text-muted-foreground"}`}>{event.description}</p>
          <div className={`mt-auto flex items-center justify-between border-t pt-4 text-xs ${dark ? "border-white/10 text-white/60" : "border-border text-muted-foreground"}`}>
            <span className="inline-flex min-w-0 items-center gap-1.5 truncate"><MapPin className="h-3.5 w-3.5 shrink-0 text-gold" />{event.location}</span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-gold transition-transform group-hover:rotate-45" />
          </div>
        </div>
      </article>
    </Link>
  );
}
