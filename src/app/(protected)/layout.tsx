import { redirect } from "next/navigation";
import { ProtectedShellClient } from "@/components/layout/protected-shell-client";
import type { MessageKey } from "@/lib/i18n/messages";
import { getCurrentUser } from "@/lib/auth/session";

const navItems = [
  { href: "/", labelKey: "nav.tasks" },
  { href: "/calendar", labelKey: "nav.calendar" },
] as const satisfies ReadonlyArray<{ href: string; labelKey: MessageKey }>;

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  const userLabel = user.displayName?.trim() || user.email;

  return (
    <ProtectedShellClient userLabel={userLabel} navItems={navItems}>
      {children}
    </ProtectedShellClient>
  );
}
