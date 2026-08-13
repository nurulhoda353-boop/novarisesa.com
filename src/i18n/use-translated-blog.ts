import { useTranslation } from "react-i18next";
import {
  blogPosts,
  events,
  eventStatus,
  type BlogPost,
  type EventAgendaItem,
  type EventItem,
} from "@/lib/blog-data";
import { useCmsContent } from "@/lib/cms-content";

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

export function useTranslatedPosts() {
  const { t } = useTranslation();
  const { collections } = useCmsContent();
  const staticBySlug = new Map(blogPosts.map((post) => [post.slug, post]));

  const translate = (post: BlogPost): BlogPost => {
    const base = `blogPage.posts.${post.slug}`;
    const paragraphs = t(`${base}.paragraphs`, { returnObjects: true, defaultValue: null }) as string[] | null;
    return {
      ...post,
      title: t(`${base}.title`, { defaultValue: post.title }),
      excerpt: t(`${base}.excerpt`, { defaultValue: post.excerpt }),
      date: t(`${base}.date`, { defaultValue: post.date }),
      authorRole: t(`blogPage.authorRoles.${post.authorRole}`, { defaultValue: post.authorRole }),
      paragraphs: Array.isArray(paragraphs) && paragraphs.length ? paragraphs : post.paragraphs,
    };
  };

  const managedBySlug = new Map((collections.posts ?? []).map((item) => [item.slug, item]));
  const mappedStatic = blogPosts.map((post): BlogPost => {
    const item = managedBySlug.get(post.slug);
    if (!item) return translate(post);
    const body = item.data.body && typeof item.data.body === "object"
      ? item.data.body as Record<string, unknown>
      : {};
    const translated = translate(post);
    return {
      ...translated,
      title: item.title || translated.title,
      excerpt: item.summary || translated.excerpt,
      category: String(item.data.category ?? body.category ?? post.category) as BlogPost["category"],
      date: String(body.date ?? post.date),
      publishedOn: String(item.data.published_at ?? body.publishedOn ?? post.publishedOn).slice(0, 10),
      readMins: Number(body.readMins ?? body.read_mins ?? post.readMins),
      author: String(body.author ?? post.author),
      authorRole: String(body.authorRole ?? body.author_role ?? post.authorRole),
      image: String(item.data.featured_media_url ?? post.image),
      paragraphs: stringList(body.paragraphs).length ? stringList(body.paragraphs) : translated.paragraphs,
      keyTakeaways: stringList(body.keyTakeaways ?? body.key_takeaways).length
        ? stringList(body.keyTakeaways ?? body.key_takeaways)
        : post.keyTakeaways,
      pullQuote: String(body.pullQuote ?? body.pull_quote ?? post.pullQuote ?? "") || undefined,
      isFeatured: Boolean(item.is_featured || post.isFeatured),
    };
  });

  const retiredLaunchSlugs = new Set([
    "oil-gas-shutdown-readiness",
    "supply-chain-localization-vision-2030",
    "psm-process-safety-management",
  ]);
  const extraManaged = (collections.posts ?? [])
    .filter((item) => !staticBySlug.has(item.slug) && !retiredLaunchSlugs.has(item.slug))
    .map((item): BlogPost => {
      const body = item.data.body && typeof item.data.body === "object"
        ? item.data.body as Record<string, unknown>
        : {};
      const excerpt = item.summary ?? "";
      return {
        slug: item.slug,
        title: item.title,
        excerpt,
        category: String(item.data.category ?? body.category ?? "Insights") as BlogPost["category"],
        date: String(body.date ?? item.data.published_at ?? item.updated_at),
        publishedOn: String(item.data.published_at ?? item.updated_at).slice(0, 10),
        readMins: Number(body.readMins ?? body.read_mins ?? 5),
        author: String(body.author ?? "NOVARISE Editorial Team"),
        authorRole: String(body.authorRole ?? body.author_role ?? "Editorial Team"),
        image: String(item.data.featured_media_url ?? "/assets/news-energy.jpg"),
        paragraphs: stringList(body.paragraphs).length ? stringList(body.paragraphs) : [excerpt],
        keyTakeaways: stringList(body.keyTakeaways ?? body.key_takeaways),
        pullQuote: String(body.pullQuote ?? body.pull_quote ?? "") || undefined,
        isFeatured: item.is_featured,
      };
    });

  const all = [...extraManaged, ...mappedStatic]
    .sort((a, b) => new Date(b.publishedOn).getTime() - new Date(a.publishedOn).getTime());
  const featured = all.find((post) => post.isFeatured) ?? all[0];
  return { featured, posts: all.filter((post) => post.slug !== featured.slug), all };
}

export function useTranslatedPost(slug: string): BlogPost | undefined {
  return useTranslatedPosts().all.find((post) => post.slug === slug);
}

const MONTH_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function useTranslatedEvents(): EventItem[] {
  const { collections } = useCmsContent();
  const staticBySlug = new Map(events.map((event) => [event.slug, event]));
  const managedBySlug = new Map((collections.events ?? []).map((item) => [item.slug, item]));
  const today = new Date();

  const mappedStatic = events.map((event): EventItem => {
    const item = managedBySlug.get(event.slug);
    if (!item) return { ...event, status: eventStatus(event, today) };
    const body = item.data.body && typeof item.data.body === "object"
      ? item.data.body as Record<string, unknown>
      : {};
    const startsOn = String(item.data.starts_on ?? event.startsOn);
    const endsOn = String(item.data.ends_on ?? event.endsOn);
    const startsDate = new Date(`${startsOn}T00:00:00`);
    return {
      ...event,
      title: item.title || event.title,
      type: String(item.data.event_type ?? event.type) as EventItem["type"],
      startsOn,
      endsOn,
      date: String(item.data.date_display ?? event.date),
      dateShort: {
        day: Number.isNaN(startsDate.getTime()) ? event.dateShort.day : String(startsDate.getDate()).padStart(2, "0"),
        month: Number.isNaN(startsDate.getTime()) ? event.dateShort.month : MONTH_ABBR[startsDate.getMonth()],
      },
      time: String(body.time ?? event.time),
      location: String(item.data.location ?? event.location),
      venue: String(body.venue ?? event.venue),
      description: item.summary || event.description,
      image: String(item.data.featured_media_url ?? event.image),
      status: eventStatus({ endsOn }, today),
      isFeatured: Boolean(item.is_featured || event.isFeatured),
      overview: stringList(body.overview).length ? stringList(body.overview) : event.overview,
      agenda: Array.isArray(body.agenda) && body.agenda.length
        ? body.agenda.map((row) => row as EventAgendaItem)
        : event.agenda,
      takeaways: stringList(body.takeaways).length ? stringList(body.takeaways) : event.takeaways,
    };
  });

  const extraManaged = (collections.events ?? [])
    .filter((item) => !staticBySlug.has(item.slug))
    .map((item): EventItem => {
      const body = item.data.body && typeof item.data.body === "object"
        ? item.data.body as Record<string, unknown>
        : {};
      const startsOn = String(item.data.starts_on ?? new Date().toISOString().slice(0, 10));
      const endsOn = String(item.data.ends_on ?? startsOn);
      const startsDate = new Date(`${startsOn}T00:00:00`);
      return {
        slug: item.slug,
        title: item.title,
        type: String(item.data.event_type ?? "Conference") as EventItem["type"],
        startsOn,
        endsOn,
        date: String(item.data.date_display ?? startsOn),
        dateShort: { day: String(startsDate.getDate()).padStart(2, "0"), month: MONTH_ABBR[startsDate.getMonth()] },
        time: String(body.time ?? "To be announced"),
        location: String(item.data.location ?? "Saudi Arabia"),
        venue: String(body.venue ?? item.data.location ?? "Venue to be announced"),
        description: item.summary ?? "",
        image: String(item.data.featured_media_url ?? "/assets/vision-team.jpg"),
        status: eventStatus({ endsOn }, today),
        isFeatured: item.is_featured,
        overview: stringList(body.overview).length ? stringList(body.overview) : [item.summary ?? ""],
        agenda: Array.isArray(body.agenda) ? body.agenda.map((row) => row as EventAgendaItem) : [],
        takeaways: stringList(body.takeaways),
      };
    });

  return [...extraManaged, ...mappedStatic];
}

export function useTranslatedEvent(slug: string): EventItem | undefined {
  return useTranslatedEvents().find((event) => event.slug === slug);
}
