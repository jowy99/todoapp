import { cookies, headers } from "next/headers";
import { getMessage, type MessageKey, type MessageValues } from "@/lib/i18n/messages";
import {
  LOCALE_COOKIE_KEY,
  localeToLanguageTag,
  resolveInitialLocale,
  type AppLocale,
} from "@/lib/preferences/locale";

export async function resolveRequestLocale(): Promise<AppLocale> {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  return resolveInitialLocale({
    cookieLocale: cookieStore.get(LOCALE_COOKIE_KEY)?.value,
    acceptLanguage: requestHeaders.get("accept-language"),
  });
}

export async function getServerI18n() {
  const locale = await resolveRequestLocale();
  const localeTag = localeToLanguageTag(locale);
  const t = (key: MessageKey, values?: MessageValues) => getMessage(locale, key, values);
  return { locale, localeTag, t };
}

