import type { Metadata } from "next";
import { RequirementsView } from "@/views/RequirementsView";
import { cmsPageMetadata } from "@/lib/cms-metadata";

const fallbackMetadata: Metadata = {
  title: "Urgent Manpower Requirements — NOVARISE KSA",
  description:
    "Live urgent manpower requirements for NOVARISE Saudi Arabia projects — 6G welders, multi welders, electrical foremen and more. Apply via WhatsApp.",
  alternates: { canonical: "/requirements" },
  openGraph: {
    images: ["/og-image.jpg"],
    url: "/requirements",
    title: "Urgent Requirements — NOVARISE Saudi Arabia",
    description:
      "Aramco-approved positions hiring now. Long-term contracts, monthly salary, food & accommodation provided.",
  },
};
export const generateMetadata = () => cmsPageMetadata("requirements", fallbackMetadata);

export default function Page() {
  return <RequirementsView />;
}
