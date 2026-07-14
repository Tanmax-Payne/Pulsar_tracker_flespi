"use client";

import { useCallback, useState } from "react";
import { DEFAULT_THEME, THEME_STORAGE_KEY } from "@/lib/themes";

// The blocking inline script in layout.tsx already sets data-theme on
// <html> before hydration (avoiding a flash of the wrong theme), and
// since that attribute isn't declared in layout.tsx's own JSX, React
// never reconciles it — so reading it back here is hydration-safe.
export function useTheme() {
  const [theme, setThemeState] = useState<string>(() => {
    if (typeof document === "undefined") return DEFAULT_THEME;
    return document.documentElement.dataset.theme || DEFAULT_THEME;
  });

  const setTheme = useCallback((id: string) => {
    setThemeState(id);
    document.documentElement.setAttribute("data-theme", id);
    localStorage.setItem(THEME_STORAGE_KEY, id);
  }, []);

  return { theme, setTheme };
}
