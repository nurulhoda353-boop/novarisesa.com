"use client";

import { useEffect } from "react";
import i18n, {
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  applyLanguageToDocument,
} from "./config";

/**
 * Mounts once at the root. On the client, reads the saved language
 * from localStorage and switches i18next + <html lang/dir> accordingly.
 * On the server it does nothing — SSR always renders the default (en).
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    } catch {
      // localStorage unavailable — ignore
    }
    const lang = (SUPPORTED_LANGUAGES as readonly string[]).includes(saved ?? "")
      ? (saved as SupportedLanguage)
      : "en";
    if (i18n.language !== lang) {
      void i18n.changeLanguage(lang);
    }
    applyLanguageToDocument(lang);
  }, []);

  return <>{children}</>;
}
