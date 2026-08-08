import { useTranslation } from "react-i18next";
import { useCmsContent } from "@/lib/cms-content";
import { getProjectBySlug } from "@/lib/projects-data";

export type TranslatedProject = {
  key: string;
  slug: string;
  img: string;
  rank: number;
  featured: boolean;
  sector: string;
  title: string;
  client: string;
  location: string;
  value: string;
  duration: string;
  scope: string;
  long: string[];
  highlights: string[];
  faqs: { q: string; a: string }[];
};

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" && value ? value : fallback;
}

/**
 * Returns a fully composed project detail, sourced with priority:
 * i18n bundle (pen-mode editable, used by the 12 launch projects) first,
 * then the CMS content item's own body fields (used by projects created
 * entirely through the dashboard), then static project-data.ts metadata.
 */
export function useTranslatedProject(slug: string): TranslatedProject | undefined {
  const { collections } = useCmsContent();
  const { t } = useTranslation();
  const managed = (collections.projects ?? []).find((item) => item.slug === slug);
  const staticEntry = getProjectBySlug(slug);
  if (!managed && !staticEntry) return undefined;

  const key = staticEntry?.key ?? slug;
  const data = managed?.data ?? {};
  // Free-form project fields (sector/value/duration/long/highlights) live in the
  // per-locale translation "body" blob — see backend translation_values("projects").
  const freeform = (data.body && typeof data.body === "object" ? data.body : {}) as Record<string, unknown>;

  const tField = (field: string, bodyValue: string): string => {
    const v = t(`projects.items.${key}.${field}`, { defaultValue: "" });
    return typeof v === "string" && v ? v : bodyValue;
  };
  const tArray = <T,>(path: string): T[] | undefined => {
    const v = t(path, { returnObjects: true, defaultValue: null });
    return Array.isArray(v) ? (v as T[]) : undefined;
  };

  const bodyLong = Array.isArray(freeform.long) ? (freeform.long as string[]) : undefined;
  const bodyHighlights = Array.isArray(freeform.highlights) ? (freeform.highlights as string[]) : undefined;
  const bodyFaqs = Array.isArray(freeform.faqs)
    ? (freeform.faqs as { q?: string; a?: string }[]).map((row) => ({
        q: String(row.q ?? ""),
        a: String(row.a ?? ""),
      }))
    : undefined;

  return {
    key,
    slug,
    img: str(data.featured_media_url, staticEntry?.img ?? "/assets/project-civil.jpg"),
    rank: managed?.sort_order || staticEntry?.rank || 0,
    featured: managed ? managed.is_featured : (staticEntry?.featured ?? false),
    sector: tField("sector", str(freeform.sector)),
    title: tField("title", str(managed?.title)),
    client: tField("client", str(data.client_name)),
    location: tField("location", str(data.location)),
    value: tField("value", str(freeform.value)),
    duration: tField("duration", str(freeform.duration)),
    scope: tField("scope", str(managed?.summary)),
    long: tArray<string>(`projects.content.${key}.long`) ?? bodyLong ?? [],
    highlights: tArray<string>(`projects.content.${key}.highlights`) ?? bodyHighlights ?? [],
    faqs:
      bodyFaqs?.filter((row) => row.q || row.a)
      ?? tArray<{ q: string; a: string }>(`projects.content.${key}.faqs`)
      ?? [],
  };
}
