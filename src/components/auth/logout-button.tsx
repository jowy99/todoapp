"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      router.push("/auth");
      router.refresh();
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className="border-border/80 bg-surface text-foreground hover:bg-surface-strong inline-flex min-h-10 items-center rounded-full border px-3 py-2 text-xs font-semibold transition disabled:opacity-60 sm:px-3.5 sm:text-sm"
    >
      <span className="sm:hidden">{isLoading ? "..." : "Salir"}</span>
      <span className="hidden sm:inline">{isLoading ? "Saliendo..." : "Cerrar sesión"}</span>
    </button>
  );
}
