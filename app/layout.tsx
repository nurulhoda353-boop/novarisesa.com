import type { Metadata } from "next";
import "@fontsource/poppins/300.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/800.css";
import "@fontsource/noto-kufi-arabic/400.css";
import "@fontsource/noto-kufi-arabic/600.css";
import "@fontsource/noto-kufi-arabic/800.css";
import { Providers } from "./providers";
import { SITE_URL } from "@/lib/site";
import "@/styles.css";

const DESCRIPTION =
  "NOVARISE — Trading & Contracting Company delivering premium industrial solutions across Saudi Arabia.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "NOVARISE Trading & Contracting Company",
    template: "%s",
  },
  description: DESCRIPTION,
  authors: [{ name: "NOVARISE" }],
  alternates: { canonical: "/" },
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "NOVARISE",
    url: "/",
    title: "NOVARISE Trading & Contracting Company",
    description: DESCRIPTION,
    images: ["/og-image.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "NOVARISE Trading & Contracting Company",
    description: DESCRIPTION,
    images: ["/og-image.jpg"],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "NOVARISE Trading & Contracting Company",
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.png`,
  description: DESCRIPTION,
  areaServed: "SA",
  sameAs: [],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
