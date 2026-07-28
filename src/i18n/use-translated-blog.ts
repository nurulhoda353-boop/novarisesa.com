import { useTranslation } from "react-i18next";
import { featuredPost, posts, events, type BlogPost, type EventItem } from "@/lib/blog-data";
import { useCmsContent } from "@/lib/cms-content";

export function useTranslatedPosts() {
  const { t } = useTranslation();
  const { collections } = useCmsContent();
  const translate = (p: BlogPost): BlogPost => {
    const base = `blogPage.posts.${p.slug}`;
    const translatedRole = t(`blogPage.authorRoles.${p.authorRole}`, { defaultValue: p.authorRole });
    return {
      ...p,
      title: t(`${base}.title`, { defaultValue: p.title }),
      excerpt: t(`${base}.excerpt`, { defaultValue: p.excerpt }),
      date: t(`${base}.date`, { defaultValue: p.date }),
      authorRole: translatedRole,
    };
  };
  const managed = collections.posts ?? [];
  if (!managed.length) {
    return {
      featured: translate(featuredPost),
      posts: posts.map(translate),
    };
  }
  const mapped = managed.map((item): BlogPost => {
    const body = item.data.body && typeof item.data.body === "object"
      ? item.data.body as Record<string, unknown>
      : {};
    return {
      slug: item.slug,
      title: item.title,
      excerpt: item.summary ?? "",
      category: String(body.category ?? "Insights") as BlogPost["category"],
      date: String(body.date ?? item.data.published_at ?? item.updated_at),
      readMins: Number(body.readMins ?? body.read_mins ?? 5),
      author: String(body.author ?? "NOVARISE"),
      authorRole: String(body.authorRole ?? body.author_role ?? "Editorial Team"),
      image: String(item.data.featured_media_url ?? "/assets/news-energy.jpg"),
    };
  });
  const featured = mapped.find((_, index) => managed[index]?.is_featured) ?? mapped[0];
  return { featured, posts: mapped.filter((item) => item.slug !== featured.slug) };
}

export function useTranslatedEvents(): EventItem[] {
  const { t } = useTranslation();
  const items = t("blogPage.eventItems", { returnObjects: true }) as Array<{
    title: string; date: string; location: string; description: string;
  }>;
  return events.map((e, i) => ({
    ...e,
    title: items[i]?.title ?? e.title,
    date: items[i]?.date ?? e.date,
    location: items[i]?.location ?? e.location,
    description: items[i]?.description ?? e.description,
    type: t(`blogPage.events.types.${e.type}`, { defaultValue: e.type }) as EventItem["type"],
    status: t(`blogPage.events.statuses.${e.status}`, { defaultValue: e.status }) as EventItem["status"],
    dateShort: {
      day: e.dateShort.day,
      month: t(`blogPage.events.months.${e.dateShort.month}`, { defaultValue: e.dateShort.month }),
    },
  }));
}
