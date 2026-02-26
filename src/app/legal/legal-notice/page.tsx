import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { getServerI18n } from "@/lib/i18n/server";
import { buildLegalMetadata } from "@/lib/legal/metadata";

export async function generateMetadata() {
  return buildLegalMetadata(
    "legal.legalNotice.metaTitle",
    "legal.legalNotice.metaDescription",
    "/legal/legal-notice",
  );
}

export default async function LegalNoticePage() {
  const { t } = await getServerI18n();

  const sections = [
    {
      id: "identification",
      title: t("legal.legalNotice.section.identification.title"),
      paragraphs: [t("legal.legalNotice.section.identification.body")],
      bullets: [
        t("legal.legalNotice.section.identification.item1"),
        t("legal.legalNotice.section.identification.item2"),
        t("legal.legalNotice.section.identification.item3"),
        t("legal.legalNotice.section.identification.item4"),
      ],
    },
    {
      id: "useConditions",
      title: t("legal.legalNotice.section.useConditions.title"),
      paragraphs: [t("legal.legalNotice.section.useConditions.body")],
    },
    {
      id: "ip",
      title: t("legal.legalNotice.section.ip.title"),
      paragraphs: [t("legal.legalNotice.section.ip.body")],
    },
    {
      id: "liability",
      title: t("legal.legalNotice.section.liability.title"),
      paragraphs: [t("legal.legalNotice.section.liability.body")],
    },
    {
      id: "commercial",
      title: t("legal.legalNotice.section.commercial.title"),
      paragraphs: [t("legal.legalNotice.section.commercial.body")],
    },
    {
      id: "jurisdiction",
      title: t("legal.legalNotice.section.jurisdiction.title"),
      paragraphs: [t("legal.legalNotice.section.jurisdiction.body")],
    },
    {
      id: "contact",
      title: t("legal.legalNotice.section.contact.title"),
      paragraphs: [t("legal.legalNotice.section.contact.body")],
      bullets: [
        t("legal.legalNotice.section.contact.item1"),
        t("legal.legalNotice.section.contact.item2"),
      ],
    },
  ];

  const todoItems = [
    t("legal.legalNotice.todo.item1"),
    t("legal.legalNotice.todo.item2"),
    t("legal.legalNotice.todo.item3"),
    t("legal.legalNotice.todo.item4"),
    t("legal.legalNotice.todo.item5"),
    t("legal.legalNotice.todo.item6"),
    t("legal.legalNotice.todo.item7"),
    t("legal.legalNotice.todo.item8"),
  ];

  return (
    <LegalPageShell
      kicker={t("legal.kicker")}
      title={t("legal.legalNotice.title")}
      intro={t("legal.legalNotice.intro")}
      updatedLabel={t("legal.updated")}
      updatedValue={t("legal.locationDate")}
      sections={sections}
      disclaimerTitle={t("legal.disclaimer.title")}
      disclaimerBody={t("legal.disclaimer.body")}
      backLabel={t("legal.backToCenter")}
    >
      <section className="mt-6 rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] p-4">
        <h2 className="text-base font-bold text-[color:var(--ui-text-strong)]">{t("legal.legalNotice.todo.title")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--ui-text-muted)]">
          {t("legal.legalNotice.todo.description")}
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-[color:var(--ui-text-muted)]">
          {todoItems.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ul>
      </section>
    </LegalPageShell>
  );
}
