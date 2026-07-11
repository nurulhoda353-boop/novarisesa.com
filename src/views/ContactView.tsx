"use client";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ContactHero } from "@/components/contact/ContactHero";
import { ContactSection } from "@/components/contact/ContactSection";
import { ContactMap } from "@/components/contact/ContactMap";
import { FAQ } from "@/components/site/FAQ";

export function ContactView() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero (dark) → 2 light (middle brighter) → light */}
        <ContactHero />
        <ContactSection />
        <div className="section-bright"><ContactMap /></div>
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
