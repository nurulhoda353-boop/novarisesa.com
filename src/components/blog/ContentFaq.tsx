"use client";

import { useState } from "react";
import { ArrowUpRight, Plus } from "lucide-react";
import { Link } from "@/components/nav/AppLink";

type Faq = { question: string; answer: string };

export function ContentFaq({
  eyebrow,
  title,
  description,
  items,
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: Faq[];
}) {
  const [open, setOpen] = useState(0);
  return (
    <section className="border-y border-border bg-sand-soft py-14 lg:py-16">
      <div className="container-wide grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-4">
          <div className="eyebrow mb-3">{eyebrow}</div>
          <h2 className="text-3xl font-bold leading-[1.08] text-navy">{title}</h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
          <Link to="/contact" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-gold">Still need help? <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
        <div className="lg:col-span-8">
          <div className="divide-y divide-border border-y border-border">
            {items.map((item, index) => {
              const active = index === open;
              return <div key={item.question}>
                <button type="button" onClick={() => setOpen(active ? -1 : index)} className="flex w-full items-center justify-between gap-6 py-5 text-left">
                  <span className="text-base font-semibold leading-snug text-navy">{item.question}</span>
                  <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all ${active ? "rotate-45 border-gold bg-gold text-navy" : "border-border bg-card text-navy"}`}><Plus className="h-4 w-4" /></span>
                </button>
                {active && <p className="max-w-3xl pb-5 pr-10 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>}
              </div>;
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
