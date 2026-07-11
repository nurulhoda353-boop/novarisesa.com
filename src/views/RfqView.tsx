"use client";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { RFQHero } from "@/components/rfq/RFQHero";
import { RFQForm } from "@/components/rfq/RFQForm";
import { RFQSidebar } from "@/components/rfq/RFQSidebar";
import { FAQ } from "@/components/site/FAQ";

export function RfqView() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <RFQHero />
        <section className="relative py-16 lg:py-24 bg-white overflow-hidden">
          <div className="pointer-events-none absolute -top-40 -right-40 h-[460px] w-[460px] rounded-full bg-gold/10 blur-[140px] anim-breathe" />
          <div className="container-wide relative">
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
              <div className="lg:col-span-8">
                <RFQForm />
              </div>
              <div className="lg:col-span-4 lg:sticky lg:top-28">
                <RFQSidebar />
              </div>
            </div>
          </div>
        </section>
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
