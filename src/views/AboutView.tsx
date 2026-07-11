"use client";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { AboutHero } from "@/components/about/AboutHero";
import { CompanyProfile } from "@/components/about/CompanyProfile";
import { MissionVision } from "@/components/about/MissionVision";
import { CEOMessage } from "@/components/about/CEOMessage";
import { WhyChooseUs } from "@/components/site/WhyChooseUs";
import { FAQ } from "@/components/site/FAQ";
import { CTA } from "@/components/site/CTA";

export function AboutView() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero (dark) → 2 light (middle brighter) → dark → 2 light */}
        <AboutHero />
        <CompanyProfile />
        <div className="section-bright"><CEOMessage /></div>
        <MissionVision />
        <WhyChooseUs />
        <div className="section-bright"><FAQ /></div>
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
