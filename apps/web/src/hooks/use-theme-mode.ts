"use client";

import { useCallback, useEffect, useState } from "react";

type ThemeMode = "dark" | "light" | "system";

const STORAGE_KEY = "linkden-admin-theme";

function getSystemPreference(): "dark" | "light" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useThemeMode() {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolved, setResolved] = useState<"dark" | "light">("light");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (stored && ["dark", "light", "system"].includes(stored)) {
      setModeState(stored);
    }
  }, []);

  useEffect(() => {
    const effectiveMode = mode === "system" ? getSystemPreference() : mode;
    setResolved(effectiveMode);

    // Listen for system preference changes
    if (mode === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        setResolved(e.matches ? "dark" : "light");
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [mode]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  }, []);

  const toggle = useCallback(() => {
    const next = resolved === "dark" ? "light" : "dark";
    setMode(next);
  }, [resolved, setMode]);

  return { mode, resolved, toggle, setMode, isDark: resolved === "dark" };
}
