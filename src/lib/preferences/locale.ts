export type AppLocale = "es" | "en";

export const LOCALE_STORAGE_KEY = "app.locale";
export const LOCALE_COOKIE_KEY = "app.locale";

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === "es" || value === "en";
}

export function mapLanguageTagToLocale(tag: string | null | undefined): AppLocale {
  if (!tag) {
    return "en";
  }

  return tag.toLowerCase().startsWith("es") ? "es" : "en";
}

export function localeToLanguageTag(locale: AppLocale): "es-ES" | "en-US" {
  return locale === "es" ? "es-ES" : "en-US";
}

export function detectLocaleFromNavigator(): AppLocale {
  if (typeof navigator === "undefined") {
    return "en";
  }

  const candidates = [...(navigator.languages ?? []), navigator.language];
  for (const candidate of candidates) {
    if (mapLanguageTagToLocale(candidate) === "es") {
      return "es";
    }
  }

  return "en";
}

export function detectLocaleFromAcceptLanguage(header: string | null | undefined): AppLocale {
  if (!header) {
    return "en";
  }

  const languageTags = header
    .split(",")
    .map((entry) => entry.trim().split(";")[0])
    .filter(Boolean);

  for (const languageTag of languageTags) {
    if (mapLanguageTagToLocale(languageTag) === "es") {
      return "es";
    }
  }

  return "en";
}

export function resolveInitialLocale(input: {
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
}): AppLocale {
  if (isAppLocale(input.cookieLocale)) {
    return input.cookieLocale;
  }

  return detectLocaleFromAcceptLanguage(input.acceptLanguage ?? null);
}

export function readStoredLocale(): AppLocale | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (!isAppLocale(stored)) {
    return null;
  }

  return stored;
}

export function persistLocale(locale: AppLocale) {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.cookie = `${LOCALE_COOKIE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function applyLocaleToDocument(locale: AppLocale) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.lang = locale;
  document.documentElement.setAttribute("data-locale", locale);
}

export function readDocumentLocale(): AppLocale | null {
  if (typeof document === "undefined") {
    return null;
  }

  const value = document.documentElement.getAttribute("data-locale");
  return isAppLocale(value) ? value : null;
}
