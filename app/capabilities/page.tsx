import type { Metadata } from "next";
import { CapabilitiesView } from "@/views/CapabilitiesView";

export const metadata: Metadata = {
  title: "Capabilities — NOVARISE Trading & Contracting",
  description:
    "Discover NOVARISE's six integrated capability pillars — civil construction, power, equipment rental, manpower, IT and materials trading — engineered for Saudi Arabia's industrial megaprojects.",
  alternates: { canonical: "/capabilities" },
  openGraph: {
    images: ["/og-image.jpg"],
    url: "/capabilities",
    title: "Our Capabilities — NOVARISE",
    description:
      "Six pillars. One trusted partner. Owned fleet, certified crews and Aramco/SABIC-approved delivery across the Kingdom.",
  },
};

export default function Page() {
  return <CapabilitiesView />;
}
