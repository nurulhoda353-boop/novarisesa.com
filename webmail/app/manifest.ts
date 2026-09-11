import type { MetadataRoute } from "next";

// Makes the web app installable (Chrome/Edge "Install Novamail…") - once
// installed it opens in its own window with no address bar/tabs, same as
// a native desktop app. See public/sw.js for the service worker that
// makes the install prompt reliable and gives the app shell an offline
// fallback (API data itself already has its own offline cache, see
// MailApp.tsx's cacheMessages/loadCachedMessages).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Novamail",
    short_name: "Novamail",
    description: "The NOVARISE email workspace — inbox, compose, and account tools.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b1739",
    theme_color: "#1e3a66",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
