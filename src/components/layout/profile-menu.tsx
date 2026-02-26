"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useT } from "@/components/settings/locale-provider";

type ProfileMenuProps = {
  userLabel: string;
  navItems: Array<{
    href: string;
    label: string;
  }>;
};

function initialsFromLabel(label: string) {
  const parts = label.trim().split(/\s+/);
  if (parts.length === 0) {
    return "U";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/" || pathname === "/tasks";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function ListsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path
        d="M4.5 6.5h15M4.5 12h15M4.5 17.5h15"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TasksIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path
        d="M9.5 6.8h9M9.5 12h9M9.5 17.2h9"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <circle cx="5.5" cy="6.8" r="1.4" fill="currentColor" />
      <circle cx="5.5" cy="12" r="1.4" fill="currentColor" />
      <circle cx="5.5" cy="17.2" r="1.4" fill="currentColor" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <rect x="4" y="5.5" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8 3.8v3.4M16 3.8v3.4M4 9.5h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path
        d="M12 3v2.2M12 18.8V21M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M3 12h2.2M18.8 12H21M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <circle cx="12" cy="8.2" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.2 18a6.8 6.8 0 0 1 13.6 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CollaborationIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="2.6" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16.5" cy="9.2" r="2.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4.5 18a4.5 4.5 0 0 1 9 0M12.7 17.9a3.8 3.8 0 0 1 7.3-1.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path
        d="M9 4H5.8A1.8 1.8 0 0 0 4 5.8v12.4A1.8 1.8 0 0 0 5.8 20H9M14 16l4-4m0 0-4-4m4 4H9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`}
      fill="none"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

export function ProfileMenu({ userLabel, navItems }: ProfileMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const buttonLabel = userLabel.trim() || initialsFromLabel(userLabel);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setIsOpen(false);
      router.push("/auth");
      router.refresh();
      setIsLoggingOut(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={t("profile.openMenu")}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="app-profile-trigger border-border/80 bg-surface text-foreground inline-flex h-10 max-w-[38vw] items-center justify-center gap-2 rounded-full border px-2.5 text-sm font-semibold shadow-[0_10px_20px_-18px_rgb(15_23_42/0.9)] transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-surface-strong hover:shadow-[0_14px_24px_-18px_rgb(15_23_42/0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)] active:translate-y-0 active:scale-[0.99] sm:h-10 sm:max-w-[220px] sm:px-3.5"
      >
        <span className="truncate text-[color:var(--ui-text-strong)]">{buttonLabel}</span>
        <span className="text-[color:var(--ui-text-muted)]">
          <ChevronIcon open={isOpen} />
        </span>
      </button>
      {isOpen ? (
        <div className="ui-menu-pop absolute right-0 z-[160] mt-2 max-h-[75vh] w-72 overflow-y-auto rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)]/96 p-2 shadow-[var(--ui-shadow-lg)] backdrop-blur-xl">
          <div className="app-mobile-nav-group">
            <p className="mt-1 px-2 text-[10px] font-semibold tracking-[0.14em] text-[color:var(--ui-text-soft)] uppercase">
              {t("profile.navigation")}
            </p>
            <div className="mt-1 space-y-0.5">
              {navItems.map((item) => {
                const isActive = isActivePath(pathname, item.href);
                const navIcon =
                  item.href === "/" || item.href === "/tasks" ? (
                    <TasksIcon />
                  ) : item.href === "/calendar" ? (
                    <CalendarIcon />
                  ) : null;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch
                    onClick={() => setIsOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)] ${
                      isActive
                        ? "bg-[color:var(--primary)] text-[color:var(--on-primary)] shadow-[var(--ui-shadow-sm)]"
                        : "text-[color:var(--ui-text-muted)] hover:-translate-y-[1px] hover:bg-[color:var(--ui-surface-2)] hover:text-[color:var(--ui-text-strong)]"
                    }`}
                  >
                    {navIcon}
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="my-2 h-px bg-[color:var(--ui-border-soft)]" />
          </div>
          <p className="mt-1 px-2 text-[10px] font-semibold tracking-[0.14em] text-[color:var(--ui-text-soft)] uppercase">
            {t("profile.workspace")}
          </p>
          {(() => {
            const isActive = isActivePath(pathname, "/lists");
            return (
              <Link
                href="/lists"
                prefetch
                onClick={() => setIsOpen(false)}
                aria-current={isActive ? "page" : undefined}
                className={`mt-1 flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)] ${
                  isActive
                    ? "bg-[color:var(--primary)] text-[color:var(--on-primary)] shadow-[var(--ui-shadow-sm)]"
                    : "text-[color:var(--ui-text-muted)] hover:-translate-y-[1px] hover:bg-[color:var(--ui-surface-2)] hover:text-[color:var(--ui-text-strong)]"
                }`}
              >
                <ListsIcon />
                {t("profile.lists")}
              </Link>
            );
          })()}
          {(() => {
            const isActive = isActivePath(pathname, "/collaboration");
            return (
              <Link
                href="/collaboration"
                prefetch={false}
                onClick={() => setIsOpen(false)}
                aria-current={isActive ? "page" : undefined}
                className={`mt-1 flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)] ${
                  isActive
                    ? "bg-[color:var(--primary)] text-[color:var(--on-primary)] shadow-[var(--ui-shadow-sm)]"
                    : "text-[color:var(--ui-text-muted)] hover:-translate-y-[1px] hover:bg-[color:var(--ui-surface-2)] hover:text-[color:var(--ui-text-strong)]"
                }`}
              >
                <CollaborationIcon />
                {t("profile.collaboration")}
              </Link>
            );
          })()}
          <div className="my-2 h-px bg-[color:var(--ui-border-soft)]" />
          <p className="mt-1 px-2 text-[10px] font-semibold tracking-[0.14em] text-[color:var(--ui-text-soft)] uppercase">
            {t("profile.account")}
          </p>
          {(() => {
            const isActive = isActivePath(pathname, "/profile");
            return (
              <Link
                href="/profile"
                prefetch
                onClick={() => setIsOpen(false)}
                aria-current={isActive ? "page" : undefined}
                className={`mt-1 flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)] ${
                  isActive
                    ? "bg-[color:var(--primary)] text-[color:var(--on-primary)] shadow-[var(--ui-shadow-sm)]"
                    : "text-[color:var(--ui-text-muted)] hover:-translate-y-[1px] hover:bg-[color:var(--ui-surface-2)] hover:text-[color:var(--ui-text-strong)]"
                }`}
              >
                <ProfileIcon />
                {t("profile.profile")}
              </Link>
            );
          })()}
          {(() => {
            const isActive = isActivePath(pathname, "/settings");
            return (
              <Link
                href="/settings"
                prefetch
                onClick={() => setIsOpen(false)}
                aria-current={isActive ? "page" : undefined}
                className={`mt-1 flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)] ${
                  isActive
                    ? "bg-[color:var(--primary)] text-[color:var(--on-primary)] shadow-[var(--ui-shadow-sm)]"
                    : "text-[color:var(--ui-text-muted)] hover:-translate-y-[1px] hover:bg-[color:var(--ui-surface-2)] hover:text-[color:var(--ui-text-strong)]"
                }`}
              >
                <SettingsIcon />
                {t("profile.settings")}
              </Link>
            );
          })()}
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-[color:var(--danger)] transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-[color:color-mix(in_srgb,var(--danger)_12%,var(--ui-surface-1))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)] disabled:opacity-60"
          >
            <LogoutIcon />
            {isLoggingOut ? t("profile.signingOut") : t("profile.signOut")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
