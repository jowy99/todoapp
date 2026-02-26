import Link from "next/link";
import { memo } from "react";

type CalendarTaskPillProps = {
  href: string;
  title: string;
  toneClass: string;
  timeLabel?: string;
  compact?: boolean;
  className?: string;
};

export const CalendarTaskPill = memo(function CalendarTaskPill({
  href,
  title,
  toneClass,
  timeLabel,
  compact = false,
  className = "",
}: CalendarTaskPillProps) {
  return (
    <Link
      href={href}
      className={`group flex min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-[color:var(--ui-border-soft)] leading-tight shadow-[var(--ui-shadow-xs)] transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-[var(--ui-shadow-sm)] ${
        compact ? "px-2 py-1 text-[11px]" : "px-2 py-1 text-[12px]"
      } ${toneClass} ${className}`}
    >
      <span className="min-w-0 flex-1 truncate font-medium text-[color:var(--ui-text-strong)]">{title}</span>
      {timeLabel ? <span className="shrink-0 tabular-nums text-[color:var(--ui-text-muted)]">{timeLabel}</span> : null}
    </Link>
  );
});
