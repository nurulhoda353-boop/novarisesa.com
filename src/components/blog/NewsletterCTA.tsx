"use client";

import { useState } from "react";
import { Mail, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reveal } from "@/components/site/Reveal";
import { mailtoUrl } from "@/lib/site";

export function NewsletterCTA() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="relative py-20 lg:py-24 bg-background overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      <div className="container-wide">
        <Reveal>
          <div className="relative rounded-3xl overflow-hidden border border-border bg-card shadow-elegant">
            <div className="absolute inset-0 gradient-navy opacity-[0.97]" />
            <div className="absolute inset-0 grid-lines opacity-20" />
            <div className="pointer-events-none absolute -top-32 -right-20 h-[420px] w-[420px] rounded-full bg-gold/20 blur-[140px] anim-breathe" />

            <div className="relative px-7 py-12 lg:px-16 lg:py-16 grid lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7">
                <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-5">
                  <Mail className="h-3.5 w-3.5" /> {t("blogPage.newsletter.brand")}
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold tracking-tight text-white leading-[1.05]">
                  {t("blogPage.newsletter.titleA")} <span className="text-gradient-gold">{t("blogPage.newsletter.titleB")}</span>
                </h2>
                <p className="mt-5 text-white/70 text-base md:text-lg max-w-xl leading-relaxed">
                  {t("blogPage.newsletter.sub")}
                </p>
              </div>

              <div className="lg:col-span-5">
                {submitted ? (
                  <div className="rounded-2xl border border-gold/40 bg-white/5 backdrop-blur-md p-6 text-white">
                    <CheckCircle2 className="h-8 w-8 text-gold mb-3" />
                    <div className="text-lg font-semibold">{t("blogPage.newsletter.successTitle")}</div>
                    <p className="text-sm text-white/70 mt-1">
                      {t("blogPage.newsletter.successSub")}
                    </p>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!email.includes("@")) return;
                      window.location.href = mailtoUrl(
                        "Newsletter subscription",
                        `Please subscribe this address to the NOVARISE newsletter:\n\n${email}`,
                      );
                      setSubmitted(true);
                    }}
                    className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md p-5"
                  >
                    <label className="block text-[10px] uppercase tracking-[0.25em] text-white/60 mb-2">
                      {t("blogPage.newsletter.emailLabel")}
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t("blogPage.newsletter.emailPh")}
                        className="flex-1 rounded-full bg-white/10 border border-white/15 px-5 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-gold transition-colors"
                      />
                      <button
                        type="submit"
                        className="group inline-flex items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-gold-foreground shadow-gold transition-transform hover:scale-[1.03]"
                      >
                        {t("blogPage.newsletter.subscribe")}
                        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:rotate-45" />
                      </button>
                    </div>
                    <p className="mt-3 text-[11px] text-white/45">
                      {t("blogPage.newsletter.footnote")}
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
