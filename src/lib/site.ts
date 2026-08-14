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
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, website: "" }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The request timed out. Please check your connection and try again.");
    }
    throw new Error("We could not connect. Please check your connection and try again.");
  } finally {
    window.clearTimeout(timeout);
  }
  if (!response.ok) {
    throw new Error("We could not submit your request. Please try again.");
  }
  return response.json() as Promise<T>;
}
