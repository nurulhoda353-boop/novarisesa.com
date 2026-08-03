"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { useEditMode } from "@/components/cms/EditModeContext";

const SILK = [0.22, 1, 0.36, 1] as const;

/**
 * Wraps a page section with a cinematic entrance animation.
 * Fades + lifts + blurs in as the section enters the viewport.
 */
export function SectionReveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const { editing } = useEditMode();

  const variants: Variants = {
    hidden: {
      opacity: 0,
      y: reduce ? 0 : 40,
      filter: reduce ? "blur(0px)" : "blur(10px)",
    },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 1.15, delay, ease: SILK },
    },
  };

  // Pen mode: skip the whileInView entrance animation — a data-cms-field
  // descendant being toggled contentEditable can otherwise leave this stuck
  // at its hidden (invisible) state.
  if (editing) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.08, margin: "0px 0px -8% 0px" }}
      style={{ willChange: "transform, opacity, filter" }}
    >
      {children}
    </motion.div>
  );
}
