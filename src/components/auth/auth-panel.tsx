"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/client-api";

type AuthMode = "login" | "register";

export function AuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitLabel = useMemo(() => {
    return mode === "login" ? "Entrar" : "Crear cuenta";
  }, [mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === "login") {
        await fetchApi("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
          }),
        });
      } else {
        await fetchApi("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
            displayName: displayName.trim() || undefined,
          }),
        });
      }

      router.push("/");
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "No fue posible iniciar sesión.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="border-border/80 bg-surface/90 shadow-primary/10 relative w-full max-w-md overflow-hidden rounded-[1.6rem] border p-5 shadow-2xl backdrop-blur sm:rounded-[2rem] sm:p-7">
      <div
        aria-hidden
        className="bg-primary/15 pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full blur-2xl"
      />
      <div
        aria-hidden
        className="bg-accent/15 pointer-events-none absolute -bottom-20 -left-14 h-36 w-36 rounded-full blur-2xl"
      />
      <header className="mb-6 space-y-2">
        <span className="bg-primary/10 text-primary-strong inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase">
          Local-first
        </span>
        <h1 className="text-primary-strong text-2xl font-black tracking-tight sm:text-3xl">
          Todo Studio
        </h1>
        <p className="text-muted text-sm leading-relaxed">
          Gestiona tus tareas locales con seguridad y sincronización futura.
        </p>
      </header>

      <div className="border-border bg-surface-strong/85 mb-6 grid grid-cols-2 rounded-full border p-1">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`inline-flex min-h-11 items-center justify-center rounded-full px-3 py-2 text-sm font-semibold transition ${
            mode === "login"
              ? "bg-surface text-foreground shadow-[0_8px_20px_-14px_rgb(15_23_42/0.9)]"
              : "text-muted"
          }`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`inline-flex min-h-11 items-center justify-center rounded-full px-3 py-2 text-sm font-semibold transition ${
            mode === "register"
              ? "bg-surface text-foreground shadow-[0_8px_20px_-14px_rgb(15_23_42/0.9)]"
              : "text-muted"
          }`}
        >
          Registro
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === "register" ? (
          <label className="block space-y-1">
            <span className="text-sm font-medium">Nombre visible</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="border-border ring-primary w-full rounded-xl border bg-white/95 px-3 py-2 text-sm transition outline-none focus:ring-2"
              placeholder="Tu nombre"
              autoComplete="name"
            />
          </label>
        ) : null}

        <label className="block space-y-1">
          <span className="text-sm font-medium">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="border-border ring-primary w-full rounded-xl border bg-white/95 px-3 py-2 text-sm transition outline-none focus:ring-2"
            placeholder="tu@email.com"
            autoComplete="email"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Contraseña</span>
          <input
            required
            type="password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="border-border ring-primary w-full rounded-xl border bg-white/95 px-3 py-2 text-sm transition outline-none focus:ring-2"
            placeholder="********"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </label>

        {error ? (
          <p className="bg-danger/10 text-danger rounded-xl px-3 py-2 text-sm">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary-strong hover:bg-primary inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Procesando..." : submitLabel}
        </button>
      </form>
    </section>
  );
}
