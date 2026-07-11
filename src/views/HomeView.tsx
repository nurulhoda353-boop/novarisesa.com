"use client";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/site/Hero";
import { About } from "@/components/site/About";
import { Industries } from "@/components/site/Industries";
import { Numbers } from "@/components/site/Numbers";
import { Vision2030 } from "@/components/site/Vision2030";
import { Projects } from "@/components/site/Projects";
import { HSE } from "@/components/site/HSE";
import { Certifications } from "@/components/site/Certifications";
import { Testimonials } from "@/components/site/Testimonials";
import { Leadership } from "@/components/site/Leadership";
import { WhyChooseUs } from "@/components/site/WhyChooseUs";
import { CareersTeaser } from "@/components/site/CareersTeaser";
import { UrgentRequirementsStrip } from "@/components/site/UrgentRequirementsStrip";
import { FAQ } from "@/components/site/FAQ";
import { Partners } from "@/components/site/Partners";
import { CTA } from "@/components/site/CTA";
import { SectionReveal } from "@/components/site/SectionReveal";

export function HomeView() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero (dark) + announcement marquee — no reveal on hero itself */}
        <Hero />
        <UrgentRequirementsStrip />

        {/* Rhythm: 2 light (middle brighter) → 1 dark */}
        <SectionReveal><About /></SectionReveal>
        <SectionReveal className="section-bright"><Numbers /></SectionReveal>
        <SectionReveal><Industries /></SectionReveal>

        <SectionReveal><Vision2030 /></SectionReveal>
        <SectionReveal className="section-bright"><HSE /></SectionReveal>
        <SectionReveal><Projects /></SectionReveal>

        <SectionReveal><Testimonials /></SectionReveal>
        <SectionReveal className="section-bright"><Certifications /></SectionReveal>
        <SectionReveal><Leadership /></SectionReveal>

        <SectionReveal><WhyChooseUs /></SectionReveal>
        <SectionReveal className="section-bright"><CareersTeaser /></SectionReveal>
        <SectionReveal><Partners /></SectionReveal>

        {/* Closing pair — 2 light */}
        <SectionReveal><FAQ /></SectionReveal>
        <SectionReveal className="section-bright"><CTA /></SectionReveal>
      </main>
      <Footer />
    </div>
  );
}
