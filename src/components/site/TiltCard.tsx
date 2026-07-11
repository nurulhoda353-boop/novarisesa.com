"use client";

import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { type ReactNode, type MouseEvent } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** Max tilt in degrees. */
  intensity?: number;
  /** Subtle glare overlay on hover. */
  glare?: boolean;
};

/**
 * 3D tilt-on-hover card wrapper. Disabled on touch devices and reduced-motion.
 */
export function TiltCard({ children, className, intensity = 8, glare = true }: Props) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(my, [0, 1], [intensity, -intensity]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-intensity, intensity]), { stiffness: 200, damping: 20 });
  const glareX = useTransform(mx, [0, 1], ["0%", "100%"]);
  const glareY = useTransform(my, [0, 1], ["0%", "100%"]);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  };

  const reset = () => {
    mx.set(0.5);
    my.set(0.5);
  };

  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{
        rotateX: reduce ? 0 : rotateX,
        rotateY: reduce ? 0 : rotateY,
        transformPerspective: 1000,
        transformStyle: "preserve-3d",
      }}
      className={`relative will-change-transform [@media(hover:none)]:!transform-none ${className ?? ""}`}
    >
      {children}
      {glare && !reduce && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 hover:opacity-100 [@media(hover:none)]:hidden"
          style={{
            background: `radial-gradient(600px circle at var(--gx, 50%) var(--gy, 50%), rgba(255,255,255,0.10), transparent 40%)`,
            // @ts-expect-error css custom properties
            "--gx": glareX,
            "--gy": glareY,
          }}
        />
      )}
    </motion.div>
  );
}
