import type { Metadata } from "next";
import { BlogArchiveView } from "@/views/BlogArchiveView";
import { cmsPageMetadata } from "@/lib/cms-metadata";

const fallbackMetadata: Metadata = {
  title: "NOVARISE Insights — Industrial Articles & Case Studies",
  description: "Field-tested industrial insights, case studies, safety perspectives and Vision 2030 analysis from NOVARISE.",
  alternates: { canonical: "/blog" },
  openGraph: {
    images: ["/og-image.jpg"],
    url: "/blog",
    title: "NOVARISE Insights — Field notes from Saudi Arabia's industrial frontline",
    description: "Read the latest NOVARISE case studies, delivery playbooks, equipment trends and HSE leadership perspectives.",
  },
};

export const generateMetadata = () => cmsPageMetadata("blog-archive", fallbackMetadata);

export default function Page() { return <BlogArchiveView />; }
