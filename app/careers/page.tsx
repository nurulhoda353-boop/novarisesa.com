import type { Metadata } from "next";
import { CareersView } from "@/views/CareersView";
import { cmsPageMetadata } from "@/lib/cms-metadata";

const fallbackMetadata: Metadata = {
  title: "Careers — NOVARISE Trading & Contracting Company",
  description:
    "Join NOVARISE — a Saudi industrial leader with 2,500+ certified workforce. Explore careers in engineering, construction, HSE, and operations across the Kingdom.",
  alternates: { canonical: "/careers" },
  openGraph: {
    images: ["/og-image.jpg"],
    url: "/careers",
    title: "Careers at NOVARISE — Build the Kingdom's Future",
    description:
      "Engineers, supervisors, tradesmen and project leaders — build a career on Saudi Arabia's largest industrial megaprojects with NOVARISE.",
  },
};
export const generateMetadata = () => cmsPageMetadata("careers", fallbackMetadata);

export default function Page() {
  return <CareersView />;
}
