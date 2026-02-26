"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/settings/locale-provider";

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
  const t = useT();

  return (
    <nav aria-label={t("nav.primary")} className="min-w-0">
      <ul className="ui-nav-shell flex items-center justify-between gap-1 p-1">
        {items.map((item) => {
          const isActive = isActivePath(pathname, item.href);

          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                data-active={isActive ? "true" : "false"}
                className="ui-nav-link text-center text-[12px] md:text-[13px] lg:text-sm"
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
