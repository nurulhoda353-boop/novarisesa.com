"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import i18n from "@/i18n/config";
import { API_URL } from "./site";
import { allProjects } from "./projects-data";
import { useEditMode } from "@/components/cms/EditModeContext";

type CmsCollections = Record<string, CmsItem[]>;
type CmsSettings = Record<string, Record<string, unknown>>;
export type CmsNavigationItem = {
  id: string;
  location: string;
  parent_id?: string | null;
  label: string;
  labels: Record<string, string>;
  url: string;
  sort_order: number;
};

export type CmsItem = {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  status: string;
  is_featured: boolean;
  sort_order: number;
  updated_at: string;
  data: Record<string, unknown>;
};

type CmsPayload = {
  locale: string;
  settings: CmsSettings;
  collections: CmsCollections;
  navigation: CmsNavigationItem[];
};

type CmsContextValue = {
  payload: CmsPayload | null;
  settings: CmsSettings;
  collections: CmsCollections;
  navigation: CmsNavigationItem[];
  loading: boolean;
};

const CmsContext = createContext<CmsContextValue>({
  payload: null,
  settings: {},
  collections: {},
  navigation: [],
  loading: true,
});

function parseStructuredValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed || !/^[\[{]/.test(trimmed)) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function normalizeSettings(settings: CmsSettings): CmsSettings {
  return Object.fromEntries(
    Object.entries(settings).map(([group, values]) => [
      group,
      Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, parseStructuredValue(value)]),
      ),
    ]),
  );
}

function applyTranslationOverrides(settings: CmsSettings, locale: string) {
  const overrides =
    settings.translations?.[locale] ??
    settings.site_copy?.[locale] ??
    settings.copy?.[locale];

  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) return;
  i18n.addResourceBundle(locale, "translation", overrides, true, true);
}

/** Drops undefined/null entries so a deep merge never blanks a bundled default. */
function prune<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== null),
  ) as Partial<T>;
}

function collectionTranslationOverrides(collections: CmsCollections) {
  const serviceDetails = Object.fromEntries(
    (collections.services ?? []).map((item) => [
      item.slug,
      prune({
        title: item.title,
        tagline: item.summary,
        lead: item.data.lead,
        intro: item.data.intro,
        eyebrow: item.data.eyebrow,
        subServices: item.data.sub_services,
        faqs: item.data.faqs,
        // useTranslatedService reads `capabilities.rows`, not a bare array.
        capabilities: Array.isArray(item.data.capabilities)
          ? { rows: item.data.capabilities }
          : undefined,
        process: item.data.process,
        certifications: item.data.certifications,
        portfolio: item.data.portfolio,
      }),
    ]),
  );

  const services = Object.fromEntries(
    (collections.services ?? []).map((item) => [
      item.slug,
      { label: item.title, desc: item.summary },
    ]),
  );

  // en.json keys the 12 launch projects by camelCase key, not by slug.
  const projectKey = (slug: string) =>
    allProjects.find((project) => project.slug === slug)?.key ?? slug;

  const projectItems = Object.fromEntries(
    (collections.projects ?? []).map((item) => {
      const body = (item.data.body as Record<string, unknown> | undefined) ?? {};
      const { long: _long, highlights: _highlights, ...facts } = body;
      return [
        projectKey(item.slug),
        prune({
          title: item.title,
          scope: item.summary,
          client: item.data.client_name,
          location: item.data.location,
          ...facts,
        }),
      ];
    }),
  );

  // Long-form copy lives under projects.content.<key>, a separate namespace.
  const projectContent = Object.fromEntries(
    (collections.projects ?? []).map((item) => {
      const body = (item.data.body as Record<string, unknown> | undefined) ?? {};
      return [
        projectKey(item.slug),
        prune({
          long: Array.isArray(body.long) && body.long.length ? body.long : undefined,
          highlights: Array.isArray(body.highlights) && body.highlights.length
            ? body.highlights
            : undefined,
        }),
      ];
    }),
  );

  const postItems = Object.fromEntries(
    (collections.posts ?? []).map((item) => {
      const body = (item.data.body as Record<string, unknown> | undefined) ?? {};
      return [
        item.slug,
        prune({
          title: item.title,
          excerpt: item.summary,
          date: body.date,
          paragraphs: Array.isArray(body.paragraphs) && body.paragraphs.length
            ? body.paragraphs
            : undefined,
        }),
      ];
    }),
  );

  const requirementItems = Object.fromEntries(
    (collections.requirements ?? []).map((item) => [
      item.slug,
      prune({
        position: item.title,
        project: item.data.project_name,
        approval: item.data.approval,
        duration: item.data.duration,
        salaryCycle: item.data.salary_cycle,
        food: item.data.food,
        accommodation: item.data.accommodation,
        documents: item.data.documents,
      }),
    ]),
  );

  return {
    services,
    serviceDetails,
    projects: { items: projectItems, content: projectContent },
    blogPage: { posts: postItems },
    requirementsPage: { items: requirementItems },
  };
}

async function loadCmsPayload(locale: string): Promise<CmsPayload> {
  const response = await fetch(`${API_URL}/public/site-content?locale=${locale}`, {
    credentials: "omit",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("CMS content is unavailable");
  }
  const payload = (await response.json()) as CmsPayload;
  return { ...payload, settings: normalizeSettings(payload.settings ?? {}) };
}

export function CmsContentProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<CmsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function refresh(locale: string) {
      setLoading(true);
      try {
        const next = await loadCmsPayload(locale);
        if (cancelled) return;
        // Collection-derived copy first, then the saved translation document on
        // top: pen-mode edits and dashboard saves both land in that document, so
        // it must win over values auto-derived from the collection rows.
        i18n.addResourceBundle(locale, "translation", collectionTranslationOverrides(next.collections), true, true);
        applyTranslationOverrides(next.settings, locale);
        setPayload(next);
      } catch {
        if (!cancelled) setPayload(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void refresh(i18n.language || "en");
    i18n.on("languageChanged", refresh);
    return () => {
      cancelled = true;
      i18n.off("languageChanged", refresh);
    };
  }, []);

  const value = useMemo<CmsContextValue>(
    () => ({
      payload,
      settings: payload?.settings ?? {},
      collections: payload?.collections ?? {},
      navigation: payload?.navigation ?? [],
      loading,
    }),
    [payload, loading],
  );

  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>;
}

export function useCmsContent() {
  return useContext(CmsContext);
}

export function useCmsAsset(key: string, fallback: string): string {
  const { settings } = useCmsContent();
  const { assetOverrides } = useEditMode();
  if (assetOverrides[key]) return assetOverrides[key];
  const value = settings.assets?.[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function useCmsNavigation(location: string): CmsNavigationItem[] {
  const { navigation } = useCmsContent();
  return useMemo(
    () => navigation.filter((item) => item.location === location),
    [navigation, location],
  );
}
