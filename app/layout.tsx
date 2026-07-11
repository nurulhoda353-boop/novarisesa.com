import type { Metadata } from "next";
import { Poppins, Noto_Kufi_Arabic } from "next/font/google";
import { Providers } from "./providers";
import { SITE_URL } from "@/lib/site";
import "@/styles.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

const notoKufiArabic = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  weight: ["400", "600", "800"],
  variable: "--font-noto-kufi",
  display: "swap",
});

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
    <html lang="en" className={`${poppins.variable} ${notoKufiArabic.variable}`}>
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
