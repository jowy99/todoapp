"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useT } from "@/components/settings/locale-provider";

type FooterVariant = "compact" | "full";

type FooterProps = {
  variant?: FooterVariant;
  className?: string;
};

export function Footer({ variant = "full", className = "" }: FooterProps) {
  const t = useT();
  const year = new Date().getFullYear();

  const legalLinks = useMemo(
    () => [
      { href: "/legal/privacy", label: t("footer.privacy") },
      { href: "/legal/cookies", label: t("footer.cookies") },
      { href: "/legal/terms", label: t("footer.terms") },
      { href: "/legal/legal-notice", label: t("footer.legalNotice") },
    ],
    [t],
  );

  if (variant === "compact") {
    return (
      <footer
        className={`shrink-0 border-t border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)]/85 px-3 py-2.5 backdrop-blur sm:px-4 md:px-6 lg:px-6 xl:px-7 ${className}`}
      >
        <div className="mx-auto flex w-full max-w-none flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-[color:var(--ui-text-soft)] lg:max-w-[1200px] xl:max-w-[1700px]">
          <p>
            © {year} {t("app.title")} · {t("footer.rights")}
          </p>
          <nav aria-label={t("footer.linksAria")} className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {legalLinks.map((link, index) => (
              <span key={link.href} className="inline-flex items-center gap-2">
                <Link
                  href={link.href}
                  prefetch
                  className="rounded-sm text-[color:var(--ui-text-muted)] underline-offset-2 transition-colors hover:text-[color:var(--ui-text-strong)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)]"
                >
                  {link.label}
                </Link>
                {index < legalLinks.length - 1 ? <span aria-hidden>·</span> : null}
              </span>
            ))}
          </nav>
        </div>
      </footer>
    );
  }

  return (
    <footer
      className={`border-t border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)]/90 px-4 py-5 backdrop-blur sm:px-6 sm:py-6 ${className}`}
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 text-sm text-[color:var(--ui-text-muted)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium text-[color:var(--ui-text-soft)]">
            © {year} {t("app.title")} · {t("footer.rights")}
          </p>
          <Link
            href="/legal"
            prefetch
            className="text-xs font-semibold tracking-[0.08em] text-[color:var(--ui-text-soft)] uppercase underline-offset-4 transition-colors hover:text-[color:var(--ui-text-strong)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)]"
          >
            {t("footer.legalCenter")}
          </Link>
        </div>
        <nav
          aria-label={t("footer.linksAria")}
          className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm"
        >
          {legalLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch
              className="rounded-sm underline-offset-2 transition-colors hover:text-[color:var(--ui-text-strong)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)]"
            >
              {link.label}
            </Link>
          ))}
          <a
            href="mailto:[EMAIL_CONTACTO]"
            className="rounded-sm underline-offset-2 transition-colors hover:text-[color:var(--ui-text-strong)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)]"
          >
            {t("footer.contact")}
          </a>
        </nav>
      </div>
    </footer>
  );
}
