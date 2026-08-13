import type { Metadata } from "next";
import { events } from "@/lib/blog-data";
import { absoluteUrl } from "@/lib/site";
import { cmsDetailMetadata } from "@/lib/cms-detail-metadata";
import { EventDetailView } from "@/views/EventDetailView";

export function generateStaticParams() { return events.map((event) => ({ slug: event.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = events.find((item) => item.slug === slug);
  if (!event) return {};
  const canonical = absoluteUrl(`/events/${slug}`);
  return cmsDetailMetadata("events", slug, {
    title: `${event.title} — NOVARISE Events`, description: event.description,
    alternates: { canonical }, openGraph: { url: canonical, title: event.title, description: event.description, images: [event.image] },
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; return <EventDetailView slug={slug} />; }
export const dynamicParams = true;
