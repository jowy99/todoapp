import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { getServerI18n } from "@/lib/i18n/server";
import { buildLegalMetadata } from "@/lib/legal/metadata";

export async function generateMetadata() {
  return buildLegalMetadata("legal.cookies.metaTitle", "legal.cookies.metaDescription", "/legal/cookies");
}

export default async function CookiesPolicyPage() {
  const { t } = await getServerI18n();

  const sections = [
    {
      id: "definition",
      title: t("legal.cookies.section.definition.title"),
      paragraphs: [t("legal.cookies.section.definition.body")],
    },
    {
      id: "types",
      title: t("legal.cookies.section.types.title"),
      paragraphs: [t("legal.cookies.section.types.body")],
      bullets: [
        t("legal.cookies.section.types.item1"),
        t("legal.cookies.section.types.item2"),
        t("legal.cookies.section.types.item3"),
        t("legal.cookies.section.types.item4"),
      ],
    },
    {
      id: "inventory",
      title: t("legal.cookies.section.inventory.title"),
      paragraphs: [t("legal.cookies.section.inventory.body")],
      bullets: [
        t("legal.cookies.section.inventory.item1"),
        t("legal.cookies.section.inventory.item2"),
        t("legal.cookies.section.inventory.item3"),
      ],
    },
    {
      id: "consent",
      title: t("legal.cookies.section.consent.title"),
      paragraphs: [t("legal.cookies.section.consent.body")],
    },
    {
      id: "disable",
      title: t("legal.cookies.section.disable.title"),
      paragraphs: [t("legal.cookies.section.disable.body")],
      bullets: [
        t("legal.cookies.section.disable.item1"),
        t("legal.cookies.section.disable.item2"),
        t("legal.cookies.section.disable.item3"),
        t("legal.cookies.section.disable.item4"),
      ],
    },
    {
      id: "updates",
      title: t("legal.cookies.section.updates.title"),
      paragraphs: [t("legal.cookies.section.updates.body")],
    },
  ];

  return (
    <LegalPageShell
      kicker={t("legal.kicker")}
      title={t("legal.cookies.title")}
      intro={t("legal.cookies.intro")}
      updatedLabel={t("legal.updated")}
      updatedValue={t("legal.locationDate")}
      sections={sections}
      disclaimerTitle={t("legal.disclaimer.title")}
      disclaimerBody={t("legal.disclaimer.body")}
      backLabel={t("legal.backToCenter")}
    />
  );
}
