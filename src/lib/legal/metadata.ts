import type { Metadata } from "next";
import type { MessageKey } from "@/lib/i18n/messages";
import { getServerI18n } from "@/lib/i18n/server";

export async function buildLegalMetadata(
  titleKey: MessageKey,
  descriptionKey: MessageKey,
  canonicalPath: string,
): Promise<Metadata> {
  const { t } = await getServerI18n();
  const appTitle = t("app.title");
  const title = `${t(titleKey)} · ${appTitle}`;

  return {
    title,
    description: t(descriptionKey),
    alternates: {
      canonical: canonicalPath,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      description: t(descriptionKey),
      url: canonicalPath,
      type: "article",
      siteName: appTitle,
    },
    twitter: {
      card: "summary",
      title,
      description: t(descriptionKey),
    },
  };
}
