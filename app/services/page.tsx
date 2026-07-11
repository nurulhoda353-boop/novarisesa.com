import type { Metadata } from "next";
import { ServicesView } from "@/views/ServicesView";

export const metadata: Metadata = {
  title: "Our Services — NOVARISE Trading & Contracting",
  description:
    "NOVARISE delivers integrated contracting services across Saudi Arabia — civil construction, power, equipment rental, manpower supply, IT and materials trading. Aramco & SABIC approved.",
  alternates: { canonical: "/services" },
  openGraph: {
    images: ["/og-image.jpg"],
    url: "/services",
    title: "Our Services — NOVARISE",
    description:
      "Six integrated service pillars engineered for the Kingdom's largest industrial megaprojects — one accountable partner.",
  },
};

export default function Page() {
  return <ServicesView />;
}
