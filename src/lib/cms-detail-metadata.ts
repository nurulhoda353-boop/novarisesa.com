import type { Metadata } from "next";
import { API_URL } from "./site";

type CollectionName = "services" | "projects" | "posts" | "events";

type PublicItem = {
  slug: string;
  title: string;
  summary?: string | null;
  data: {
    meta_title?: string | null;
    meta_description?: string | null;
    hero_media_url?: string | null;
    featured_media_url?: string | null;
  };
};

export async function cmsDetailMetadata(
  collection: CollectionName,
  slug: string,
  fallback: Metadata,
  locale = "en",
): Promise<Metadata> {
  try {
    const response = await fetch(`${API_URL}/public/site-content?locale=${locale}`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return fallback;
    const payload = (await response.json()) as {
      collections?: Partial<Record<CollectionName, PublicItem[]>>;
    };
    const item = payload.collections?.[collection]?.find((row) => row.slug === slug);
    if (!item) return fallback;
    const title = item.data.meta_title || item.title;
    const description =
      item.data.meta_description ||
      item.summary ||
      (typeof fallback.description === "string" ? fallback.description : undefined);
    const image =
      item.data.hero_media_url ||
      item.data.featured_media_url ||
      (Array.isArray(fallback.openGraph?.images)
        ? fallback.openGraph.images[0]
        : fallback.openGraph?.images);
    return {
      ...fallback,
      title,
      description,
      openGraph: {
        ...fallback.openGraph,
        title: typeof title === "string" ? title : fallback.openGraph?.title,
        description,
        images: image ? [image] : fallback.openGraph?.images,
      },
    };
  } catch {
    return fallback;
  }
}
