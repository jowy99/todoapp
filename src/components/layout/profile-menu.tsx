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
        className="app-profile-trigger border-border/80 bg-surface text-foreground hover:bg-surface-strong inline-flex h-10 max-w-[38vw] items-center justify-center gap-2 rounded-full border px-2.5 text-sm font-semibold transition sm:h-10 sm:max-w-[220px] sm:px-3.5"
      >
        <span className="truncate text-slate-700">{buttonLabel}</span>
        <span className="text-slate-500">
          <ChevronIcon open={isOpen} />
        </span>
      </button>
      {isOpen ? (
        <div className="border-border/90 bg-surface absolute right-0 z-[100] mt-2 max-h-[75vh] w-64 overflow-y-auto rounded-2xl border p-2 shadow-[0_18px_28px_-20px_rgb(15_23_42/0.85)]">
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
                    className={`block rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-700 hover:bg-slate-100/80"
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
            className="hover:bg-surface-strong mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition"
          >
            <UserIcon />
            Perfil
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            className="hover:bg-surface-strong mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition disabled:opacity-60"
          >
            {isLoggingOut ? "Saliendo..." : "Cerrar sesión"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
