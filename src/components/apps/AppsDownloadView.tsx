"use client";

import { Calendar, Download, ShieldCheck, Sparkles } from "lucide-react";
import Image from "next/image";
import { useTranslation } from "react-i18next";

export interface AppReleaseInfo {
  slug: string;
  name: string;
  version: string;
  platform: string;
  file_url: string;
  file_size: number;
  release_notes: string | null;
  updated_at: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function platformLabel(platform: string, t: (key: string) => string): string {
  if (platform === "android") return t("appsDownload.platformAndroid");
  if (platform === "ios") return t("appsDownload.platformIos");
  return platform;
}

function downloadFileName(platform: string): string {
  return platform === "ios" ? "Novamail.ipa" : "Novamail.apk";
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}

export function AppsDownloadView({ release }: { release: AppReleaseInfo | null }) {
  const { t } = useTranslation();
  return (
    <main className="relative min-h-screen overflow-hidden bg-sand">
      {/* Soft brand-gradient backdrop, purely decorative */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 sm:h-96"
        style={{ background: "var(--gradient-hero)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-[-10%] h-72 w-72 rounded-full opacity-20 blur-3xl sm:h-96 sm:w-96"
        style={{ background: "var(--gradient-gold)" }}
      />

      <div className="relative mx-auto max-w-2xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-8 text-center sm:mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold" data-cms-field="appsDownload.eyebrow" suppressContentEditableWarning>{t("appsDownload.eyebrow")}</p>
          <h1 className="mt-2 font-display text-2xl font-bold text-navy-foreground sm:text-4xl" data-cms-field="appsDownload.title" suppressContentEditableWarning>
            {t("appsDownload.title")}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-navy-foreground/80 sm:text-base" data-cms-field="appsDownload.description" suppressContentEditableWarning>
            {t("appsDownload.description")}
          </p>
        </div>

        {release ? (
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
            <div className="h-1.5 w-full" style={{ background: "var(--gradient-gold)" }} />

            <div className="p-5 sm:p-8">
              <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white p-3 shadow-lg ring-1 ring-border sm:h-24 sm:w-24">
                  <Image
                    src="/apps/novamail-icon.png"
                    alt={`${release.name} icon`}
                    width={96}
                    height={96}
                    className="h-full w-full object-contain"
                    priority
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold text-foreground sm:text-2xl">{release.name}</h2>
                  <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                    <Badge><span data-cms-field="appsDownload.versionPrefix" suppressContentEditableWarning>{t("appsDownload.versionPrefix")}</span> {release.version}</Badge>
                    <Badge>{platformLabel(release.platform, t)}</Badge>
                    <Badge>{formatBytes(release.file_size)}</Badge>
                  </div>
                </div>
              </div>

              {release.release_notes && (
                <div className="mt-6 rounded-2xl bg-muted p-4">
                  <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-navy">
                    <Sparkles className="h-3.5 w-3.5 text-gold" />
                    <span data-cms-field="appsDownload.whatsNew" suppressContentEditableWarning>{t("appsDownload.whatsNew")}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {release.release_notes}
                  </p>
                </div>
              )}

              <a
                href={release.file_url}
                download={downloadFileName(release.platform)}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-semibold text-gold-foreground shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 sm:w-auto sm:px-8"
                style={{ background: "var(--gradient-gold)" }}
              >
                <Download className="h-4 w-4" />
                <span data-cms-field="appsDownload.downloadPrefix" suppressContentEditableWarning>{t("appsDownload.downloadPrefix")}</span> {platformLabel(release.platform, t)} <span data-cms-field="appsDownload.downloadSuffix" suppressContentEditableWarning>{t("appsDownload.downloadSuffix")}</span>
              </a>

              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground sm:justify-start">
                <Calendar className="h-3.5 w-3.5" />
                <span data-cms-field="appsDownload.updatedPrefix" suppressContentEditableWarning>{t("appsDownload.updatedPrefix")}</span>{" "}
                {new Date(release.updated_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>

              {release.platform === "android" && (
                <div className="mt-5 flex gap-3 rounded-2xl bg-muted px-4 py-3.5 text-left text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-gold" />
                  <p data-cms-field="appsDownload.sideloadWarning" suppressContentEditableWarning>
                    {t("appsDownload.sideloadWarning")}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground shadow-xl" data-cms-field="appsDownload.emptyState" suppressContentEditableWarning>
            {t("appsDownload.emptyState")}
          </div>
        )}

        <p className="mt-10 text-center text-xs text-muted-foreground" data-cms-field="appsDownload.footerNote" suppressContentEditableWarning>
          {t("appsDownload.footerNote")}
        </p>
      </div>
    </main>
  );
}
