/** Canonical production origin — keep sitemap, robots, meta, and JSON-LD in sync. */
export const SITE_URL = "https://novarisesa.com";
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.novarisesa.com/api/v1";

export const CONTACT_EMAIL = "info@novarisesa.com";
export const CONTACT_PHONE_DISPLAY = "+966 55 442 9574";
export const CONTACT_PHONE_TEL = "+966554429574";
export const CONTACT_WHATSAPP = "966554429574";

export function absoluteUrl(path = "/"): string {
  if (path.startsWith("http")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized === "/" ? "/" : normalized}`;
}

export function mailtoUrl(subject: string, body: string, to = CONTACT_EMAIL): string {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function submitWebsiteForm<T>(
  path: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, website: "" }),
  });
  if (!response.ok) {
    throw new Error("We could not submit your request. Please try again.");
  }
  return response.json() as Promise<T>;
}
