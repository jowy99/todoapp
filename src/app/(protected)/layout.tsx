import Link from "next/link";
import { redirect } from "next/navigation";
import { MainNav } from "@/components/layout/main-nav";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { getCurrentUser } from "@/lib/auth/session";

const navItems = [
  { href: "/", label: "Tareas" },
  { href: "/calendar", label: "Calendario" },
  { href: "/lists", label: "Listas" },
  { href: "/collaboration", label: "Colaboración" },
  { href: "/integrations", label: "Integraciones" },
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
    <div className="min-h-[100dvh] w-full overflow-x-hidden pb-6">
      <header className="app-header border-border/80 bg-surface/92 sticky top-0 z-[90] border-b backdrop-blur-md">
        <div className="app-header-inner w-full max-w-none px-3 py-3 sm:px-4 sm:py-3.5 md:px-6 lg:mx-auto lg:max-w-[1200px] xl:max-w-[1700px]">
          <div className="flex items-center gap-3 md:gap-4">
            <Link
              href="/"
              className="app-brand-link bg-surface text-primary-strong border-primary/55 inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border-2 px-2.5 py-1.5 text-sm font-black tracking-tight shadow-[0_12px_26px_-18px_rgb(15_23_42/0.7)] transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-[0_16px_30px_-20px_rgb(15_23_42/0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 active:translate-y-0 active:scale-[0.99] sm:min-h-10 sm:px-3 sm:text-lg lg:text-2xl"
            >
              <span
                aria-hidden
                className="from-primary to-accent inline-block h-2 w-2 rounded-full bg-gradient-to-r"
              />
              Todo Studio
            </Link>
            <div className="app-main-nav-wrap hidden min-w-0 flex-1 md:block">
              <MainNav items={navItems} />
            </div>
            <div className="ml-auto flex items-center">
              <ProfileMenu userLabel={userLabel} navItems={navItems} />
            </div>
          </div>
        </div>
      </header>
      <main className="w-full max-w-none px-3 py-4 sm:px-4 sm:py-5 md:px-6 lg:mx-auto lg:max-w-[1200px] lg:px-7 xl:max-w-[1700px] xl:px-8 xl:py-7">
        {children}
      </main>
    </div>
  );
}
