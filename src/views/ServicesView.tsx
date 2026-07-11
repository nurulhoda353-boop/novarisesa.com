"use client";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ServicesHero } from "@/components/services/ServicesHero";
import { ServicesOverview } from "@/components/services/ServicesOverview";
import { ServicesProcess } from "@/components/services/ServicesProcess";
import { ServicesIndustries } from "@/components/services/ServicesIndustries";
import { ServicesTrust } from "@/components/services/ServicesTrust";
import { FAQ } from "@/components/site/FAQ";
import { CTA } from "@/components/site/CTA";

export function ServicesView() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero (dark) → 2 light (middle brighter) → dark → 2 light */}
        <ServicesHero />
        <ServicesOverview />
        <div className="section-bright"><ServicesProcess /></div>
        <ServicesIndustries />
        <div className="section-bright"><ServicesTrust /></div>
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
