import type { Metadata } from "next";
import { EventsArchiveView } from "@/views/EventsArchiveView";

export const metadata: Metadata = {
  title: "Events — NOVARISE",
  description: "Explore upcoming NOVARISE conferences, exhibitions and leadership sessions, plus recaps from previous industry events.",
  alternates: { canonical: "/events" },
};

export default function Page() { return <EventsArchiveView />; }
