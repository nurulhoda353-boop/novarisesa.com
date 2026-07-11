import { useTranslation } from "react-i18next";
import { getServiceBySlug, type ServicePage } from "@/lib/services-data";

/**
 * Returns a ServicePage with strings localized via i18n.
 * Icons, images, slug and num come from the source-of-truth services-data.
 * If a translation key is missing, the English default is kept.
 */
export function useTranslatedService(slug: string): ServicePage | undefined {
  const base = getServiceBySlug(slug);
  const { t, i18n } = useTranslation();
  if (!base) return undefined;
  if (i18n.language === "en") return base;

  const s = (key: string, fallback: string): string => {
    const v = t(`serviceDetails.${slug}.${key}`, { defaultValue: "" });
    return typeof v === "string" && v ? v : fallback;
  };
  const a = <T,>(key: string): T[] | undefined => {
    const v = t(`serviceDetails.${slug}.${key}`, { returnObjects: true, defaultValue: null });
    return Array.isArray(v) ? (v as T[]) : undefined;
  };

  const statLabels = a<string>("statLabels");
  const subT = a<{ title: string; desc: string }>("subServices");
  const projT = a<{ name: string; client: string; scope: string }>("projects");
  const procT = a<{ title: string; desc: string }>("process");
  const faqT = a<{ q: string; a: string }>("faqs");
  const certT = a<string>("certifications");
  const capRows = a<{ label: string; value: string }>("capabilities.rows");

  return {
    ...base,
    title: s("title", base.title),
    eyebrow: s("eyebrow", base.eyebrow),
    tagline: s("tagline", base.tagline),
    lead: s("lead", base.lead),
    intro: s("intro", base.intro),
    stats: base.stats.map((st, i) => ({ ...st, label: statLabels?.[i] ?? st.label })),
    subServices: base.subServices.map((sv, i) => ({
      ...sv,
      title: subT?.[i]?.title ?? sv.title,
      desc: subT?.[i]?.desc ?? sv.desc,
    })),
    capabilities: {
      heading: s("capabilities.heading", base.capabilities.heading),
      rows: base.capabilities.rows.map((r, i) => ({
        label: capRows?.[i]?.label ?? r.label,
        value: capRows?.[i]?.value ?? r.value,
      })),
    },
    projects: base.projects.map((p, i) => ({
      ...p,
      name: projT?.[i]?.name ?? p.name,
      client: projT?.[i]?.client ?? p.client,
      scope: projT?.[i]?.scope ?? p.scope,
    })),
    process: base.process.map((p, i) => ({
      ...p,
      title: procT?.[i]?.title ?? p.title,
      desc: procT?.[i]?.desc ?? p.desc,
    })),
    certifications: base.certifications.map((c, i) => certT?.[i] ?? c),
    faqs: base.faqs.map((f, i) => ({
      q: faqT?.[i]?.q ?? f.q,
      a: faqT?.[i]?.a ?? f.a,
    })),
  };
}

/**
 * Translates just the title for related-service cards.
 */
export function useServiceTitle() {
  const { t, i18n } = useTranslation();
  return (slug: string, fallback: string): string => {
    if (i18n.language === "en") return fallback;
    const v = t(`serviceDetails.${slug}.title`, { defaultValue: "" });
    return typeof v === "string" && v ? v : fallback;
  };
}
