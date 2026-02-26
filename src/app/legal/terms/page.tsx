import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { getServerI18n } from "@/lib/i18n/server";
import { buildLegalMetadata } from "@/lib/legal/metadata";

export async function generateMetadata() {
  return buildLegalMetadata("legal.terms.metaTitle", "legal.terms.metaDescription", "/legal/terms");
}

export default async function TermsPage() {
  const { t } = await getServerI18n();

  const sections = [
    {
      id: "scope",
      title: t("legal.terms.section.scope.title"),
      paragraphs: [t("legal.terms.section.scope.body")],
    },
    {
      id: "account",
      title: t("legal.terms.section.account.title"),
      paragraphs: [t("legal.terms.section.account.body")],
      bullets: [
        t("legal.terms.section.account.item1"),
        t("legal.terms.section.account.item2"),
        t("legal.terms.section.account.item3"),
      ],
    },
    {
      id: "usage",
      title: t("legal.terms.section.usage.title"),
      paragraphs: [t("legal.terms.section.usage.body")],
      bullets: [
        t("legal.terms.section.usage.item1"),
        t("legal.terms.section.usage.item2"),
        t("legal.terms.section.usage.item3"),
      ],
    },
    {
      id: "ip",
      title: t("legal.terms.section.ip.title"),
      paragraphs: [t("legal.terms.section.ip.body")],
    },
    {
      id: "availability",
      title: t("legal.terms.section.availability.title"),
      paragraphs: [t("legal.terms.section.availability.body")],
    },
    {
      id: "links",
      title: t("legal.terms.section.links.title"),
      paragraphs: [t("legal.terms.section.links.body")],
    },
    {
      id: "liability",
      title: t("legal.terms.section.liability.title"),
      paragraphs: [t("legal.terms.section.liability.body")],
    },
    {
      id: "termination",
      title: t("legal.terms.section.termination.title"),
      paragraphs: [t("legal.terms.section.termination.body")],
    },
    {
      id: "law",
      title: t("legal.terms.section.law.title"),
      paragraphs: [t("legal.terms.section.law.body")],
    },
  ];

  return (
    <LegalPageShell
      kicker={t("legal.kicker")}
      title={t("legal.terms.title")}
      intro={t("legal.terms.intro")}
      updatedLabel={t("legal.updated")}
      updatedValue={t("legal.locationDate")}
      sections={sections}
      disclaimerTitle={t("legal.disclaimer.title")}
      disclaimerBody={t("legal.disclaimer.body")}
      backLabel={t("legal.backToCenter")}
    />
  );
}
