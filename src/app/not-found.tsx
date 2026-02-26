import Link from "next/link";
import { getServerI18n } from "@/lib/i18n/server";

export default async function NotFoundPage() {
  const { t } = await getServerI18n();

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4 py-8">
      <section className="ui-card w-full max-w-lg space-y-4 p-5 sm:p-6">
        <p className="ui-kicker ui-kicker--muted">404</p>
        <h1 className="ui-title-lg">{t("notFound.title")}</h1>
        <p className="ui-subtle">
          {t("notFound.description")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/" prefetch className="ui-btn ui-btn--primary">
            {t("notFound.goTasks")}
          </Link>
          <Link href="/auth" prefetch={false} className="ui-btn ui-btn--secondary">
            {t("notFound.goSignIn")}
          </Link>
        </div>
      </section>
    </main>
  );
}
