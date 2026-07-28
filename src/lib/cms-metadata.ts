import type { Metadata } from "next";
import { API_URL } from "./site";

type PublicPage = {
  slug: string;
  title: string;
  data: {
    meta_title?: string | null;
    meta_description?: string | null;
  };
};

export async function cmsPageMetadata(
  slug: string,
  fallback: Metadata,
): Promise<Metadata> {
  try {
    const response = await fetch(`${API_URL}/public/site-content?locale=en`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return fallback;
    const payload = await response.json() as {
      collections?: { pages?: PublicPage[] };
    };
    const page = payload.collections?.pages?.find((item) => item.slug === slug);
    if (!page) return fallback;
    const title = page.data.meta_title || page.title;
    const description = page.data.meta_description || fallback.description;
    return {
      ...fallback,
      title,
      description,
      openGraph: {
        ...fallback.openGraph,
        title,
        description: typeof description === "string" ? description : undefined,
      },
    };
  } catch {
    return fallback;
  }
}
