"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/client-api";

type IntegrationsStatus = {
  google: {
    connected: boolean;
    externalAccountEmail: string | null;
    accessTokenExpiresAt: string | null;
    calendarId: string | null;
    lastUpdatedAt: string | null;
  };
  ics: {
    feedUrl: string;
  };
  webhook: {
    ingestUrl: string;
  };
  export: {
    jsonUrl: string;
    csvUrl: string;
  };
};

type IntegrationsPanelProps = {
  initialGoogleStatus: string | null;
};

export function IntegrationsPanel({ initialGoogleStatus }: IntegrationsPanelProps) {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const googleStatusNotice = useMemo(() => {
    if (!initialGoogleStatus) {
      return null;
    }

    if (initialGoogleStatus === "connected") {
      return "Google Calendar conectado correctamente.";
    }

    if (initialGoogleStatus === "invalid-state") {
      return "No se pudo validar el estado OAuth. Reintenta la conexión.";
    }

    if (initialGoogleStatus === "error") {
      return "Falló el flujo OAuth de Google. Revisa credenciales y callback URL.";
    }

    return null;
  }, [initialGoogleStatus]);

  const loadStatus = useCallback(async () => {
    const data = await fetchApi<IntegrationsStatus>("/api/integrations/status");
    setStatus(data);
  }, []);

  useEffect(() => {
    void loadStatus().catch((loadError) => {
      setError(
        loadError instanceof Error ? loadError.message : "No fue posible cargar integraciones.",
      );
    });
  }, [loadStatus]);

  async function handleGoogleSync() {
    setError(null);
    setNotice(null);
    setIsBusy(true);

    try {
      const result = await fetchApi<{
        synced: {
          createdCount: number;
          updatedCount: number;
          deletedCount: number;
          totalActiveTasks: number;
        };
      }>("/api/integrations/google/sync", {
        method: "POST",
      });
      setNotice(
        `Sync completado. Creados: ${result.synced.createdCount}, actualizados: ${result.synced.updatedCount}, eliminados: ${result.synced.deletedCount}.`,
      );
      await loadStatus();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "No fue posible sincronizar.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleGoogleDisconnect() {
    setError(null);
    setNotice(null);
    setIsBusy(true);

    try {
      await fetchApi<{ ok: boolean }>("/api/integrations/google/disconnect", {
        method: "DELETE",
      });
      setNotice("Google Calendar desconectado.");
      await loadStatus();
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : "No fue posible desconectar Google.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRotateIcs() {
    setError(null);
    setNotice(null);
    setIsBusy(true);

    try {
      const data = await fetchApi<{ feedUrl: string }>("/api/integrations/ics/rotate", {
        method: "POST",
      });
      setStatus((prev) => (prev ? { ...prev, ics: { feedUrl: data.feedUrl } } : prev));
      setNotice("Token ICS rotado correctamente.");
    } catch (rotateError) {
      setError(
        rotateError instanceof Error ? rotateError.message : "No fue posible rotar el token ICS.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRotateWebhook() {
    setError(null);
    setNotice(null);
    setIsBusy(true);

    try {
      const data = await fetchApi<{ ingestUrl: string }>("/api/integrations/webhook/rotate", {
        method: "POST",
      });
      setStatus((prev) => (prev ? { ...prev, webhook: { ingestUrl: data.ingestUrl } } : prev));
      setNotice("Token de webhook rotado correctamente.");
    } catch (rotateError) {
      setError(
        rotateError instanceof Error ? rotateError.message : "No fue posible rotar el webhook.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function copyToClipboard(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label} copiado al portapapeles.`);
    } catch {
      setError(`No fue posible copiar ${label}.`);
    }
  }

  return (
    <section className="space-y-4 sm:space-y-6">
      <header className="border-border/80 bg-surface/90 relative overflow-hidden rounded-[1.4rem] border p-4 shadow-[0_20px_50px_-34px_rgb(15_23_42/0.85)] backdrop-blur sm:rounded-[1.75rem] sm:p-6">
        <div
          aria-hidden
          className="bg-primary/14 pointer-events-none absolute -top-14 right-10 h-36 w-36 rounded-full blur-2xl"
        />
        <div
          aria-hidden
          className="bg-accent/14 pointer-events-none absolute -bottom-14 left-10 h-32 w-32 rounded-full blur-2xl"
        />
        <p className="text-primary-strong text-sm font-semibold tracking-wide uppercase">
          Integraciones
        </p>
        <h1 className="text-foreground mt-2 text-2xl font-black tracking-tight sm:text-3xl">
          Google Calendar, ICS y Shortcuts
        </h1>
        <p className="text-muted mt-2 text-sm">
          Conecta tu calendario de Google, comparte feed ICS privado para Apple Calendar y usa
          webhook para automatizaciones.
        </p>
      </header>

      {googleStatusNotice ? (
        <p className="bg-primary/10 text-primary-strong rounded-xl px-4 py-3 text-sm font-medium">
          {googleStatusNotice}
        </p>
      ) : null}

      {error ? (
        <p className="bg-danger/10 text-danger rounded-xl px-4 py-3 text-sm font-medium">{error}</p>
      ) : null}
      {notice ? (
        <p className="bg-success/10 text-success rounded-xl px-4 py-3 text-sm font-medium">
          {notice}
        </p>
      ) : null}

      <section className="border-border/80 bg-surface/90 space-y-4 rounded-2xl border p-4 shadow-[0_16px_32px_-24px_rgb(15_23_42/0.75)] sm:p-5">
        <h2 className="text-xl font-bold">Google Calendar (OAuth)</h2>
        {!status ? (
          <p className="text-muted text-sm">Cargando estado...</p>
        ) : (
          <>
            <p className="text-sm">
              Estado:{" "}
              <span
                className={
                  status.google.connected
                    ? "text-success font-semibold"
                    : "text-danger font-semibold"
                }
              >
                {status.google.connected ? "Conectado" : "No conectado"}
              </span>
            </p>
            {status.google.externalAccountEmail ? (
              <p className="text-muted text-sm">Cuenta: {status.google.externalAccountEmail}</p>
            ) : null}
            {status.google.calendarId ? (
              <p className="text-muted text-xs">Calendar ID: {status.google.calendarId}</p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <a
                href="/api/integrations/google/connect"
                className="bg-primary-strong hover:bg-primary inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white transition"
              >
                {status.google.connected ? "Reconectar Google" : "Conectar Google"}
              </a>
              <button
                type="button"
                disabled={isBusy || !status.google.connected}
                onClick={() => void handleGoogleSync()}
                className="border-border/80 hover:bg-surface-strong inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:opacity-50"
              >
                Sync manual
              </button>
              <button
                type="button"
                disabled={isBusy || !status.google.connected}
                onClick={() => void handleGoogleDisconnect()}
                className="border-danger/30 text-danger hover:bg-danger/10 inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:opacity-50"
              >
                Desconectar
              </button>
            </div>
          </>
        )}
      </section>

      <section className="border-border/80 bg-surface/90 space-y-4 rounded-2xl border p-4 shadow-[0_16px_32px_-24px_rgb(15_23_42/0.75)] sm:p-5">
        <h2 className="text-xl font-bold">Apple Calendar (ICS privado)</h2>
        {!status ? (
          <p className="text-muted text-sm">Cargando...</p>
        ) : (
          <>
            <label className="block space-y-1">
              <span className="text-sm font-medium">URL del feed ICS</span>
              <input
                readOnly
                value={status.ics.feedUrl}
                className="border-border/80 w-full rounded-xl border bg-white/95 px-3 py-2 font-mono text-xs"
              />
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => void copyToClipboard(status.ics.feedUrl, "Feed ICS")}
                className="border-border/80 hover:bg-surface-strong inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition"
              >
                Copiar URL
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void handleRotateIcs()}
                className="border-border/80 hover:bg-surface-strong inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:opacity-50"
              >
                Rotar token ICS
              </button>
            </div>
          </>
        )}
      </section>

      <section className="border-border/80 bg-surface/90 space-y-4 rounded-2xl border p-4 shadow-[0_16px_32px_-24px_rgb(15_23_42/0.75)] sm:p-5">
        <h2 className="text-xl font-bold">Webhook para Shortcuts</h2>
        {!status ? (
          <p className="text-muted text-sm">Cargando...</p>
        ) : (
          <>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Endpoint de ingesta</span>
              <input
                readOnly
                value={status.webhook.ingestUrl}
                className="border-border/80 w-full rounded-xl border bg-white/95 px-3 py-2 font-mono text-xs"
              />
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => void copyToClipboard(status.webhook.ingestUrl, "Webhook URL")}
                className="border-border/80 hover:bg-surface-strong inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition"
              >
                Copiar endpoint
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void handleRotateWebhook()}
                className="border-border/80 hover:bg-surface-strong inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:opacity-50"
              >
                Rotar token webhook
              </button>
            </div>
            <pre className="border-border overflow-auto rounded-xl border bg-slate-900 p-3 text-[11px] text-slate-100 sm:text-xs">
              {`POST ${status.webhook.ingestUrl}
{
  "title": "Comprar pan",
  "dueDate": "2026-03-01T18:00:00.000Z",
  "priority": "MEDIUM",
  "listName": "Inbox"
}`}
            </pre>
          </>
        )}
      </section>

      <section className="border-border/80 bg-surface/90 space-y-3 rounded-2xl border p-4 shadow-[0_16px_32px_-24px_rgb(15_23_42/0.75)] sm:p-5">
        <h2 className="text-xl font-bold">Exportaciones</h2>
        {!status ? (
          <p className="text-muted text-sm">Cargando...</p>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <a
              href={status.export.jsonUrl}
              className="border-border/80 hover:bg-surface-strong inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition"
            >
              Descargar JSON
            </a>
            <a
              href={status.export.csvUrl}
              className="border-border/80 hover:bg-surface-strong inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition"
            >
              Descargar CSV
            </a>
          </div>
        )}
      </section>
    </section>
  );
}
