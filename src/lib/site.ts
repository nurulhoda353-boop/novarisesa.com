/** Canonical production origin — keep sitemap, robots, meta, and JSON-LD in sync. */
export const SITE_URL = "https://novarisesa.com";

export const CONTACT_EMAIL = "ceo@novarisebd.com";
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
