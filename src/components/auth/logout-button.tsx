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
      className="border-border/80 bg-surface text-foreground hover:bg-surface-strong inline-flex items-center rounded-full border px-3.5 py-2 text-sm font-semibold transition disabled:opacity-60"
    >
      {isLoading ? "Saliendo..." : "Cerrar sesión"}
    </button>
  );
}
