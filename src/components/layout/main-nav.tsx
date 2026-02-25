"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

type MainNavProps = {
  items: NavItem[];
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MainNav({ items }: MainNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Principal" className="min-w-0">
      <ul className="border-border/80 bg-surface-strong/86 flex items-center justify-between gap-1 rounded-xl border p-1 shadow-[inset_0_1px_0_rgb(255_255_255/0.75)]">
        {items.map((item) => {
          const isActive = isActivePath(pathname, item.href);

          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                className={`inline-flex min-h-8 w-full items-center justify-center rounded-lg px-1.5 py-1.5 text-[12px] leading-tight font-semibold transition md:text-[13px] lg:text-sm ${
                  isActive
                    ? "bg-surface text-foreground shadow-[0_10px_18px_-14px_rgb(15_23_42/0.62)]"
                    : "text-muted hover:bg-surface/75 hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
