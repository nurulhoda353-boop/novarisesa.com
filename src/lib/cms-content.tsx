"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import i18n from "@/i18n/config";
import { API_URL } from "./site";
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

function collectionTranslationOverrides(collections: CmsCollections) {
  const serviceDetails = Object.fromEntries(
    (collections.services ?? []).map((item) => [
      item.slug,
      {
        title: item.title,
        tagline: item.summary,
        lead: item.data.lead,
        intro: item.data.intro,
        eyebrow: item.data.eyebrow,
        subServices: item.data.sub_services,
        faqs: item.data.faqs,
        capabilities: item.data.capabilities,
        process: item.data.process,
        certifications: item.data.certifications,
      },
    ]),
  );

  const services = Object.fromEntries(
    (collections.services ?? []).map((item) => [
      item.slug,
      { label: item.title, desc: item.summary },
    ]),
  );

  const projectItems = Object.fromEntries(
    (collections.projects ?? []).map((item) => [
      item.slug,
      {
        title: item.title,
        scope: item.summary,
        client: item.data.client_name,
        location: item.data.location,
        ...((item.data.body as Record<string, unknown> | undefined) ?? {}),
      },
    ]),
  );

  const requirementItems = Object.fromEntries(
    (collections.requirements ?? []).map((item) => [
      item.slug,
      {
        position: item.title,
        project: item.data.project_name,
        approval: item.data.approval,
        duration: item.data.duration,
        salaryCycle: item.data.salary_cycle,
        food: item.data.food,
        accommodation: item.data.accommodation,
        documents: item.data.documents,
      },
    ]),
  );

  return {
    services,
    serviceDetails,
    projects: { items: projectItems },
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
        applyTranslationOverrides(next.settings, locale);
        i18n.addResourceBundle(locale, "translation", collectionTranslationOverrides(next.collections), true, true);
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
