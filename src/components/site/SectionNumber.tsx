"use client";

import { useTranslation } from "react-i18next";

type Props = {
  num: string;          // e.g. "02"
  arabic?: string;      // e.g. "٠٢"
  label?: string;       // e.g. "Capabilities"
  className?: string;
  tone?: "light" | "dark";
};

const arabicMap: Record<string, string> = {
  "0": "٠", "1": "١", "2": "٢", "3": "٣", "4": "٤",
  "5": "٥", "6": "٦", "7": "٧", "8": "٨", "9": "٩",
};

function toArabicNumerals(s: string) {
  return s.split("").map((c) => arabicMap[c] ?? c).join("");
}

export function SectionNumber({ num, arabic, label, className = "", tone = "light" }: Props) {
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const ar = arabic ?? toArabicNumerals(num);
  const labelColor = tone === "dark" ? "text-white/70" : "text-navy";
  const arColor = tone === "dark" ? "text-white/40" : "text-navy/45";
  const numColor = tone === "dark" ? "text-white/45" : "text-navy/55";
  const dividerColor = tone === "dark" ? "bg-gold/50" : "bg-gold";
  // Render the locale-appropriate numeral set only — mixing Arabic-Indic
  // numerals on EN pages caused fallback glyphs that read as "· £" etc.
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {!isRtl && (
        <span className={`font-mono text-xs tracking-[0.25em] tabular-nums ${numColor}`}>
          {num}
        </span>
      )}
      <span className={`h-px w-8 ${dividerColor}`} />
      {label && (
        <span className={`text-[11px] uppercase tracking-[0.3em] font-semibold ${labelColor}`}>
          {label}
        </span>
      )}
      {isRtl && (
        <span className={`font-arabic text-sm ${arColor}`} dir="rtl">
          {ar}
        </span>
      )}
    </div>
  );
}
