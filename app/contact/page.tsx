import type { Metadata } from "next";
import { ContactView } from "@/views/ContactView";

export const metadata: Metadata = {
  title: "Contact — NOVARISE Trading & Contracting",
  description:
    "Reach NOVARISE in Riyadh — phone, email, WhatsApp and inquiry form. We respond to RFQs and pre-qualification requests within one business day.",
  alternates: { canonical: "/contact" },
  openGraph: {
    images: ["/og-image.jpg"],
    url: "/contact",
    title: "Contact NOVARISE — Let's build the Kingdom's next milestone",
    description:
      "Send a message, request a callback or visit our Riyadh headquarters. Trusted by Aramco, SABIC and the Kingdom's leading EPCs.",
  },
};

export default function Page() {
  return <ContactView />;
}
