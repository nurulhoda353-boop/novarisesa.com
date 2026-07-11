import { useEffect } from "react";

/**
 * Animates every <h1> and <h2> inside <main> as it first enters the viewport.
 * Uses clip-path + translate + blur so nested spans (gradients, colors) are preserved.
 * Handles route changes / lazy content via a MutationObserver.
 */
export function useTitleReveal() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("title-reveal-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
    );

    const process = () => {
      const nodes = document.querySelectorAll<HTMLElement>(
        "main h1:not([data-tr]), main h2:not([data-tr])",
      );
      nodes.forEach((el) => {
        el.setAttribute("data-tr", "");
        el.classList.add("title-reveal");
        // If already in view on mount, reveal on next frame.
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
          requestAnimationFrame(() => el.classList.add("title-reveal-in"));
        } else {
          io.observe(el);
        }
      });
    };

    process();
    const mo = new MutationObserver(() => process());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
}
