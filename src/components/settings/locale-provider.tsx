"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getMessage, type MessageKey, type MessageValues } from "@/lib/i18n/messages";
import {
  applyLocaleToDocument,
  type AppLocale,
  persistLocale,
  readDocumentLocale,
} from "@/lib/preferences/locale";

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: MessageKey, values?: MessageValues) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

type LocaleProviderProps = {
  initialLocale: AppLocale;
  children: ReactNode;
};

export function LocaleProvider({ initialLocale, children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<AppLocale>(() => readDocumentLocale() ?? initialLocale);

  const setLocale = useCallback((nextLocale: AppLocale) => {
    setLocaleState(nextLocale);
    applyLocaleToDocument(nextLocale);
    persistLocale(nextLocale);
  }, []);

  useEffect(() => {
    applyLocaleToDocument(locale);
    persistLocale(locale);
  }, [locale]);

  const t = useCallback((key: MessageKey, values?: MessageValues) => getMessage(locale, key, values), [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocalePreference() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocalePreference must be used within LocaleProvider.");
  }

  return context;
}

export function useT() {
  return useLocalePreference().t;
}
