import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AppsDownloadView, type AppReleaseInfo } from "@/components/apps/AppsDownloadView";
import { AppsPasswordGate } from "@/components/apps/AppsPasswordGate";
import { APPS_GATE_COOKIE, isAppsGateAuthorized } from "@/lib/apps-gate";
import { API_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "App Downloads",
  robots: { index: false, follow: false },
};

// The Android build is the only release today; future apps get their own
// slug and simply appear alongside it here.
const RELEASE_SLUGS = ["novamail-android"];

async function fetchLatestRelease(slug: string): Promise<AppReleaseInfo | null> {
  try {
    const response = await fetch(`${API_URL}/app-releases/${slug}/latest`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as AppReleaseInfo;
  } catch {
    return null;
  }
}

export default async function AppsPage() {
  const cookieStore = await cookies();
  if (!isAppsGateAuthorized(cookieStore.get(APPS_GATE_COOKIE)?.value)) {
    return <AppsPasswordGate />;
  }

  const releases = (
    await Promise.all(RELEASE_SLUGS.map((slug) => fetchLatestRelease(slug)))
  ).filter((release): release is AppReleaseInfo => release !== null);

  return <AppsDownloadView release={releases[0] ?? null} />;
}
