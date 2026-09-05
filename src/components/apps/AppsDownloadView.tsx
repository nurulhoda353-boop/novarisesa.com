import { Download, ShieldCheck } from "lucide-react";

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

function platformLabel(platform: string): string {
  if (platform === "android") return "Android";
  if (platform === "ios") return "iOS";
  return platform;
}

export function AppsDownloadView({ release }: { release: AppReleaseInfo | null }) {
  return (
    <main className="min-h-screen bg-sand px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">NOVARISE</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-foreground">App Downloads</h1>
          <p className="mt-2 text-muted-foreground">
            Official app builds for our team and partners.
          </p>
        </div>

        {release ? (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-navy text-2xl font-bold text-navy-foreground">
                {release.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-semibold text-foreground">{release.name}</h2>
                <p className="text-sm text-muted-foreground">
                  Version {release.version} · {platformLabel(release.platform)} ·{" "}
                  {formatBytes(release.file_size)}
                </p>
              </div>
            </div>

            {release.release_notes && (
              <p className="mt-5 whitespace-pre-line rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                {release.release_notes}
              </p>
            )}

            <a
              href={release.file_url}
              download
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3.5 text-sm font-semibold text-gold-foreground transition hover:opacity-90 sm:w-auto"
            >
              <Download className="h-4 w-4" />
              Download {platformLabel(release.platform)} app
            </a>

            <p className="mt-3 text-xs text-muted-foreground">
              Updated{" "}
              {new Date(release.updated_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>

            {release.platform === "android" && (
              <div className="mt-5 flex gap-3 rounded-xl bg-muted px-4 py-3 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 shrink-0 text-gold" />
                <p>
                  Android may warn that this app is from outside the Play Store. Tap{" "}
                  <span className="font-semibold text-foreground">&ldquo;Install anyway&rdquo;</span> —
                  this build comes directly from NOVARISE.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            No app has been released yet. Check back soon.
          </div>
        )}

        <p className="mt-10 text-center text-xs text-muted-foreground">
          All future NOVARISE app releases will be published on this page.
        </p>
      </div>
    </main>
  );
}
