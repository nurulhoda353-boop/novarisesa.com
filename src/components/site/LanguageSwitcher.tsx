"use client";

import { useTranslation } from "react-i18next";
import {
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  applyLanguageToDocument,
} from "@/i18n/config";

type Variant = "light" | "dark";

interface Props {
  variant?: Variant;
  className?: string;
  compact?: boolean;
}

export function LanguageSwitcher({ variant = "light", className = "", compact = false }: Props) {
  const { i18n, t } = useTranslation();
  const current = (SUPPORTED_LANGUAGES as readonly string[]).includes(i18n.language)
    ? (i18n.language as SupportedLanguage)
    : "en";

  const setLang = (lng: SupportedLanguage) => {
    if (lng === current) return;
    void i18n.changeLanguage(lng);
    applyLanguageToDocument(lng);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
    } catch {
      // ignore
    }
  };

  const isLight = variant === "light";
  const trackCls = isLight
    ? "border-white/25 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
    : "border-navy/10 bg-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]";
  const inactiveCls = isLight
    ? "text-white/70 hover:text-white"
    : "text-navy/60 hover:text-navy";

  const pillSize = compact
    ? "h-5 min-w-[20px] px-1.5 text-[10px]"
    : "h-7 min-w-[28px] px-2.5 text-[12px]";
  const trackSize = compact
    ? "h-7 p-0.5 rounded-xl gap-0"
    : "h-9 p-1 rounded-2xl gap-0.5";
  const arStyle: React.CSSProperties = compact
    ? { fontSize: "13px", letterSpacing: 0 }
    : { fontSize: "15px", letterSpacing: 0 };

  const Pill = ({
    lng,
    label,
    style,
  }: {
    lng: SupportedLanguage;
    label: string;
    style?: React.CSSProperties;
  }) => {
    const active = current === lng;
    return (
      <button
        type="button"
        onClick={() => setLang(lng)}
        aria-pressed={active}
        aria-label={lng === "ar" ? "التبديل إلى العربية" : "Switch to English"}
        className={`relative z-10 inline-flex items-center justify-center rounded-full font-bold tracking-[0.16em] uppercase transition-colors duration-300 ${pillSize} ${
          active ? "text-gold-foreground" : inactiveCls
        }`}
        style={style}
      >
        {active && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-gold shadow-[0_2px_10px_-2px_rgba(212,175,55,0.55)]"
          />
        )}
        <span className="relative">{label}</span>
      </button>
    );
  };

  return (
    <div
      role="group"
      aria-label={t("language.label") ?? "Language"}
      className={`inline-flex items-center border backdrop-blur-2xl backdrop-saturate-150 transition-colors duration-300 ${trackSize} ${trackCls} ${className}`}
    >
      <Pill lng="en" label="EN" />
      <Pill lng="ar" label="ع" style={arStyle} />
    </div>
  );
}
