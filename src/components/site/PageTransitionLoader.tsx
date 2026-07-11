"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
const logo = "/assets/novarise-logo-mark.png";

/**
 * Editorial page-transition loader.
 * Clean dark stage, crisp logo, gold progress meter.
 * Briefly shown on each client-side route change.
 */
export function PageTransitionLoader() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const isFirstRef = useRef(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const MIN_DURATION = 600;

  useEffect(() => {
    if (isFirstRef.current) {
      isFirstRef.current = false;
      return;
    }
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setShow(true);
    hideTimerRef.current = setTimeout(() => setShow(false), MIN_DURATION);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [pathname]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="page-transition"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
          aria-hidden
        >
          {/* Solid editorial backdrop */}
          <div className="absolute inset-0" style={{ backgroundColor: "oklch(0.16 0.04 258)" }} />
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(oklch(0.755 0.135 75 / 0.4) 1px, transparent 1px), linear-gradient(90deg, oklch(0.755 0.135 75 / 0.4) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/60" />

          {/* Curtain wipe */}
          <motion.div
            className="absolute inset-x-0 top-0 h-full origin-top"
            style={{ backgroundColor: "oklch(0.755 0.135 75)", transformOrigin: "top" }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: [0, 1, 0] }}
            transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1], times: [0, 0.5, 1] }}
            
          />

          {/* Center stage */}
          <div className="relative flex flex-col items-center">
            {/* Logo — clean, no blur, no rotating rings overlapping it */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative h-28 w-28 flex items-center justify-center"
            >
              {/* Soft glow halo behind, not on top */}
              <div className="absolute inset-[-30%] rounded-full bg-gold/15 blur-3xl" />
              <Image
                src={logo}
                alt="NOVARISE"
                fill
                sizes="112px"
                className="relative object-contain"
                style={{ filter: "drop-shadow(0 6px 20px rgba(0,0,0,0.45))" }}
                draggable={false}
              />
            </motion.div>

            {/* Wordmark */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 flex flex-col items-center"
            >
              <div className="text-[12px] font-semibold uppercase tracking-[0.5em] text-white">
                NOVARISE
              </div>
              <div className="mt-1.5 text-[9px] uppercase tracking-[0.4em] text-gold/85">
                Trading &middot; Contracting
              </div>
            </motion.div>

            {/* Progress meter */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="mt-7 h-[2px] w-52 overflow-hidden rounded-full bg-white/10"
            >
              <motion.div
                className="h-full bg-gradient-to-r from-gold/40 via-gold to-gold/40"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1.1, ease: "easeInOut", repeat: Infinity }}
                style={{ width: "50%" }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
