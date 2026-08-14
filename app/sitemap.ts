import type { MetadataRoute } from "next";
import { blogPosts, events } from "@/lib/blog-data";
import { projects } from "@/lib/projects-data";
import { servicePages } from "@/lib/services-data";
import { API_URL, SITE_URL } from "@/lib/site";

type Collection = "services" | "projects" | "posts" | "events";
type PublicItem = { slug: string; updated_at?: string };

const staticPaths = [
  "",
  "/about",
  "/services",
  "/projects",
  "/capabilities",
  "/insights",
  "/blog",
  "/events",
  "/requirements",
  "/careers",
  "/contact",
  "/rfq",
];

const bundled: Record<Collection, PublicItem[]> = {
  services: servicePages,
  projects,
  posts: blogPosts,
  events,
};

const routeFor: Record<Collection, string> = {
  services: "services",
  projects: "projects",
  posts: "blog",
  events: "events",
};

async function collections(): Promise<Record<Collection, PublicItem[]>> {
  try {
    const response = await fetch(`${API_URL}/public/site-content?locale=en`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return bundled;
    const payload = (await response.json()) as {
      collections?: Partial<Record<Collection, PublicItem[]>>;
    };
    return Object.fromEntries(
      (Object.keys(bundled) as Collection[]).map((key) => [
        key,
        payload.collections?.[key]?.length ? payload.collections[key] : bundled[key],
      ]),
    ) as Record<Collection, PublicItem[]>;
  } catch {
    return bundled;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const content = await collections();
  return [
    ...staticPaths.map((path) => ({
      url: `${SITE_URL}${path || "/"}`,
      changeFrequency: path ? ("weekly" as const) : ("daily" as const),
      priority: path ? 0.8 : 1,
    })),
    ...(Object.keys(content) as Collection[]).flatMap((collection) =>
      content[collection].map((item) => ({
        url: `${SITE_URL}/${routeFor[collection]}/${item.slug}`,
        lastModified: item.updated_at ? new Date(item.updated_at) : undefined,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
    ),
  ];
}
