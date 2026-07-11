"use client";

import { ContactForm } from "./ContactForm";
import { ContactInfo } from "./ContactInfo";

export function ContactSection() {
  return (
    <section className="relative py-16 lg:py-24 bg-white overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -right-40 h-[460px] w-[460px] rounded-full bg-gold/10 blur-[140px] anim-breathe" />
      <div className="container-wide relative">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          <div className="lg:col-span-7">
            <ContactForm />
          </div>
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <ContactInfo />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
