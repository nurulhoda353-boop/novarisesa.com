"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-[0.3em] text-gold mb-3" data-cms-field="notFound.code" suppressContentEditableWarning>{t("notFound.code")}</div>
        <h1 className="text-3xl md:text-4xl font-bold text-navy" data-cms-field="notFound.title" suppressContentEditableWarning>{t("notFound.title")}</h1>
        <p className="mt-3 text-muted-foreground" data-cms-field="notFound.description" suppressContentEditableWarning>
          {t("notFound.description")}
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-deep"
          data-cms-field="notFound.backHome"
          suppressContentEditableWarning
        >
          {t("notFound.backHome")}
        </Link>
      </div>
    </div>
  );
}
