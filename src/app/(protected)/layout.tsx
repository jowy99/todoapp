import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { MainNav } from "@/components/layout/main-nav";
import { getCurrentUser } from "@/lib/auth/session";

const navItems = [
  { href: "/", label: "Tareas" },
  { href: "/calendar", label: "Calendario" },
  { href: "/lists", label: "Listas" },
  { href: "/collaboration", label: "Colaboración" },
  { href: "/integrations", label: "Integraciones" },
  { href: "/profile", label: "Perfil" },
];

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
    <div className="min-h-screen pb-6">
      <header className="border-border/80 bg-surface/85 sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-5">
            <Link
              href="/"
              className="bg-surface text-primary-strong border-border/80 inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-black tracking-tight shadow-[0_10px_24px_-16px_rgb(15_23_42/0.7)]"
            >
              <span
                aria-hidden
                className="from-primary to-accent inline-block h-2.5 w-2.5 rounded-full bg-gradient-to-r"
              />
              Todo Studio
            </Link>
            <MainNav items={navItems} />
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <p className="bg-surface-strong text-muted hidden rounded-full px-3 py-2 text-xs font-semibold sm:block">
              {userLabel}
            </p>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6">{children}</main>
    </div>
  );
}
