export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "app.theme";

export const themePreferenceValues: ThemePreference[] = ["light", "dark", "system"];

export function isThemePreference(value: string | null | undefined): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(preference: ThemePreference, systemTheme: ResolvedTheme): ResolvedTheme {
  if (preference === "system") {
    return systemTheme;
  }

  return preference;
}

export function readStoredThemePreference(): ThemePreference | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (!isThemePreference(stored)) {
    return null;
  }

  return stored;
}

export function persistThemePreference(preference: ThemePreference) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, preference);
}

export function applyThemeToDocument(preference: ThemePreference, resolved: ResolvedTheme) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.setAttribute("data-theme", resolved);
  root.setAttribute("data-theme-preference", preference);
  root.style.colorScheme = resolved;
}

export const themeInitScript = `(() => {
  try {
    const key = "${THEME_STORAGE_KEY}";
    const stored = window.localStorage.getItem(key);
    const preference =
      stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const resolved = preference === "system" ? systemTheme : preference;
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.setAttribute("data-theme", resolved);
    root.setAttribute("data-theme-preference", preference);
    root.style.colorScheme = resolved;
  } catch {}
})();`;
