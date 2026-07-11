"use client";

import { useEffect, useRef, useState } from "react";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [hover, setHover] = useState(false);
  const [label, setLabel] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    setEnabled(true);

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      }
      if (labelRef.current) {
        labelRef.current.style.transform = `translate3d(${mx + 20}px, ${my + 22}px, 0)`;
      }
    };

    const loop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const interactive = t.closest("a, button, [role='button'], input, textarea, select, label, [data-cursor='hover']");
      setHover(!!interactive);
      const labelHost = t.closest("[data-cursor-label]") as HTMLElement | null;
      setLabel(labelHost?.dataset.cursorLabel ?? "");
    };
    const onLeaveWin = () => {
      if (dotRef.current) dotRef.current.style.opacity = "0";
      if (ringRef.current) ringRef.current.style.opacity = "0";
      if (labelRef.current) labelRef.current.style.opacity = "0";
    };
    const onEnterWin = () => {
      if (dotRef.current) dotRef.current.style.opacity = "1";
      if (ringRef.current) ringRef.current.style.opacity = "1";
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("mouseleave", onLeaveWin);
    window.addEventListener("mouseenter", onEnterWin);
    document.documentElement.classList.add("has-custom-cursor");

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mouseleave", onLeaveWin);
      window.removeEventListener("mouseenter", onEnterWin);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={ringRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9998] hidden md:block"
        style={{
          width: hover ? 56 : 34,
          height: hover ? 56 : 34,
          borderRadius: 9999,
          border: "1.5px solid oklch(0.755 0.135 75 / 0.9)",
          background: hover ? "oklch(0.755 0.135 75 / 0.10)" : "transparent",
          backdropFilter: hover ? "blur(2px)" : "none",
          transition: "width 280ms cubic-bezier(.22,1,.36,1), height 280ms cubic-bezier(.22,1,.36,1), background 280ms ease, border-color 280ms ease",
          mixBlendMode: "difference",
          willChange: "transform",
        }}
      />
      <div
        ref={dotRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9999] hidden md:block"
        style={{
          width: hover ? 4 : 6,
          height: hover ? 4 : 6,
          borderRadius: 9999,
          background: "oklch(0.79 0.14 80)",
          boxShadow: "0 0 12px oklch(0.79 0.14 80 / 0.6)",
          transition: "width 220ms ease, height 220ms ease",
          willChange: "transform",
        }}
      />
      <div
        ref={labelRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9999] hidden md:flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]"
        style={{
          background: "oklch(0.755 0.135 75)",
          color: "oklch(0.20 0.05 258)",
          opacity: label ? 1 : 0,
          transition: "opacity 200ms ease",
          whiteSpace: "nowrap",
          boxShadow: "0 10px 24px -10px oklch(0.755 0.135 75 / 0.55)",
        }}
      >
        {label || "—"}
      </div>
    </>
  );
}
