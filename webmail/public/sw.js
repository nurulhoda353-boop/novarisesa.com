// Minimal service worker: makes the app reliably installable as a desktop
// PWA and gives the app *shell* (not mail data) an offline fallback. Mail
// data is deliberately never cached here - it must always be live; the
// app already has its own offline message cache (see MailApp.tsx) for
// when a request genuinely fails.
const SHELL_CACHE = "novamail-shell-v1";
const SHELL_URLS = ["/", "/icon.png", "/novamail-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  // Never intercept API calls (mail.novarisesa.com talks to
  // api.novarisesa.com) - those must always hit the network, and the
  // app's own offline handling already covers a failed one.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached || Response.error()))
  );
});
