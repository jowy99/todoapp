import Link from "next/link";
import { buildLegalMetadata } from "@/lib/legal/metadata";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  return buildLegalMetadata("legal.center.metaTitle", "legal.center.metaDescription", "/legal");
}

export default async function LegalCenterPage() {
  const { t } = await getServerI18n();

  const links = [
    {
      href: "/legal/privacy",
      title: t("legal.center.privacy.title"),
      description: t("legal.center.privacy.description"),
    },
    {
      href: "/legal/cookies",
      title: t("legal.center.cookies.title"),
      description: t("legal.center.cookies.description"),
    },
    {
      href: "/legal/terms",
      title: t("legal.center.terms.title"),
      description: t("legal.center.terms.description"),
    },
    {
      href: "/legal/legal-notice",
      title: t("legal.center.legalNotice.title"),
      description: t("legal.center.legalNotice.description"),
    },
  ];

  const todoItems = [
    t("legal.todo.companyName"),
    t("legal.todo.taxId"),
    t("legal.todo.address"),
    t("legal.todo.email"),
    t("legal.todo.dpo"),
    t("legal.todo.providers"),
    t("legal.todo.cookies"),
    t("legal.todo.review"),
  ];

  return (
    <section className="space-y-5">
      <article className="ui-card ui-card--hero p-5 sm:p-7">
        <p className="ui-kicker">{t("legal.kicker")}</p>
        <h1 className="ui-title-xl mt-2">{t("legal.center.title")}</h1>
        <p className="ui-subtle mt-2 max-w-3xl">{t("legal.center.subtitle")}</p>
        <p className="mt-3 text-xs font-semibold tracking-[0.06em] text-[color:var(--ui-text-soft)] uppercase">
          {t("legal.updated")}: {t("legal.locationDate")}
        </p>
      </article>

      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            prefetch
            className="ui-card group rounded-2xl p-5 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-[var(--ui-shadow-md)]"
          >
            <p className="text-base font-bold text-[color:var(--ui-text-strong)]">{link.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-[color:var(--ui-text-muted)]">{link.description}</p>
            <p className="mt-3 text-xs font-semibold text-[color:var(--ui-text-soft)]">{t("legal.openDocument")}</p>
          </Link>
        ))}
      </div>

      <article className="ui-card rounded-2xl p-5">
        <h2 className="text-base font-bold text-[color:var(--ui-text-strong)]">{t("legal.todo.title")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--ui-text-muted)]">{t("legal.todo.description")}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-[color:var(--ui-text-muted)]">
          {todoItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}
