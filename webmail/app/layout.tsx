import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://mail.novarisesa.com"),
  title: "Novamail",
  description: "The NOVARISE email workspace — inbox, compose, and account tools in your browser.",
  robots: { index: false, follow: false },
  icons: { icon: "/icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("novamail-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})()`,
          }}
        />
        {/* Undoes the PWA install-prompt experiment (manifest.ts/sw.js
            removed) - unregisters the service worker for anyone who already
            loaded that version, so the browser stops offering "Install
            Novamail…" and nothing keeps intercepting requests. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if("serviceWorker" in navigator){navigator.serviceWorker.getRegistrations().then(function(regs){regs.forEach(function(r){r.unregister()})}).catch(function(){})}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
