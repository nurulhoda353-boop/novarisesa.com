"use client";

import { useRef, type ReactNode, type MouseEvent, type ElementType } from "react";

type Props = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  strength?: number;
  href?: string;
  onClick?: () => void;
  [key: string]: unknown;
};

export function MagneticButton({
  as: Tag = "a",
  children,
  className,
  strength = 0.35,
  ...rest
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);

  const onMove = (e: MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    el.style.transform = `translate3d(${x * strength}px, ${y * strength}px, 0)`;
    if (innerRef.current) {
      innerRef.current.style.transform = `translate3d(${x * strength * 0.4}px, ${y * strength * 0.4}px, 0)`;
    }
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = "translate3d(0,0,0)";
    if (innerRef.current) innerRef.current.style.transform = "translate3d(0,0,0)";
  };

  return (
    <Tag
      ref={ref as never}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ transition: "transform 450ms cubic-bezier(.22,1,.36,1)", display: "inline-flex" }}
      {...rest}
    >
      <span ref={innerRef} style={{ transition: "transform 450ms cubic-bezier(.22,1,.36,1)", display: "inline-flex", alignItems: "center", gap: "0.75rem" }}>
        {children}
      </span>
    </Tag>
  );
}
