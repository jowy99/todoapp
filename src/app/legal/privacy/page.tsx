import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { getServerI18n } from "@/lib/i18n/server";
import { buildLegalMetadata } from "@/lib/legal/metadata";

export async function generateMetadata() {
  return buildLegalMetadata("legal.privacy.metaTitle", "legal.privacy.metaDescription", "/legal/privacy");
}

export default async function PrivacyPolicyPage() {
  const { t } = await getServerI18n();

  const sections = [
    {
      id: "controller",
      title: t("legal.privacy.section.controller.title"),
      paragraphs: [t("legal.privacy.section.controller.body")],
      bullets: [
        t("legal.privacy.section.controller.item1"),
        t("legal.privacy.section.controller.item2"),
        t("legal.privacy.section.controller.item3"),
        t("legal.privacy.section.controller.item4"),
      ],
    },
    {
      id: "data",
      title: t("legal.privacy.section.data.title"),
      paragraphs: [t("legal.privacy.section.data.body")],
      bullets: [
        t("legal.privacy.section.data.item1"),
        t("legal.privacy.section.data.item2"),
        t("legal.privacy.section.data.item3"),
      ],
    },
    {
      id: "purposes",
      title: t("legal.privacy.section.purposes.title"),
      paragraphs: [t("legal.privacy.section.purposes.body")],
      bullets: [
        t("legal.privacy.section.purposes.item1"),
        t("legal.privacy.section.purposes.item2"),
        t("legal.privacy.section.purposes.item3"),
        t("legal.privacy.section.purposes.item4"),
      ],
    },
    {
      id: "basis",
      title: t("legal.privacy.section.legalBasis.title"),
      paragraphs: [t("legal.privacy.section.legalBasis.body")],
      bullets: [
        t("legal.privacy.section.legalBasis.item1"),
        t("legal.privacy.section.legalBasis.item2"),
        t("legal.privacy.section.legalBasis.item3"),
      ],
    },
    {
      id: "retention",
      title: t("legal.privacy.section.retention.title"),
      paragraphs: [t("legal.privacy.section.retention.body")],
    },
    {
      id: "recipients",
      title: t("legal.privacy.section.recipients.title"),
      paragraphs: [t("legal.privacy.section.recipients.body")],
      bullets: [
        t("legal.privacy.section.recipients.item1"),
        t("legal.privacy.section.recipients.item2"),
      ],
    },
    {
      id: "transfers",
      title: t("legal.privacy.section.transfers.title"),
      paragraphs: [t("legal.privacy.section.transfers.body")],
    },
    {
      id: "rights",
      title: t("legal.privacy.section.rights.title"),
      paragraphs: [t("legal.privacy.section.rights.body")],
      bullets: [
        t("legal.privacy.section.rights.item1"),
        t("legal.privacy.section.rights.item2"),
        t("legal.privacy.section.rights.item3"),
      ],
    },
    {
      id: "aepd",
      title: t("legal.privacy.section.aepd.title"),
      paragraphs: [t("legal.privacy.section.aepd.body")],
    },
    {
      id: "security",
      title: t("legal.privacy.section.security.title"),
      paragraphs: [t("legal.privacy.section.security.body")],
    },
    {
      id: "minors",
      title: t("legal.privacy.section.minors.title"),
      paragraphs: [t("legal.privacy.section.minors.body")],
    },
    {
      id: "changes",
      title: t("legal.privacy.section.changes.title"),
      paragraphs: [t("legal.privacy.section.changes.body")],
    },
  ];

  return (
    <LegalPageShell
      kicker={t("legal.kicker")}
      title={t("legal.privacy.title")}
      intro={t("legal.privacy.intro")}
      updatedLabel={t("legal.updated")}
      updatedValue={t("legal.locationDate")}
      sections={sections}
      disclaimerTitle={t("legal.disclaimer.title")}
      disclaimerBody={t("legal.disclaimer.body")}
      backLabel={t("legal.backToCenter")}
    />
  );
}
