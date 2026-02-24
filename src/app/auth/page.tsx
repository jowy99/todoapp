import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/auth/auth-panel";
import { getCurrentUser } from "@/lib/auth/session";

export default async function AuthPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div
        aria-hidden
        className="from-primary/10 pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b via-transparent to-transparent"
      />
      <AuthPanel />
    </main>
  );
}
