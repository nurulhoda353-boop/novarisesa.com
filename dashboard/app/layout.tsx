import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://my.novarisesa.com"),
  title: "NOVARISE Control Center",
  description: "Website content and operations management for NOVARISE.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "NOVARISE Control Center",
    description: "One calm place to run the NOVARISE digital presence.",
    images: ["/control-center-social.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
