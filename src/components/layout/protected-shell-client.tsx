"use client";

import Link from "next/link";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
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

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/" || pathname === "/tasks";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path
        d="M5 7h14M5 12h14M5 17h14"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path
        d="m7 7 10 10M17 7 7 17"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ProtectedShellClient({ userLabel, navItems, children }: ProtectedShellClientProps) {
  const pathname = usePathname();
  const t = useT();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
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

  useEffect(() => {
    if (!isMobileDrawerOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileDrawerOpen]);

  return (
    <div
      className={`flex w-full flex-col overflow-x-hidden bg-gradient-to-b from-[color:var(--bg)] via-[color:var(--bg)] to-[color:var(--ui-bg-soft)] ${
        isViewportLockedRoute ? "h-[100dvh] overflow-hidden" : "min-h-[100dvh]"
      }`}
    >
      <div className="sticky top-0 z-[96] border-b border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)]/90 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-2 px-3 py-3 sm:px-4">
          <button
            type="button"
            aria-label={isMobileDrawerOpen ? t("shell.closeNavigation") : t("shell.openNavigation")}
            aria-expanded={isMobileDrawerOpen}
            onClick={() => setIsMobileDrawerOpen((prev) => !prev)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] text-[color:var(--ui-text-muted)] transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-[color:var(--ui-surface-3)] hover:text-[color:var(--ui-text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)] active:translate-y-0 active:scale-[0.99]"
          >
            {isMobileDrawerOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
          <Link
            href="/"
            prefetch
            className="inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-black tracking-tight text-[color:var(--ui-text-strong)] transition-colors hover:text-[color:var(--ui-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)]"
          >
            {t("app.title")}
          </Link>
          <div className="ml-auto">
            <ProfileMenu userLabel={userLabel} navItems={profileNavItems} />
          </div>
        </div>
      </div>

      <div className="fixed right-3 top-3 z-[95] hidden md:block lg:right-4 lg:top-4">
        <ProfileMenu userLabel={userLabel} navItems={profileNavItems} />
      </div>

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

      <div
        className={`fixed inset-0 z-[110] md:hidden ${isMobileDrawerOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!isMobileDrawerOpen}
      >
        <button
          type="button"
          aria-label={t("shell.closeNavigation")}
          onClick={() => setIsMobileDrawerOpen(false)}
          className={`absolute inset-0 bg-[color:var(--ui-overlay-backdrop-soft)] backdrop-blur-[2px] transition-opacity duration-200 ease-out ${
            isMobileDrawerOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={t("shell.mainNavigation")}
          className={`absolute inset-y-0 left-0 w-[min(82vw,320px)] border-r border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)]/95 shadow-[var(--ui-shadow-lg)] backdrop-blur-sm transition-transform duration-200 ease-out ${
            isMobileDrawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-full min-h-0 flex-col px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))]">
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-xs font-semibold tracking-[0.12em] text-[color:var(--ui-text-muted)] uppercase">{t("shell.navigate")}</p>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                aria-label={t("shell.closeNavigation")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] text-[color:var(--ui-text-muted)] transition-colors hover:bg-[color:var(--ui-surface-3)] hover:text-[color:var(--ui-text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)]"
              >
                <CloseIcon />
              </button>
            </div>
            <nav aria-label={t("shell.mainNavigation")} className="space-y-1">
              {localizedNavItems.map((item) => {
                const isActive = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch
                    onClick={() => setIsMobileDrawerOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)] ${
                      isActive
                        ? "bg-[color:var(--primary)] text-[color:var(--on-primary)] shadow-[var(--ui-shadow-sm)]"
                        : "text-[color:var(--ui-text-muted)] hover:-translate-y-[1px] hover:bg-[color:var(--ui-surface-2)] hover:text-[color:var(--ui-text-strong)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>
      </div>
    </div>
  );
}
