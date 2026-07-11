import type { Metadata } from "next";
import { HomeView } from "@/views/HomeView";

export const metadata: Metadata = {
  title: "NOVARISE — Trading & Contracting Company | Saudi Arabia",
  description:
    "NOVARISE delivers world-class manpower, equipment rental and contracting solutions to Saudi Arabia's largest industrial megaprojects. Aramco & SABIC approved.",
  alternates: { canonical: "/" },
  openGraph: {
    images: ["/og-image.jpg"],
    url: "/",
    title: "NOVARISE — Engineering the Kingdom's Future",
    description:
      "Trusted by Saudi Aramco, SABIC, Samsung Engineering & Hyundai. 2,500+ skilled workforce. Aligned with Vision 2030.",
  },
};

export default function Page() {
  return <HomeView />;
}
