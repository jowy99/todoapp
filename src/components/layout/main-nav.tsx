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
    <nav aria-label="Principal" className="min-w-0 flex-1">
      <ul className="scrollbar-thin border-border/80 bg-surface-strong/80 flex items-center gap-1 overflow-x-auto rounded-full border p-1 backdrop-blur">
        {items.map((item) => {
          const isActive = isActivePath(pathname, item.href);

          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                className={`inline-flex items-center rounded-full px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-surface text-foreground shadow-[0_6px_16px_-10px_rgb(15_23_42/0.7)]"
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
