import DOMPurify from "dompurify";

const REMOTE_IMG_PLACEHOLDER = "data-novamail-remote-src";

export interface SanitizeResult {
  html: string;
  hadRemoteImages: boolean;
}

/**
 * Sanitizes an email HTML body for safe rendering in a sandboxed iframe.
 * Remote images are blocked by default (Gmail-style privacy behavior) and
 * moved to a data attribute so the caller can opt back in.
 */
export function sanitizeEmailHtml(rawHtml: string, allowRemoteImages: boolean): SanitizeResult {
  const clean = DOMPurify.sanitize(rawHtml, {
    WHOLE_DOCUMENT: false,
    ADD_ATTR: ["target"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["onerror", "onload", "onclick"],
  });

  if (allowRemoteImages) return { html: clean, hadRemoteImages: false };

  const container = document.createElement("div");
  container.innerHTML = clean;
  let hadRemoteImages = false;
  container.querySelectorAll("img[src]").forEach((img) => {
    const src = img.getAttribute("src") ?? "";
    if (src.startsWith("cid:") || src.startsWith("data:") || src.startsWith("blob:")) return;
    hadRemoteImages = true;
    img.setAttribute(REMOTE_IMG_PLACEHOLDER, src);
    img.removeAttribute("src");
  });
  return { html: container.innerHTML, hadRemoteImages };
}

export function restoreRemoteImages(html: string): string {
  const container = document.createElement("div");
  container.innerHTML = html;
  container.querySelectorAll(`img[${REMOTE_IMG_PLACEHOLDER}]`).forEach((img) => {
    const src = img.getAttribute(REMOTE_IMG_PLACEHOLDER);
    if (src) img.setAttribute("src", src);
  });
  return container.innerHTML;
}

/** Replaces `cid:<contentId>` image sources with resolved blob URLs. */
export function replaceCidSources(html: string, resolved: Map<string, string>): string {
  if (resolved.size === 0) return html;
  const container = document.createElement("div");
  container.innerHTML = html;
  container.querySelectorAll("img[src^='cid:']").forEach((img) => {
    const cid = (img.getAttribute("src") ?? "").slice(4).replace(/^<|>$/g, "");
    const blobUrl = resolved.get(cid);
    if (blobUrl) img.setAttribute("src", blobUrl);
  });
  return container.innerHTML;
}

/**
 * Email HTML is third-party content authored assuming a light background -
 * most real messages set backgrounds/borders on their own elements without
 * setting an explicit text color on every one, relying on the browser's
 * default dark-on-light. Forcing a dark body color here (as this used to do
 * for the app's dark theme) gets inherited by exactly those elements,
 * washing their text out against their own light backgrounds. Gmail,
 * Outlook, and Apple Mail all keep the message body itself light even in
 * dark mode for this reason - match that instead of trying to safely
 * color-invert arbitrary third-party CSS.
 */
export function wrapForIframe(html: string): string {
  return `<!doctype html><html><head><meta charset="utf-8" /><base target="_blank" /><style>
    html,body{margin:0;padding:0;background:#ffffff;color:#0B1739;font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;word-wrap:break-word;overflow-wrap:anywhere;}
    body{padding:4px 2px;}
    img{max-width:100%;height:auto;}
    a{color:#3563E9;}
    table{max-width:100%;}
    blockquote{border-left:2px solid #D8E0F5;margin:8px 0;padding:2px 0 2px 12px;color:#5B6B84;}
  </style></head><body>${html}</body></html>`;
}
