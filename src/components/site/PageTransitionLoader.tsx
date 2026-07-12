"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const logo = "/assets/novarise-logo-mark.png";

/**
 * Greencare-style page loader: clean stage, breathing logo, slim progress bar.
 * Shown briefly on client-side route changes.
 */
export function PageTransitionLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const isFirstRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (isFirstRef.current) {
      isFirstRef.current = false;
      return;
    }

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    setVisible(true);
    setFading(false);

    // Start fade, then unmount — same rhythm as Greencare
    timersRef.current.push(setTimeout(() => setFading(true), 420));
    timersRef.current.push(setTimeout(() => setVisible(false), 900));

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-500 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ backgroundColor: "#F7F1E9" }}
    >
      <div className="relative flex flex-col items-center justify-center gap-8">
        <div className="relative h-28 w-28 sm:h-32 sm:w-32 animate-[novarise-loader-breathe_1.8s_ease-in-out_infinite]">
          <Image
            src={logo}
            alt="NOVARISE"
            fill
            sizes="128px"
            className="object-contain"
            draggable={false}
            priority
          />
        </div>

        <div className="relative h-[2px] w-48 overflow-hidden rounded-full bg-navy/10">
          <span className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gold animate-[novarise-loader-bar_1.4s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}
