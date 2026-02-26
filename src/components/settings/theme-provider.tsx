"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  applyThemeToDocument,
  getSystemTheme,
  persistThemePreference,
  readStoredThemePreference,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/preferences/theme";

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialDocumentPreference(): ThemePreference {
  if (typeof document === "undefined") {
    return "system";
  }

  const raw = document.documentElement.getAttribute("data-theme-preference");
  if (raw === "light" || raw === "dark" || raw === "system") {
    return raw;
  }

  return "system";
}

function getInitialThemeState() {
  const initialPreference = readStoredThemePreference() ?? getInitialDocumentPreference();
  const initialResolvedTheme = resolveTheme(initialPreference, getSystemTheme());
  return {
    preference: initialPreference,
    resolvedTheme: initialResolvedTheme,
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeState, setThemeState] = useState(getInitialThemeState);
  const preference = themeState.preference;
  const resolvedTheme = themeState.resolvedTheme;

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    const nextResolvedTheme = resolveTheme(nextPreference, getSystemTheme());
    setThemeState({
      preference: nextPreference,
      resolvedTheme: nextResolvedTheme,
    });
    persistThemePreference(nextPreference);
    applyThemeToDocument(nextPreference, nextResolvedTheme);
  }, []);

  useEffect(() => {
    applyThemeToDocument(preference, resolvedTheme);

    if (!readStoredThemePreference()) {
      persistThemePreference(preference);
    }
  }, [preference, resolvedTheme]);

  useEffect(() => {
    if (preference !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => {
      const nextResolvedTheme = mediaQuery.matches ? "dark" : "light";
      setThemeState((current) => {
        if (current.preference !== "system" || current.resolvedTheme === nextResolvedTheme) {
          return current;
        }
        return {
          ...current,
          resolvedTheme: nextResolvedTheme,
        };
      });
      applyThemeToDocument("system", nextResolvedTheme);
    };

    mediaQuery.addEventListener("change", syncSystemTheme);
    return () => {
      mediaQuery.removeEventListener("change", syncSystemTheme);
    };
  }, [preference]);

  const value = useMemo(
    () => ({
      preference,
      resolvedTheme,
      setPreference,
    }),
    [preference, resolvedTheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreference() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemePreference must be used within ThemeProvider.");
  }

  return context;
}
