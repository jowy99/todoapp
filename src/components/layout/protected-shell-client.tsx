"use client";

import Link from "next/link";
import { ReactNode, useMemo } from "react";
import { usePathname } from "next/navigation";
import { Footer } from "@/components/footer/Footer";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { useT } from "@/components/settings/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

type NavItem = {
  href: string;
  label?: string;
  labelKey?: MessageKey;
};

type ProtectedShellClientProps = {
  userLabel: string;
  navItems: readonly NavItem[];
  children: ReactNode;
};

export function ProtectedShellClient({ userLabel, navItems, children }: ProtectedShellClientProps) {
  const pathname = usePathname();
  const t = useT();
  const isCalendarRoute = pathname === "/calendar" || pathname.startsWith("/calendar/");
  const isCollaborationRoute = pathname === "/collaboration" || pathname.startsWith("/collaboration/");
  const isListsRoute = pathname === "/lists" || pathname.startsWith("/lists/");
  const isViewportLockedRoute = isCalendarRoute || isCollaborationRoute || isListsRoute;

  const localizedNavItems = useMemo(
    () =>
      navItems.map((item) => ({
        ...item,
        label:
          item.labelKey
            ? t(item.labelKey)
            : item.href === "/" || item.href === "/tasks"
            ? t("nav.tasks")
            : item.href === "/calendar"
              ? t("nav.calendar")
              : (item.label ?? item.href),
      })),
    [navItems, t],
  );

  const profileNavItems = useMemo(
    () =>
      localizedNavItems.map((item) => ({
        href: item.href,
        label: item.label,
      })),
    [localizedNavItems],
  );

  return (
    <div
      className={`flex w-full flex-col overflow-x-hidden bg-gradient-to-b from-[color:var(--bg)] via-[color:var(--bg)] to-[color:var(--ui-bg-soft)] ${
        isViewportLockedRoute ? "h-[100dvh] overflow-hidden" : "min-h-[100dvh]"
      }`}
    >
      <header className="sticky top-0 z-[96] border-b border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)]/90 backdrop-blur-md">
        <div className="w-full px-3 py-3 sm:px-4 md:px-6 lg:px-6 xl:px-7">
          <div className="mx-auto flex w-full max-w-none items-center gap-3 lg:max-w-[1200px] xl:max-w-[1700px]">
            <Link
              href="/"
              prefetch
              className="inline-flex min-h-11 items-center rounded-xl px-1 text-base font-black tracking-tight text-[color:var(--ui-text-strong)] transition-colors hover:text-[color:var(--ui-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)] sm:px-2"
            >
              {t("app.title")}
            </Link>
            <div className="ml-auto">
              <ProfileMenu userLabel={userLabel} navItems={profileNavItems} />
            </div>
          </div>
        </div>
      </header>

      <main
        className={`w-full max-w-none flex-1 min-h-0 p-3 sm:p-4 md:p-6 lg:mx-auto lg:max-w-[1200px] lg:p-6 xl:max-w-[1700px] xl:p-7 ${
          isViewportLockedRoute ? "overflow-hidden" : ""
        }`}
      >
        <div
          className={`relative rounded-[28px] border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)]/80 shadow-[var(--ui-shadow-lg)] backdrop-blur-xl ${
            isViewportLockedRoute ? "flex h-full min-h-0 flex-col overflow-hidden" : ""
          }`}
        >
          {children}
        </div>
      </main>
      <Footer variant="compact" />
    </div>
  );
}
