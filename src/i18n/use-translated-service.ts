import { useTranslation } from "react-i18next";
import { getServiceBySlug, type ServicePage } from "@/lib/services-data";
import { resolveServiceIcon } from "@/lib/service-icons";
import { useCmsContent } from "@/lib/cms-content";

/**
 * Returns a ServicePage with strings localized via i18n.
 * Icons, images, slug and num come from the source-of-truth services-data.
 * If a translation key is missing, the English default is kept.
 */
export function useTranslatedService(slug: string): ServicePage | undefined {
  const { collections } = useCmsContent();
  const managed = (collections.services ?? []).find((item) => item.slug === slug);
  const fallback = getServiceBySlug(slug);
  const managedCapabilities = Array.isArray(managed?.data.capabilities)
    ? managed.data.capabilities as Array<{ label: string; value: string }>
    : [];
  const base: ServicePage | undefined = fallback ? { ...fallback } : (managed ? {
    slug,
    num: String(managed.data.number ?? managed.sort_order ?? "01"),
    title: managed.title,
    eyebrow: String(managed.data.eyebrow ?? ""),
    tagline: managed.summary ?? "",
    lead: String(managed.data.lead ?? managed.summary ?? ""),
    intro: String(managed.data.intro ?? ""),
    icon: resolveServiceIcon(managed.data.icon),
    heroImage: String(managed.data.hero_media_url ?? "/assets/capabilities-hero.jpg"),
    metaTitle: managed.title,
    metaDescription: managed.summary ?? "",
    stats: Array.isArray(managed.data.stats) ? managed.data.stats as ServicePage["stats"] : [],
    subServices: (Array.isArray(managed.data.sub_services) ? managed.data.sub_services : []).map(
      (item) => ({ ...(item as { title: string; desc: string }), icon: resolveServiceIcon((item as { icon?: string }).icon) }),
    ),
    capabilities: { heading: managed.title, rows: managedCapabilities },
    projects: [],
    process: Array.isArray(managed.data.process) ? managed.data.process as ServicePage["process"] : [],
    certifications: Array.isArray(managed.data.certifications) ? managed.data.certifications as string[] : [],
    faqs: Array.isArray(managed.data.faqs) ? managed.data.faqs as ServicePage["faqs"] : [],
  } : undefined);
  const { t } = useTranslation();
  if (!base) return undefined;
  if (managed) {
    base.heroImage = String(managed.data.hero_media_url ?? base.heroImage);
    base.num = String(managed.data.number ?? base.num);
    base.stats = Array.isArray(managed.data.stats) ? managed.data.stats as ServicePage["stats"] : base.stats;
    base.process = Array.isArray(managed.data.process) ? managed.data.process as ServicePage["process"] : base.process;
    base.certifications = Array.isArray(managed.data.certifications)
      ? managed.data.certifications as string[]
      : base.certifications;
  }

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
