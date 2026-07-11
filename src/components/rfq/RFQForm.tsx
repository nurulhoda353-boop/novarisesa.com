"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowUpRight, Loader2, User, Mail, Building, Phone, MapPin, Calendar,
  ClipboardList, Briefcase, Wallet,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Reveal } from "@/components/site/Reveal";
import { mailtoUrl } from "@/lib/site";

type FormValues = {
  name: string;
  email: string;
  company: string;
  phone: string;
  service: string;
  location: string;
  timeline: string;
  budget?: string;
  scope: string;
};

export function RFQForm() {
  const { t } = useTranslation();
  const services = t("rfqPage.form.services", { returnObjects: true }) as string[];
  const budgets = t("rfqPage.form.budgets", { returnObjects: true }) as string[];
  const timelines = t("rfqPage.form.timelines", { returnObjects: true }) as string[];

  const schema = useMemo(() => z.object({
    name: z.string().trim().min(2, t("rfqPage.form.errors.nameShort")).max(100),
    email: z.string().trim().email(t("rfqPage.form.errors.emailInvalid")).max(255),
    company: z.string().trim().min(1, t("rfqPage.form.errors.companyRequired")).max(150),
    phone: z.string().trim().min(6, t("rfqPage.form.errors.phoneInvalid")).max(40),
    service: z.string().trim().min(1, t("rfqPage.form.errors.serviceRequired")),
    location: z.string().trim().min(2, t("rfqPage.form.errors.locationRequired")).max(150),
    timeline: z.string().trim().min(1, t("rfqPage.form.errors.timelineRequired")),
    budget: z.string().trim().optional().or(z.literal("")),
    scope: z.string().trim().min(20, t("rfqPage.form.errors.scopeMin")).max(3000, t("rfqPage.form.errors.scopeMax")),
  }), [t]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", email: "", company: "", phone: "",
      service: "", location: "", timeline: "", budget: "", scope: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    const body = [
      `Name: ${data.name}`,
      `Email: ${data.email}`,
      `Company: ${data.company}`,
      `Phone: ${data.phone}`,
      `Service: ${data.service}`,
      `Location: ${data.location}`,
      `Timeline: ${data.timeline}`,
      `Budget: ${data.budget || "-"}`,
      "",
      "Scope:",
      data.scope,
    ].join("\n");
    window.location.href = mailtoUrl(`RFQ — ${data.service} (${data.company})`, body);
    toast.success(t("rfqPage.form.toastTitle"), {
      description: t("rfqPage.form.toastDesc"),
    });
    reset();
  };

  const fieldBase =
    "w-full rounded-xl border border-border bg-card pl-11 pr-4 py-3.5 text-sm text-navy placeholder:text-muted-foreground/60 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all";
  const labelBase = "text-[11px] uppercase tracking-[0.22em] font-semibold text-navy mb-2 block";
  const iconBase = "absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gold";

  const Section = ({ num, title, children }: { num: string; title: string; children: React.ReactNode }) => (
    <div className="relative">
      <div className="flex items-center gap-3 mb-5">
        <span className="h-8 w-8 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center">
          <span className="text-[11px] font-mono text-gold tracking-wider">{num}</span>
        </span>
        <h3 className="text-base font-display font-bold text-navy uppercase tracking-[0.18em]">{title}</h3>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="grid sm:grid-cols-2 gap-5">{children}</div>
    </div>
  );

  return (
    <Reveal>
      <form
        id="rfq-form"
        onSubmit={handleSubmit(onSubmit)}
        className="relative rounded-2xl border border-border bg-card p-7 lg:p-10 shadow-elegant overflow-hidden"
      >
        <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-gold/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-navy/5 blur-3xl" />

        <div className="relative space-y-10">
          <Section num="01" title={t("rfqPage.form.sections.contact")}>
            <div>
              <label className={labelBase} htmlFor="name">{t("rfqPage.form.fields.name")}</label>
              <div className="relative">
                <User className={iconBase} strokeWidth={1.8} />
                <input id="name" {...register("name")} placeholder={t("rfqPage.form.fields.namePh")} className={fieldBase} />
              </div>
              {errors.name && <p className="mt-1.5 text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div>
              <label className={labelBase} htmlFor="email">{t("rfqPage.form.fields.email")}</label>
              <div className="relative">
                <Mail className={iconBase} strokeWidth={1.8} />
                <input id="email" type="email" {...register("email")} placeholder={t("rfqPage.form.fields.emailPh")} className={fieldBase} />
              </div>
              {errors.email && <p className="mt-1.5 text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div>
              <label className={labelBase} htmlFor="company">{t("rfqPage.form.fields.company")}</label>
              <div className="relative">
                <Building className={iconBase} strokeWidth={1.8} />
                <input id="company" {...register("company")} placeholder={t("rfqPage.form.fields.companyPh")} className={fieldBase} />
              </div>
              {errors.company && <p className="mt-1.5 text-xs text-destructive">{errors.company.message}</p>}
            </div>
            <div>
              <label className={labelBase} htmlFor="phone">{t("rfqPage.form.fields.phone")}</label>
              <div className="relative">
                <Phone className={iconBase} strokeWidth={1.8} />
                <input id="phone" {...register("phone")} placeholder={t("rfqPage.form.fields.phonePh")} className={fieldBase} />
              </div>
              {errors.phone && <p className="mt-1.5 text-xs text-destructive">{errors.phone.message}</p>}
            </div>
          </Section>

          <Section num="02" title={t("rfqPage.form.sections.project")}>
            <div>
              <label className={labelBase} htmlFor="service">{t("rfqPage.form.fields.service")}</label>
              <div className="relative">
                <Briefcase className={iconBase} strokeWidth={1.8} />
                <select id="service" {...register("service")} className={`${fieldBase} appearance-none cursor-pointer`} defaultValue="">
                  <option value="" disabled>{t("rfqPage.form.fields.servicePh")}</option>
                  {services.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
              {errors.service && <p className="mt-1.5 text-xs text-destructive">{errors.service.message}</p>}
            </div>
            <div>
              <label className={labelBase} htmlFor="location">{t("rfqPage.form.fields.location")}</label>
              <div className="relative">
                <MapPin className={iconBase} strokeWidth={1.8} />
                <input id="location" {...register("location")} placeholder={t("rfqPage.form.fields.locationPh")} className={fieldBase} />
              </div>
              {errors.location && <p className="mt-1.5 text-xs text-destructive">{errors.location.message}</p>}
            </div>
            <div>
              <label className={labelBase} htmlFor="timeline">{t("rfqPage.form.fields.timeline")}</label>
              <div className="relative">
                <Calendar className={iconBase} strokeWidth={1.8} />
                <select id="timeline" {...register("timeline")} className={`${fieldBase} appearance-none cursor-pointer`} defaultValue="">
                  <option value="" disabled>{t("rfqPage.form.fields.timelinePh")}</option>
                  {timelines.map((t2) => (<option key={t2} value={t2}>{t2}</option>))}
                </select>
              </div>
              {errors.timeline && <p className="mt-1.5 text-xs text-destructive">{errors.timeline.message}</p>}
            </div>
            <div>
              <label className={labelBase} htmlFor="budget">{t("rfqPage.form.fields.budget")}</label>
              <div className="relative">
                <Wallet className={iconBase} strokeWidth={1.8} />
                <select id="budget" {...register("budget")} className={`${fieldBase} appearance-none cursor-pointer`} defaultValue="">
                  <option value="">{t("rfqPage.form.fields.budgetPh")}</option>
                  {budgets.map((b) => (<option key={b} value={b}>{b}</option>))}
                </select>
              </div>
            </div>
          </Section>

          <div>
            <div className="flex items-center gap-3 mb-5">
              <span className="h-8 w-8 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center">
                <span className="text-[11px] font-mono text-gold tracking-wider">03</span>
              </span>
              <h3 className="text-base font-display font-bold text-navy uppercase tracking-[0.18em]">{t("rfqPage.form.sections.scope")}</h3>
              <div className="flex-1 h-px bg-border" />
            </div>
            <label className={labelBase} htmlFor="scope">
              <span className="inline-flex items-center gap-2">
                <ClipboardList className="h-3.5 w-3.5 text-gold" /> {t("rfqPage.form.fields.scope")}
              </span>
            </label>
            <textarea
              id="scope"
              rows={7}
              {...register("scope")}
              placeholder={t("rfqPage.form.fields.scopePh")}
              className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-sm text-navy placeholder:text-muted-foreground/60 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all resize-none"
            />
            {errors.scope && <p className="mt-1.5 text-xs text-destructive">{errors.scope.message}</p>}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-border">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground max-w-md">
              {t("rfqPage.form.privacy")}
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative inline-flex items-center gap-3 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-gold-foreground shadow-gold overflow-hidden transition-all hover:scale-[1.03] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <span className="relative z-10 inline-flex items-center gap-2">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? t("rfqPage.form.submitting") : t("rfqPage.form.submit")}
              </span>
              <ArrowUpRight className="relative z-10 h-4 w-4 transition-transform group-hover:rotate-45" />
              <span className="absolute inset-0 -translate-x-full bg-white/25 skew-x-12 transition-transform duration-700 group-hover:translate-x-full" />
            </button>
          </div>
        </div>
      </form>
    </Reveal>
  );
}
