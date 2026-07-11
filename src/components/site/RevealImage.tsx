"use client";

import { motion, useReducedMotion } from "framer-motion";

type Props = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
  direction?: "left" | "right" | "up" | "down";
  delay?: number;
  duration?: number;
  className?: string;
  wrapperClassName?: string;
};

const SILK = [0.22, 1, 0.36, 1] as const;

export function RevealImage({
  direction = "left",
  delay = 0,
  duration = 1.25,
  className,
  wrapperClassName,
  src,
  alt,
  width,
  height,
  loading,
}: Props) {
  const reduce = useReducedMotion();

  const initial =
    direction === "left"
      ? "inset(0 100% 0 0)"
      : direction === "right"
      ? "inset(0 0 0 100%)"
      : direction === "up"
      ? "inset(100% 0 0 0)"
      : "inset(0 0 100% 0)";

  return (
    <motion.div
      className={wrapperClassName ?? "overflow-hidden"}
      initial={{ clipPath: reduce ? "inset(0)" : initial }}
      whileInView={{ clipPath: "inset(0)" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: reduce ? 0 : duration, delay, ease: SILK }}
    >
      <motion.img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        className={className}
        initial={{ scale: reduce ? 1 : 1.18 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: reduce ? 0 : duration + 0.4, delay, ease: SILK }}
      />
    </motion.div>
  );
}
