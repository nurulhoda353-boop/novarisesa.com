"use client";

import { ArrowUpRight, CalendarDays } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { Link } from "@/components/nav/AppLink";
import { useTranslatedEvents } from "@/i18n/use-translated-blog";
import { selectEventPreview } from "@/lib/blog-data";
import { EventCard } from "./EventCard";

export function EventsSection({ preview = false }: { preview?: boolean }) {
  const events = useTranslatedEvents();
  const visible = selectEventPreview(events, 3);
  const hasUpcoming = visible.some((event) => event.status === "Upcoming");

  return (
    <section id="events" className="relative overflow-hidden bg-navy-deep py-20 text-white lg:py-28">
      <div className="pointer-events-none absolute -left-32 -top-40 h-[520px] w-[520px] rounded-full bg-gold/10 blur-[160px]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      <div className="relative container-wide">
        <Reveal>
          <div className="mb-12 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold"><CalendarDays className="h-4 w-4" /> Events & engagements</div>
              <h2 className="text-3xl font-bold leading-[1.05] md:text-4xl lg:text-5xl">
                {hasUpcoming ? "Where we will be next." : "Our latest industry engagements."}
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/65">Meet our leadership and delivery teams at the forums shaping Saudi Arabia&apos;s industrial future.</p>
            </div>
            <Link to="/events" className="inline-flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-navy">
              Explore all events <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>

        {visible.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7"><EventCard event={visible[0]} featured /></div>
            <div className="grid gap-6 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
              {visible.slice(1, 3).map((event) => <EventCard key={event.slug} event={event} dark />)}
              {visible.length === 1 && (
                <div className="flex min-h-48 flex-col justify-center rounded-2xl border border-white/10 bg-white/[0.04] p-7">
                  <span className="text-xs font-bold uppercase tracking-[0.25em] text-gold">Stay connected</span>
                  <p className="mt-3 text-lg font-semibold">More NOVARISE engagements will be announced here.</p>
                  <Link to="/events" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-gold">Explore events <ArrowUpRight className="h-4 w-4" /></Link>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center">
            <p className="text-xl font-semibold">New events will be announced soon.</p>
            <Link to="/contact" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-gold">Stay connected <ArrowUpRight className="h-4 w-4" /></Link>
          </div>
        )}

        {!preview && <p className="mt-8 text-center text-xs uppercase tracking-[0.2em] text-white/35">Upcoming events are prioritised automatically · Recent events fill any open positions</p>}
      </div>
    </section>
  );
}
