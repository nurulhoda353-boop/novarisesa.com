import { useTranslation } from "react-i18next";
import { featuredPost, posts, events, type BlogPost, type EventItem } from "@/lib/blog-data";

export function useTranslatedPosts() {
  const { t } = useTranslation();
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
  return {
    featured: translate(featuredPost),
    posts: posts.map(translate),
  };
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
