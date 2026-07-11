"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { type ElementType, type ReactNode, useMemo } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

type Segment =
  | string
  | { text: string; className?: string; underline?: boolean };

type Props = {
  /** Plain text (single line) OR array of lines. Each line may be a string or a styled segment. */
  text?: string;
  lines?: Segment[];
  as?: ElementType;
  className?: string;
  /** Delay before the first word (s). */
  delay?: number;
  /** Per-word stagger (s). */
  stagger?: number;
  /** Vertical offset (px). */
  y?: number;
  /** Disable blur (slightly cheaper). */
  noBlur?: boolean;
  /** Trigger when in view (default) or immediately on mount. */
  trigger?: "view" | "mount";
  children?: ReactNode;
};

/**
 * Word-by-word reveal heading with optional blur, perfect for hero / section titles.
 * Respects prefers-reduced-motion.
 */
export function AnimatedHeading({
  text,
  lines,
  as: Tag = "h2",
  className,
  delay = 0,
  stagger = 0.06,
  y = 28,
  noBlur = false,
  trigger = "view",
  children,
}: Props) {
  const reduce = useReducedMotion();
  const segments: Segment[] = useMemo(() => {
    if (lines) return lines;
    if (text) return [text];
    return [];
  }, [lines, text]);

  const word: Variants = {
    hidden: {
      opacity: 0,
      y: reduce ? 0 : y,
      filter: reduce || noBlur ? "blur(0px)" : "blur(10px)",
    },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.9, ease: EASE },
    },
  };

  const container: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: stagger, delayChildren: delay },
    },
  };

  const motionProps =
    trigger === "mount"
      ? { initial: "hidden", animate: "show" as const }
      : {
          initial: "hidden" as const,
          whileInView: "show" as const,
          viewport: { once: true, amount: 0.2 },
        };

  const MotionTag = useMemo(() => motion.create(Tag as React.ComponentType<Record<string, unknown>>), [Tag]);

  return (
    <MotionTag className={className} variants={container} {...motionProps}>
      {segments.map((seg, lineIdx) => {
        const isObj = typeof seg !== "string";
        const lineText = isObj ? seg.text : seg;
        const lineClass = isObj ? seg.className : undefined;
        const underline = isObj ? seg.underline : false;
        const words = lineText.split(" ");
        return (
          <span key={lineIdx} className="block">
            {words.map((w, wIdx) => {
              const isLast = wIdx === words.length - 1;
              return (
                <motion.span
                  key={`${lineIdx}-${wIdx}`}
                  variants={word}
                  className={`inline-block mr-[0.22em] ${lineClass ?? ""} ${
                    underline && isLast ? "underline-draw" : ""
                  }`}
                >
                  {w}
                </motion.span>
              );
            })}
          </span>
        );
      })}
      {children}
    </MotionTag>
  );
}
