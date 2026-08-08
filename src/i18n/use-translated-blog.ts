import { useTranslation } from "react-i18next";
import { featuredPost, posts, events, type BlogPost, type EventItem } from "@/lib/blog-data";
import { useCmsContent } from "@/lib/cms-content";

export function useTranslatedPosts() {
  const { t } = useTranslation();
  const { collections } = useCmsContent();
  const translate = (p: BlogPost): BlogPost => {
    const base = `blogPage.posts.${p.slug}`;
    const translatedRole = t(`blogPage.authorRoles.${p.authorRole}`, { defaultValue: p.authorRole });
    const paragraphs = t(`${base}.paragraphs`, { returnObjects: true, defaultValue: null }) as string[] | null;
    return {
      ...p,
      title: t(`${base}.title`, { defaultValue: p.title }),
      excerpt: t(`${base}.excerpt`, { defaultValue: p.excerpt }),
      date: t(`${base}.date`, { defaultValue: p.date }),
      authorRole: translatedRole,
      paragraphs: Array.isArray(paragraphs) && paragraphs.length ? paragraphs : [p.excerpt],
    };
  };
  const managed = collections.posts ?? [];
  if (!managed.length) {
    const translatedFeatured = translate(featuredPost);
    const translatedPosts = posts.map(translate);
    return {
      featured: translatedFeatured,
      posts: translatedPosts,
      all: [translatedFeatured, ...translatedPosts],
    };
  }
  // The 9 launch posts also exist as static entries; keep their bundled artwork and
  // metadata as the fallback so seeding them into the CMS never blanks the cards.
  const staticBySlug = new Map([featuredPost, ...posts].map((p) => [p.slug, p]));
  const mapped = managed.map((item): BlogPost => {
    const body = item.data.body && typeof item.data.body === "object"
      ? item.data.body as Record<string, unknown>
      : {};
    const paragraphs = Array.isArray(body.paragraphs) ? body.paragraphs.map(String) : [];
    const base = staticBySlug.get(item.slug);
    // Pen-mode writes these same keys, so let i18n win when it has a value.
    const key = `blogPage.posts.${item.slug}`;
    const s = (field: string, value: string) => {
      const translated = t(`${key}.${field}`, { defaultValue: "" });
      return typeof translated === "string" && translated ? translated : value;
    };
    const i18nParagraphs = t(`${key}.paragraphs`, { returnObjects: true, defaultValue: null }) as
      | string[]
      | null;
    const resolvedParagraphs = Array.isArray(i18nParagraphs) && i18nParagraphs.length
      ? i18nParagraphs
      : paragraphs;
    const excerpt = s("excerpt", item.summary ?? base?.excerpt ?? "");
    return {
      slug: item.slug,
      title: s("title", item.title),
      excerpt,
      category: String(item.data.category ?? body.category ?? base?.category ?? "Insights") as BlogPost["category"],
      date: s("date", String(body.date ?? base?.date ?? item.data.published_at ?? item.updated_at)),
      readMins: Number(body.readMins ?? body.read_mins ?? base?.readMins ?? 5),
      author: String(body.author ?? base?.author ?? "NOVARISE"),
      authorRole: t(`blogPage.authorRoles.${body.authorRole ?? base?.authorRole ?? ""}`, {
        defaultValue: String(body.authorRole ?? body.author_role ?? base?.authorRole ?? "Editorial Team"),
      }),
      image: String(item.data.featured_media_url ?? base?.image ?? "/assets/news-energy.jpg"),
      paragraphs: resolvedParagraphs.length ? resolvedParagraphs : [excerpt],
    };
  });
  const featured = mapped.find((_, index) => managed[index]?.is_featured) ?? mapped[0];
  return { featured, posts: mapped.filter((item) => item.slug !== featured.slug), all: mapped };
}

export function useTranslatedPost(slug: string): BlogPost | undefined {
  const { all } = useTranslatedPosts();
  return all.find((p) => p.slug === slug);
}

const MONTH_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function useTranslatedEvents(): EventItem[] {
  const { t } = useTranslation();
  const { collections } = useCmsContent();
  const managed = collections.events ?? [];

  if (!managed.length) {
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return managed.map((item): EventItem => {
    const startsOnRaw = item.data.starts_on;
    const endsOnRaw = item.data.ends_on;
    const startsOn = typeof startsOnRaw === "string" ? new Date(startsOnRaw) : null;
    const endsOn = typeof endsOnRaw === "string" ? new Date(endsOnRaw) : startsOn;
    const isPast = endsOn ? endsOn.getTime() < today.getTime() : false;
    const monthAbbr = startsOn ? MONTH_ABBR[startsOn.getUTCMonth()] : MONTH_ABBR[0];
    const eventType = String(item.data.event_type ?? "Conference");
    const statusValue: EventItem["status"] = isPast ? "Past" : "Upcoming";
    return {
      title: item.title,
      type: t(`blogPage.events.types.${eventType}`, { defaultValue: eventType }) as EventItem["type"],
      date: String(item.data.date_display ?? ""),
      dateShort: {
        day: startsOn ? String(startsOn.getUTCDate()).padStart(2, "0") : "--",
        month: t(`blogPage.events.months.${monthAbbr}`, { defaultValue: monthAbbr }),
      },
      location: String(item.data.location ?? ""),
      description: item.summary ?? "",
      status: t(`blogPage.events.statuses.${statusValue}`, { defaultValue: statusValue }) as EventItem["status"],
    };
  });
}
