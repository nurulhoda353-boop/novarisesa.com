"use client";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CapabilitiesHero } from "@/components/capabilities/CapabilitiesHero";
import { Capabilities } from "@/components/site/Capabilities";
import { Process } from "@/components/site/Process";
import { WhyChooseUs } from "@/components/site/WhyChooseUs";
import { HSE } from "@/components/site/HSE";
import { Numbers } from "@/components/site/Numbers";
import { CTA } from "@/components/site/CTA";

export function CapabilitiesView() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero (dark) → alternating light pairs (middle brighter) */}
        <CapabilitiesHero />
        <Capabilities />
        <div className="section-bright"><Numbers /></div>
        <Process />
        <div className="section-bright"><WhyChooseUs /></div>
        <HSE />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
