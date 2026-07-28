import type { Metadata } from "next";
import { AboutView } from "@/views/AboutView";
import { cmsPageMetadata } from "@/lib/cms-metadata";

const fallbackMetadata: Metadata = {
  title: "About Us — NOVARISE Trading & Contracting Company",
  description:
    "Founded in 2019 in Riyadh, NOVARISE delivers certified manpower, owned equipment and end-to-end contracting to Saudi Arabia's largest industrial megaprojects. Aramco & SABIC approved.",
  alternates: { canonical: "/about" },
  openGraph: {
    images: ["/og-image.jpg"],
    url: "/about",
    title: "About NOVARISE — A trusted name in the Kingdom's industrial story",
    description:
      "Discover NOVARISE: our company profile, mission & vision, message from the CEO, and why the Kingdom's most demanding operators trust us.",
  },
};
export const generateMetadata = () => cmsPageMetadata("about", fallbackMetadata);

export default function Page() {
  return <AboutView />;
}
