import type { Metadata } from "next";
import { InsightsHubView } from "@/views/InsightsHubView";

export const metadata: Metadata = {
  title: "Insights & Events — NOVARISE",
  description: "Explore NOVARISE industrial insights, project case studies, upcoming engagements and event recaps from Saudi Arabia.",
  alternates: { canonical: "/insights" },
};

export default function Page() { return <InsightsHubView />; }
