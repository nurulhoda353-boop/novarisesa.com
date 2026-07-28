import type { Metadata } from "next";
import { BlogView } from "@/views/BlogView";
import { cmsPageMetadata } from "@/lib/cms-metadata";

const fallbackMetadata: Metadata = {
  title: "Blog & Events — NOVARISE Trading & Contracting Company",
  description:
    "Insights, case studies, safety perspectives and upcoming events from NOVARISE — the Kingdom's trusted partner for megaproject manpower, equipment and contracting.",
  alternates: { canonical: "/blog" },
  openGraph: {
    images: ["/og-image.jpg"],
    url: "/blog",
    title: "NOVARISE Blog & Events — Field notes from Saudi Arabia's industrial frontline",
    description:
      "Read the latest from NOVARISE: case studies, Vision 2030 analysis, equipment trends, HSE leadership and upcoming industry events.",
  },
};
export const generateMetadata = () => cmsPageMetadata("blog", fallbackMetadata);

export default function Page() {
  return <BlogView />;
}
