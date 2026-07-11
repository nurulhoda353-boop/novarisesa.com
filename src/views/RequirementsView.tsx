"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ArrowUpRight,
  BedDouble,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileBadge2,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
  Users,
  Wallet,
} from "lucide-react";
import { ApplyRequirementDialog } from "@/components/site/ApplyRequirementDialog";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { PageHero } from "@/components/site/PageHero";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/site/Reveal";
import { CTA } from "@/components/site/CTA";
import {
  REQUIREMENTS,
  buildWhatsAppLink,
  type RequirementItem,
} from "@/lib/requirements-data";

const heroImage = "/assets/requirements-hero.jpg";

export function RequirementsView() {
  const { t } = useTranslation();

  const projects = useMemo(() => {
    const set = new Set<string>();
    REQUIREMENTS.forEach((r) => set.add(r.project));
    return ["all", ...Array.from(set)];
  }, []);

  const [filter, setFilter] = useState<string>("all");
  const filtered = useMemo(
    () => (filter === "all" ? REQUIREMENTS : REQUIREMENTS.filter((r) => r.project === filter)),
    [filter],
  );
  const urgentCount = REQUIREMENTS.filter((r) => r.status === "urgent").length;

  // Smooth-scroll to hash (deep-link from the strip)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const tryScroll = () => {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    const id = window.setTimeout(tryScroll, 350);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <PageHero
          num="08"
          eyebrow={t("requirementsPage.hero.eyebrow")}
          title={t("requirementsPage.hero.title")}
          description={t("requirementsPage.hero.description")}
          icon={AlertCircle}
          heroImage={heroImage}
          crumbs={[{ label: t("requirementsPage.hero.crumb") }]}
          ctas={[
            { label: t("requirementsPage.hero.ctaView"), href: "#openings" },
            {
              label: t("requirementsPage.hero.ctaWhatsapp"),
              href: buildWhatsAppLink(
                REQUIREMENTS[0]?.contacts[0]?.raw ?? "966554429574",
                t("requirementsPage.hero.waMessage"),
              ),
              variant: "ghost",
              icon: MessageCircle,
            },
          ]}
        />

        {/* Trust strip */}
        <section className="relative bg-white border-b border-border">
          <div className="container-wide py-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 text-center md:text-left">
              {[
                { icon: AlertCircle, value: urgentCount, label: t("requirementsPage.trust.urgent") },
                { icon: ShieldCheck, value: "100%", label: t("requirementsPage.trust.verified") },
                { icon: Wallet, value: t("requirementsPage.trust.monthlyValue"), label: t("requirementsPage.trust.salary") },
                { icon: MessageCircle, value: "< 4 hrs", label: t("requirementsPage.trust.response") },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-center md:justify-start gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10 text-gold shrink-0">
                    <s.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-base font-display font-bold text-navy leading-tight tabular-nums" dir="ltr">
                      {s.value}
                    </div>
                    <div className="text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground leading-tight mt-0.5">
                      {s.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Openings */}
        <section
          id="openings"
          className="relative py-16 lg:py-24 bg-sand-soft overflow-hidden"
        >
          <div className="pointer-events-none absolute -top-40 -right-40 h-[480px] w-[480px] rounded-full bg-gold/10 blur-[140px] anim-breathe" />

          <div className="container-wide relative">
            <Reveal className="max-w-3xl mb-10 lg:mb-12">
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
                <span className="h-px w-8 bg-gold" />
                {t("requirementsPage.list.eyebrow")}
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-[1.05]">
                {t("requirementsPage.list.titleA")}{" "}
                <span className="text-gradient-gold">{t("requirementsPage.list.titleB")}</span>
              </h2>
              <p className="mt-5 text-base lg:text-lg text-muted-foreground leading-relaxed">
                {t("requirementsPage.list.lead")}
              </p>
            </Reveal>

            {/* Filter chips */}
            <Reveal delay={0.05}>
              <div className="flex flex-wrap items-center gap-2 mb-8 lg:mb-10">
                <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mr-1.5">
                  {t("requirementsPage.list.filterBy")}
                </span>
                {projects.map((p) => {
                  const active = filter === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFilter(p)}
                      aria-pressed={active}
                      className={`px-4 py-2 rounded-full text-[12px] font-semibold tracking-[0.04em] border transition-all ${
                        active
                          ? "bg-navy text-white border-navy shadow-card"
                          : "bg-white text-navy/70 border-border hover:border-gold hover:text-navy"
                      }`}
                    >
                      {p === "all" ? t("requirementsPage.list.allProjects") : p}
                    </button>
                  );
                })}
                <span className="ms-auto text-[11px] text-muted-foreground tabular-nums">
                  {t("requirementsPage.list.showing", { count: filtered.length, total: REQUIREMENTS.length })}
                </span>
              </div>
            </Reveal>

            <StaggerGroup
              className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-7"
              stagger={0.06}
            >
              {filtered.map((r) => (
                <StaggerItem key={r.id}>
                  <RequirementCard item={r} />
                </StaggerItem>
              ))}
            </StaggerGroup>

            {filtered.length === 0 && (
              <div className="mt-10 rounded-2xl border border-dashed border-border bg-white p-10 text-center text-muted-foreground">
                {t("requirementsPage.list.empty")}
              </div>
            )}

            {/* Process / How it works */}
            <Reveal delay={0.1} className="mt-16 lg:mt-20">
              <div className="rounded-3xl border border-border bg-white p-7 lg:p-10 shadow-card">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-5">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("requirementsPage.process.eyebrow")}
                </div>
                <h3 className="text-2xl lg:text-3xl font-display font-bold text-navy leading-tight max-w-xl">
                  {t("requirementsPage.process.title")}
                </h3>
                <div className="mt-8 grid md:grid-cols-4 gap-5">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="relative pl-12">
                      <span className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-gold text-navy text-sm font-display font-bold">
                        {n}
                      </span>
                      <div className="text-sm font-display font-bold text-navy">
                        {t(`requirementsPage.process.step${n}.title`)}
                      </div>
                      <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">
                        {t(`requirementsPage.process.step${n}.desc`)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <CTA />
      </main>
      <Footer />
    </div>
  );
}

function RequirementCard({ item }: { item: RequirementItem }) {
  const { t, i18n } = useTranslation();
  const tk = (key: string, fallback: string) =>
    t(`requirementsPage.items.${item.id}.${key}`, fallback);

  const message = t("requirementsPage.card.waMessage", {
    position: tk("position", item.position),
    project: tk("project", item.project),
  });
  const primary = item.contacts[0];

  const dateFmt = new Intl.DateTimeFormat(i18n.language === "ar" ? "ar-SA" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(item.postedAt));

  const isUrgent = item.status === "urgent";

  return (
    <article
      id={item.id}
      className="group relative h-full flex flex-col rounded-2xl border border-border bg-white shadow-card hover:shadow-elegant hover:-translate-y-1 hover:border-gold transition-all duration-500 overflow-hidden"
    >
      {/* Top ribbon */}
      <div
        className={`flex items-center justify-between px-5 lg:px-6 py-2.5 ${
          isUrgent ? "bg-navy-deep" : "bg-navy/80"
        } text-white`}
      >
        <div className="inline-flex items-center gap-2">
          {isUrgent && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-gold opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
            </span>
          )}
          <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
            {t(`requirementsPage.status.${item.status}`)}
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/55" dir="ltr">
          {dateFmt}
        </span>
      </div>

      <div className="p-6 lg:p-7 flex-1 flex flex-col">
        {/* Project pill */}
        <div className="inline-flex self-start items-center gap-1.5 rounded-full bg-gold/10 border border-gold/25 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-gold font-semibold">
          <MapPin className="h-3 w-3" />
          {tk("project", item.project)}
        </div>

        {/* Title */}
        <h3 className="mt-4 text-2xl lg:text-[26px] font-display font-bold text-navy leading-[1.15]">
          {tk("position", item.position)}
        </h3>
        {item.approval && (
          <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-gold">
            <ShieldCheck className="h-3.5 w-3.5" />
            {tk("approval", item.approval)}
          </div>
        )}

        {/* Headline stats: count + rate */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-sand-soft border border-border p-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <Users className="h-3 w-3 text-gold" />
              {t("requirementsPage.card.positions")}
            </div>
            <div className="mt-1.5 text-2xl font-display font-extrabold text-navy tabular-nums leading-none" dir="ltr">
              {item.count}
            </div>
          </div>
          <div className="rounded-xl bg-navy text-white p-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-gold/85">
              <Wallet className="h-3 w-3" />
              {t("requirementsPage.card.rate")}
            </div>
            <div className="mt-1.5 text-2xl font-display font-extrabold text-white tabular-nums leading-none whitespace-nowrap" dir="ltr">
              {item.rate}
            </div>
          </div>
        </div>

        {/* Detail rows */}
        <ul className="mt-5 space-y-2.5 text-[13px] text-foreground/85">
          <DetailRow icon={CalendarClock} label={t("requirementsPage.card.duration")} value={tk("duration", item.duration)} />
          <DetailRow icon={Clock} label={t("requirementsPage.card.salary")} value={tk("salaryCycle", item.salaryCycle)} />
          <DetailRow icon={UtensilsCrossed} label={t("requirementsPage.card.food")} value={tk("food", item.food)} />
          <DetailRow icon={BedDouble} label={t("requirementsPage.card.accommodation")} value={tk("accommodation", item.accommodation)} />
        </ul>

        {/* Documents */}
        <div className="mt-5 pt-5 border-t border-border">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2.5">
            <FileBadge2 className="h-3 w-3 text-gold" />
            {t("requirementsPage.card.requiredDocs")}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {item.documents.map((d, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-md bg-foreground/5 border border-border px-2.5 py-1 text-[11px] text-foreground/80"
              >
                <CheckCircle2 className="h-3 w-3 text-gold" />
                {tk(`documents.${i}`, d)}
              </span>
            ))}
          </div>
        </div>

        {/* Spacer pushes CTA to bottom */}
        <div className="flex-1" />

        {/* Contacts + CTA */}
        <div className="mt-6 pt-5 border-t border-border space-y-3">
          <ApplyRequirementDialog
            item={item}
            positionLabel={tk("position", item.position)}
            projectLabel={tk("project", item.project)}
            trigger={
              <button
                type="button"
                className="group/apply relative w-full inline-flex items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-semibold text-navy shadow-gold overflow-hidden transition-all hover:scale-[1.02]"
              >
                <Send className="h-4 w-4" />
                <span>{t("requirementsPage.card.applyNow", "Apply Now")}</span>
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover/apply:rotate-45" />
                <span className="absolute inset-0 -translate-x-full bg-white/25 skew-x-12 transition-transform duration-700 group-hover/apply:translate-x-full" />
              </button>
            }
          />
          {primary && (
            <a
              href={buildWhatsAppLink(primary.raw, message)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-gold/40 bg-gold/5 px-5 py-2.5 text-[13px] font-semibold text-navy/80 hover:bg-gold/15 hover:text-navy transition-all"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{t("requirementsPage.card.applyWhatsapp")}</span>
            </a>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground">
            <Phone className="h-3.5 w-3.5 text-gold" />
            {item.contacts.map((c, i) => (
              <a
                key={i}
                href={`tel:+${c.raw}`}
                dir="ltr"
                className="hover:text-navy transition-colors tabular-nums"
              >
                {c.display}
              </a>
            ))}
          </div>
        </div>

      </div>
    </article>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <Icon className="h-3.5 w-3.5 text-gold shrink-0 mt-0.5" />
      <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground min-w-[100px]">
        {label}
      </span>
      <span className="flex-1 text-foreground/85 font-medium">{value}</span>
    </li>
  );
}
