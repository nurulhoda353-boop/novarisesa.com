"use client";

import { useCallback, useEffect, useState } from "react";

const THEME_KEY = "novamail-theme";

export type ThemeMode = "light" | "dark";

function apply(mode: ThemeMode): void {
  document.documentElement.classList.toggle("dark", mode === "dark");
}

export function useTheme(): [ThemeMode, () => void] {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY) as ThemeMode | null;
    const initial = stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setMode(initial);
    apply(initial);
  }, []);

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next: ThemeMode = prev === "dark" ? "light" : "dark";
      window.localStorage.setItem(THEME_KEY, next);
      apply(next);
      return next;
    });
  }, []);

  return [mode, toggle];
}
