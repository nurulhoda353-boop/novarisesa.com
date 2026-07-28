import type { Metadata } from "next";
import { RfqView } from "@/views/RfqView";
import { cmsPageMetadata } from "@/lib/cms-metadata";

const fallbackMetadata: Metadata = {
  title: "Request RFQ — NOVARISE Trading & Contracting",
  description:
    "Submit your scope, location and timeline. NOVARISE responds to RFQs within one business day with a structured proposal and full pre-qualification pack.",
  alternates: { canonical: "/rfq" },
  openGraph: {
    images: ["/og-image.jpg"],
    url: "/rfq",
    title: "Request a Quote — NOVARISE",
    description:
      "Aramco & SABIC approved. Mobilize certified manpower, equipment and contracting in 14–21 days. Start your RFQ now.",
  },
};
export const generateMetadata = () => cmsPageMetadata("rfq", fallbackMetadata);

export default function Page() {
  return <RfqView />;
}
