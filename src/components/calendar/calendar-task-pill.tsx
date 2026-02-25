import Link from "next/link";

type CalendarTaskPillProps = {
  href: string;
  title: string;
  toneClass: string;
  timeLabel?: string;
  compact?: boolean;
  className?: string;
};

export function CalendarTaskPill({
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
      className={`group flex min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-black/10 leading-tight shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-sm ${
        compact ? "px-2 py-1 text-[11px]" : "px-2 py-1 text-[12px]"
      } ${toneClass} ${className}`}
    >
      <span className="min-w-0 flex-1 truncate font-medium text-black/80">{title}</span>
      {timeLabel ? <span className="shrink-0 tabular-nums text-black/60">{timeLabel}</span> : null}
    </Link>
  );
}
