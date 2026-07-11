"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowUpRight, Loader2, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { Reveal } from "@/components/site/Reveal";
import { mailtoUrl } from "@/lib/site";

type FormValues = {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  subject: string;
  message: string;
};

function FloatField({
  id, label, error, valid, children,
}: {
  id: string;
  label: string;
  error?: string;
  valid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative">
      <div className="relative">
        {children}
        <label
          htmlFor={id}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground transition-all duration-200
            peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2
            peer-focus:top-0 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-[0.22em] peer-focus:text-gold peer-focus:px-1.5 peer-focus:bg-card
            peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-[0.22em] peer-[:not(:placeholder-shown)]:text-navy peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:bg-card"
        >
          {label}
        </label>
        {valid && !error && (
          <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gold animate-fade-in" strokeWidth={2} />
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-destructive animate-fade-in">{error}</p>}
    </div>
  );
}

export function ContactForm() {
  const { t } = useTranslation();
  const subjects = t("contactPage.form.subjects", { returnObjects: true }) as string[];

  const schema = useMemo(() => z.object({
    name: z.string().trim().min(2, t("contactPage.form.errors.nameShort")).max(100),
    email: z.string().trim().email(t("contactPage.form.errors.emailInvalid")).max(255),
    company: z.string().trim().max(150).optional().or(z.literal("")),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    subject: z.string().trim().min(1, t("contactPage.form.errors.subjectRequired")),
    message: z.string().trim().min(10, t("contactPage.form.errors.messageMin")).max(2000, t("contactPage.form.errors.messageMax")),
  }), [t]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { name: "", email: "", company: "", phone: "", subject: "", message: "" },
  });

  const values = watch();
  const isValid = (k: keyof FormValues, min = 1) =>
    !!dirtyFields[k] && !errors[k] && (values[k] ?? "").toString().trim().length >= min;

  const onSubmit = async (data: FormValues) => {
    const body = [
      `Name: ${data.name}`,
      `Email: ${data.email}`,
      `Company: ${data.company || "-"}`,
      `Phone: ${data.phone || "-"}`,
      `Subject: ${data.subject}`,
      "",
      data.message,
    ].join("\n");
    window.location.href = mailtoUrl(`Contact — ${data.subject}`, body);
    toast.success(t("contactPage.form.toastTitle"), {
      description: t("contactPage.form.toastDesc"),
    });
    reset();
  };

  const inputBase =
    "peer w-full rounded-xl border border-border bg-card px-4 pt-5 pb-2 text-sm text-navy placeholder-transparent focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all";

  return (
    <Reveal>
      <form
        id="contact-form"
        onSubmit={handleSubmit(onSubmit)}
        className="relative rounded-2xl border border-border bg-card p-7 lg:p-10 shadow-elegant overflow-hidden"
      >
        <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-gold/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-navy/5 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-3">
            <span className="h-px w-8 bg-gold" /> {t("contactPage.form.eyebrow")}
          </div>
          <h2 className="text-2xl lg:text-3xl font-display font-bold text-navy leading-tight">
            {t("contactPage.form.title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("contactPage.form.sub")}
          </p>

          <div className="mt-8 grid sm:grid-cols-2 gap-5">
            <FloatField id="name" label={t("contactPage.form.fields.name")} error={errors.name?.message} valid={isValid("name", 2)}>
              <input id="name" placeholder={t("contactPage.form.fields.name")} {...register("name")} className={inputBase} />
            </FloatField>

            <FloatField id="email" label={t("contactPage.form.fields.email")} error={errors.email?.message} valid={isValid("email", 5) && /@/.test(values.email)}>
              <input id="email" type="email" placeholder={t("contactPage.form.fields.email")} {...register("email")} className={inputBase} />
            </FloatField>

            <FloatField id="company" label={t("contactPage.form.fields.company")} valid={isValid("company", 2)}>
              <input id="company" placeholder={t("contactPage.form.fields.company")} {...register("company")} className={inputBase} />
            </FloatField>

            <FloatField id="phone" label={t("contactPage.form.fields.phone")} valid={isValid("phone", 5)}>
              <input id="phone" placeholder={t("contactPage.form.fields.phone")} {...register("phone")} className={inputBase} />
            </FloatField>

            <div className="sm:col-span-2">
              <FloatField id="subject" label={t("contactPage.form.fields.subject")} error={errors.subject?.message} valid={isValid("subject")}>
                <select
                  id="subject"
                  {...register("subject")}
                  defaultValue=""
                  className={`${inputBase} appearance-none cursor-pointer`}
                >
                  <option value="" disabled>&nbsp;</option>
                  {subjects.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </FloatField>
            </div>

            <div className="sm:col-span-2">
              <div className="group relative">
                <textarea
                  id="message"
                  rows={6}
                  placeholder={t("contactPage.form.fields.message")}
                  {...register("message")}
                  className="peer w-full rounded-xl border border-border bg-card px-4 pt-6 pb-3 text-sm text-navy placeholder-transparent focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all resize-none"
                />
                <label
                  htmlFor="message"
                  className="pointer-events-none absolute left-4 top-4 text-sm text-muted-foreground transition-all duration-200
                    peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm
                    peer-focus:top-1 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-[0.22em] peer-focus:text-gold peer-focus:px-1.5 peer-focus:bg-card
                    peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-[0.22em] peer-[:not(:placeholder-shown)]:text-navy peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:bg-card"
                >
                  {t("contactPage.form.fields.message")}
                </label>
              </div>
              {errors.message && <p className="mt-1.5 text-xs text-destructive animate-fade-in">{errors.message.message}</p>}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-border">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              {t("contactPage.form.privacy")}
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              data-cursor-label="Send"
              className="group relative inline-flex items-center gap-3 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-gold-foreground shadow-gold overflow-hidden transition-all hover:scale-[1.03] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <span className="relative z-10 inline-flex items-center gap-2">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? t("contactPage.form.submitting") : t("contactPage.form.submit")}
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
