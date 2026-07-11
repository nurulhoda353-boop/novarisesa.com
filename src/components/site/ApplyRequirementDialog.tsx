"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  Send,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { RequirementItem } from "@/lib/requirements-data";
import { mailtoUrl } from "@/lib/site";

type FormValues = {
  name: string;
  phone: string;
  email?: string;
  iqama?: string;
  experience: string;
  message?: string;
};

export function ApplyRequirementDialog({
  item,
  positionLabel,
  projectLabel,
  trigger,
}: {
  item: RequirementItem;
  positionLabel: string;
  projectLabel: string;
  trigger: ReactNode;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .trim()
          .min(2, t("requirementsPage.applyForm.errors.nameShort", "Name is too short"))
          .max(100),
        phone: z
          .string()
          .trim()
          .min(6, t("requirementsPage.applyForm.errors.phoneInvalid", "Enter a valid phone / WhatsApp"))
          .max(40),
        email: z
          .string()
          .trim()
          .email(t("requirementsPage.applyForm.errors.emailInvalid", "Invalid email"))
          .max(255)
          .optional()
          .or(z.literal("")),
        iqama: z.string().trim().max(40).optional().or(z.literal("")),
        experience: z
          .string()
          .trim()
          .min(1, t("requirementsPage.applyForm.errors.experienceRequired", "Select your experience")),
        message: z.string().trim().max(800).optional().or(z.literal("")),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: { name: "", phone: "", email: "", iqama: "", experience: "", message: "" },
  });

  const values = watch();
  const isValid = (k: keyof FormValues, min = 1) =>
    !!dirtyFields[k] && !errors[k] && (values[k] ?? "").toString().trim().length >= min;

  const experiences = t("requirementsPage.applyForm.experiences", {
    returnObjects: true,
    defaultValue: [
      "Less than 1 year",
      "1–3 years",
      "3–5 years",
      "5–10 years",
      "10+ years",
    ],
  }) as string[];

  const onSubmit = async (data: FormValues) => {
    const body = [
      `Requirement: ${item.position} (${item.id})`,
      `Name: ${data.name}`,
      `Phone: ${data.phone}`,
      `Email: ${data.email || "-"}`,
      `Iqama: ${data.iqama || "-"}`,
      `Experience: ${data.experience}`,
      "",
      data.message || "",
    ].join("\n");
    window.location.href = mailtoUrl(`Job Application — ${item.position}`, body);
    toast.success(
      t("requirementsPage.applyForm.toastTitle", "Application received"),
      {
        description: t(
          "requirementsPage.applyForm.toastDesc",
          "Our recruitment desk will contact you within 4 working hours.",
        ),
      },
    );
    reset();
    setOpen(false);
  };
  const inputBase =
    "peer w-full rounded-xl border border-border bg-white px-4 pt-5 pb-2 text-sm text-navy placeholder-transparent focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto p-0 bg-sand-soft border-border">
        <div className="relative">
          <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-gold/15 blur-3xl" />
          <div className="relative p-6 lg:p-8">
            <DialogHeader className="text-start">
              <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gold mb-2">
                <span className="h-px w-8 bg-gold" />
                {t("requirementsPage.applyForm.eyebrow", "Apply Now")}
              </div>
              <DialogTitle className="text-2xl font-display font-bold text-navy leading-tight">
                {positionLabel}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {projectLabel} ·{" "}
                {t(
                  "requirementsPage.applyForm.sub",
                  "Submit your details — our recruitment desk responds within 4 working hours.",
                )}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
              <Field
                id="apply-name"
                label={t("requirementsPage.applyForm.fields.name", "Full Name")}
                error={errors.name?.message}
                valid={isValid("name", 2)}
              >
                <input id="apply-name" placeholder=" " {...register("name")} className={inputBase} />
              </Field>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  id="apply-phone"
                  label={t("requirementsPage.applyForm.fields.phone", "Phone / WhatsApp")}
                  error={errors.phone?.message}
                  valid={isValid("phone", 6)}
                >
                  <input
                    id="apply-phone"
                    placeholder=" "
                    dir="ltr"
                    {...register("phone")}
                    className={inputBase}
                  />
                </Field>
                <Field
                  id="apply-email"
                  label={t("requirementsPage.applyForm.fields.email", "Email (optional)")}
                  error={errors.email?.message}
                  valid={isValid("email", 5) && /@/.test(values.email ?? "")}
                >
                  <input
                    id="apply-email"
                    type="email"
                    placeholder=" "
                    dir="ltr"
                    {...register("email")}
                    className={inputBase}
                  />
                </Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  id="apply-iqama"
                  label={t("requirementsPage.applyForm.fields.iqama", "Iqama / ID (optional)")}
                  valid={isValid("iqama", 4)}
                >
                  <input
                    id="apply-iqama"
                    placeholder=" "
                    dir="ltr"
                    {...register("iqama")}
                    className={inputBase}
                  />
                </Field>
                <Field
                  id="apply-experience"
                  label={t("requirementsPage.applyForm.fields.experience", "Experience")}
                  error={errors.experience?.message}
                  valid={isValid("experience")}
                >
                  <select
                    id="apply-experience"
                    {...register("experience")}
                    defaultValue=""
                    className={`${inputBase} appearance-none cursor-pointer`}
                  >
                    <option value="" disabled>
                      &nbsp;
                    </option>
                    {experiences.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="group relative">
                <textarea
                  id="apply-message"
                  rows={3}
                  placeholder=" "
                  {...register("message")}
                  className="peer w-full rounded-xl border border-border bg-white px-4 pt-6 pb-3 text-sm text-navy placeholder-transparent focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all resize-none"
                />
                <label
                  htmlFor="apply-message"
                  className="pointer-events-none absolute left-4 top-4 text-sm text-muted-foreground transition-all duration-200 peer-focus:top-1 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-[0.22em] peer-focus:text-gold peer-focus:px-1.5 peer-focus:bg-white peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-[0.22em] peer-[:not(:placeholder-shown)]:text-navy peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:bg-white"
                >
                  {t("requirementsPage.applyForm.fields.message", "Short note (optional)")}
                </label>
              </div>

              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground pt-2">
                {t(
                  "requirementsPage.applyForm.privacy",
                  "Your details are used only for this application.",
                )}
              </p>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative w-full inline-flex items-center justify-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white shadow-card overflow-hidden transition-all hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>
                    {isSubmitting
                      ? t("requirementsPage.applyForm.submitting", "Submitting…")
                      : t("requirementsPage.applyForm.submit", "Submit Application")}
                  </span>
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:rotate-45" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  error,
  valid,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  valid?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="relative">
        {children}
        <label
          htmlFor={id}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground transition-all duration-200 peer-focus:top-0 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-[0.22em] peer-focus:text-gold peer-focus:px-1.5 peer-focus:bg-white peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-[0.22em] peer-[:not(:placeholder-shown)]:text-navy peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:bg-white"
        >
          {label}
        </label>
        {valid && !error && (
          <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gold" strokeWidth={2} />
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}
