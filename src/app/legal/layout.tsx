import Link from "next/link";
import { Footer } from "@/components/footer/Footer";
import { getServerI18n } from "@/lib/i18n/server";

export default async function LegalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { t } = await getServerI18n();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-[color:var(--bg)] via-[color:var(--bg)] to-[color:var(--ui-bg-soft)]">
      <header className="sticky top-0 z-40 border-b border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)]/90 backdrop-blur-md">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-3 sm:px-6">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <Link
              href="/"
              prefetch
              className="inline-flex items-center rounded-xl px-1 text-base font-black tracking-tight text-[color:var(--ui-text-strong)] transition-colors hover:text-[color:var(--ui-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)]"
            >
              {t("app.title")}
            </Link>
            <p className="text-xs font-semibold tracking-[0.1em] text-[color:var(--ui-text-soft)] uppercase">
              {t("legal.kicker")}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-4 py-5 sm:px-6 sm:py-7">
        {children}
      </main>
      <Footer variant="full" />
    </div>
  );
}
