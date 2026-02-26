"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/settings/locale-provider";

export function LogoutButton() {
  const router = useRouter();
  const t = useT();
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
      <span className="sm:hidden">{isLoading ? "..." : t("profile.signOut")}</span>
      <span className="hidden sm:inline">{isLoading ? t("profile.signingOut") : t("profile.signOut")}</span>
    </button>
  );
}
