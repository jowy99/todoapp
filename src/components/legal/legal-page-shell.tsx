import Link from "next/link";

type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

type LegalPageShellProps = {
  kicker: string;
  title: string;
  intro: string;
  updatedLabel: string;
  updatedValue: string;
  sections: LegalSection[];
  disclaimerTitle: string;
  disclaimerBody: string;
  backLabel: string;
  children?: React.ReactNode;
};

export function LegalPageShell({
  kicker,
  title,
  intro,
  updatedLabel,
  updatedValue,
  sections,
  disclaimerTitle,
  disclaimerBody,
  backLabel,
  children,
}: LegalPageShellProps) {
  return (
    <article className="ui-card ui-card--hero overflow-hidden p-5 sm:p-7">
      <header className="border-b border-[color:var(--ui-border-soft)] pb-5">
        <p className="ui-kicker">{kicker}</p>
        <h1 className="ui-title-xl mt-2">{title}</h1>
        <p className="ui-subtle mt-2 max-w-3xl">{intro}</p>
        <p className="mt-3 text-xs font-semibold tracking-[0.06em] text-[color:var(--ui-text-soft)] uppercase">
          {updatedLabel}: {updatedValue}
        </p>
      </header>

      <div className="mt-5 space-y-5">
        {sections.map((section) => (
          <section key={section.id} className="space-y-2">
            <h2 className="text-base font-bold text-[color:var(--ui-text-strong)] sm:text-lg">
              {section.title}
            </h2>
            {section.paragraphs.map((paragraph, index) => (
              <p key={`${section.id}-paragraph-${index}`} className="text-sm leading-relaxed text-[color:var(--ui-text-muted)]">
                {paragraph}
              </p>
            ))}
            {section.bullets?.length ? (
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-[color:var(--ui-text-muted)]">
                {section.bullets.map((bullet, index) => (
                  <li key={`${section.id}-bullet-${index}`}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      {children}

      <section className="mt-6 rounded-2xl border border-amber-300/40 bg-amber-100/60 p-4 text-sm text-amber-900 dark:border-amber-300/30 dark:bg-amber-300/10 dark:text-amber-100">
        <p className="font-semibold">{disclaimerTitle}</p>
        <p className="mt-1 leading-relaxed">{disclaimerBody}</p>
      </section>

      <div className="mt-5">
        <Link
          href="/legal"
          prefetch
          className="ui-btn ui-btn--secondary inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-semibold"
        >
          {backLabel}
        </Link>
      </div>
    </article>
  );
}
