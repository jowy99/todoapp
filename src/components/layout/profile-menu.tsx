"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

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
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 19a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.8" />
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
        aria-label="Abrir menú de perfil"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="app-profile-trigger border-border/80 bg-surface text-foreground inline-flex h-10 max-w-[38vw] items-center justify-center gap-2 rounded-full border px-2.5 text-sm font-semibold shadow-[0_10px_20px_-18px_rgb(15_23_42/0.9)] transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-surface-strong hover:shadow-[0_14px_24px_-18px_rgb(15_23_42/0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 active:translate-y-0 active:scale-[0.99] sm:h-10 sm:max-w-[220px] sm:px-3.5"
      >
        <span className="truncate text-slate-700">{buttonLabel}</span>
        <span className="text-slate-500">
          <ChevronIcon open={isOpen} />
        </span>
      </button>
      {isOpen ? (
        <div className="ui-menu-pop border-border/90 bg-surface absolute right-0 z-[100] mt-2 max-h-[75vh] w-64 overflow-y-auto rounded-2xl border p-2 shadow-[0_24px_36px_-28px_rgb(15_23_42/0.9)]">
          <p className="text-muted truncate px-2 py-1 text-xs font-semibold">{userLabel}</p>
          <div className="app-mobile-nav-group md:hidden">
            <p className="mt-1 px-2 text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
              Navegación
            </p>
            <div className="mt-1 space-y-0.5">
              {navItems.map((item) => {
                const isActive = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`block min-h-11 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${
                      isActive
                        ? "bg-slate-100 text-slate-900 shadow-[0_8px_14px_-12px_rgb(15_23_42/0.65)]"
                        : "text-slate-700 hover:-translate-y-[1px] hover:bg-slate-100/80 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="my-2 border-t border-slate-200" />
          </div>
          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="hover:bg-surface-strong mt-1 flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
          >
            <SettingsIcon />
            Settings
          </Link>
          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="hover:bg-surface-strong mt-1 flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
          >
            <UserIcon />
            Perfil
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:opacity-60"
          >
            <LogoutIcon />
            {isLoggingOut ? "Saliendo..." : "Cerrar sesión"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
