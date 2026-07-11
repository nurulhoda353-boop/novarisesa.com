"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/**
 * Thin gold progress bar fixed to the top of the viewport, tracking page scroll.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX, transformOrigin: "0% 50%" }}
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] bg-gradient-to-r from-gold/60 via-gold to-gold/60 shadow-[0_0_12px_rgba(201,168,76,0.6)]"
    />
  );
}
