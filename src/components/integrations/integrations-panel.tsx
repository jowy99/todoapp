"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/client-api";
import { Input } from "@/components/ui/input";

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
    <section className="min-w-0 space-y-5 sm:space-y-6">
      <header className="ui-card ui-card--hero relative overflow-hidden p-5 sm:p-6">
        <div
          aria-hidden
          className="bg-primary/14 pointer-events-none absolute -top-14 right-10 h-36 w-36 rounded-full blur-2xl"
        />
        <div
          aria-hidden
          className="bg-accent/14 pointer-events-none absolute -bottom-14 left-10 h-32 w-32 rounded-full blur-2xl"
        />
        <p className="ui-kicker">
          Integraciones
        </p>
        <h1 className="ui-title-xl mt-2">
          Google Calendar, ICS y Shortcuts
        </h1>
        <p className="ui-subtle mt-2 max-w-3xl">
          Conecta tu calendario de Google, comparte feed ICS privado para Apple Calendar y usa
          webhook para automatizaciones.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span
            className={`ui-chip font-semibold shadow-sm ${
              status?.google.connected
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            Google: {status?.google.connected ? "Conectado" : "Desconectado"}
          </span>
          <span className="ui-chip bg-primary/10 text-primary-strong font-semibold shadow-sm">
            Feed ICS privado
          </span>
          <span className="ui-chip bg-accent/10 text-slate-700 font-semibold shadow-sm">
            Webhook + Export
          </span>
        </div>
      </header>

      {googleStatusNotice ? <p className="ui-alert ui-alert--info">{googleStatusNotice}</p> : null}
      {error ? <p className="ui-alert ui-alert--danger">{error}</p> : null}
      {notice ? <p className="ui-alert ui-alert--success">{notice}</p> : null}

      <section className="ui-card space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="ui-kicker ui-kicker--muted">OAuth</p>
            <h2 className="ui-title-lg mt-1">Google Calendar</h2>
          </div>
          <span
            className={`ui-chip ui-chip--meta ${
              status?.google.connected
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            {status?.google.connected ? "Conectado" : "No conectado"}
          </span>
        </div>

        {!status ? (
          <div className="space-y-2">
            <div className="ui-skeleton h-10 w-52" />
            <div className="ui-skeleton h-10 w-full" />
          </div>
        ) : (
          <>
            <p className="text-muted text-sm">Sincroniza tareas y fechas con tu agenda principal.</p>
            {status.google.externalAccountEmail ? (
              <p className="text-sm">
                Cuenta:{" "}
                <span className="font-semibold text-slate-900">{status.google.externalAccountEmail}</span>
              </p>
            ) : null}
            {status.google.calendarId ? (
              <p className="text-muted text-xs">Calendar ID: {status.google.calendarId}</p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <a
                href="/api/integrations/google/connect"
                className="ui-btn ui-btn--primary"
              >
                {status.google.connected ? "Reconectar Google" : "Conectar Google"}
              </a>
              <button
                type="button"
                disabled={isBusy || !status.google.connected}
                onClick={() => void handleGoogleSync()}
                className="ui-btn ui-btn--secondary"
              >
                Sync manual
              </button>
              <button
                type="button"
                disabled={isBusy || !status.google.connected}
                onClick={() => void handleGoogleDisconnect()}
                className="ui-btn ui-btn--destructive"
              >
                Desconectar
              </button>
            </div>
          </>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="ui-card space-y-4 p-4 sm:p-5">
          <div>
            <p className="ui-kicker ui-kicker--muted">Apple Calendar</p>
            <h2 className="ui-title-lg mt-1">Feed ICS privado</h2>
          </div>
          {!status ? (
            <div className="space-y-2">
              <div className="ui-skeleton h-10 w-full" />
              <div className="ui-skeleton h-10 w-36" />
            </div>
          ) : (
            <>
              <label className="block space-y-1">
                <span className="text-sm font-medium">URL del feed ICS</span>
                <Input
                  readOnly
                  value={status.ics.feedUrl}
                  className="ui-field w-full font-mono text-xs sm:text-sm"
                />
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => void copyToClipboard(status.ics.feedUrl, "Feed ICS")}
                  className="ui-btn ui-btn--secondary"
                >
                  Copiar URL
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleRotateIcs()}
                  className="ui-btn ui-btn--secondary"
                >
                  Rotar token ICS
                </button>
              </div>
            </>
          )}
        </section>

        <section className="ui-card space-y-4 p-4 sm:p-5">
          <div>
            <p className="ui-kicker ui-kicker--muted">Automatización</p>
            <h2 className="ui-title-lg mt-1">Webhook para Shortcuts</h2>
          </div>
          {!status ? (
            <div className="space-y-2">
              <div className="ui-skeleton h-10 w-full" />
              <div className="ui-skeleton h-20 w-full" />
            </div>
          ) : (
            <>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Endpoint de ingesta</span>
                <Input
                  readOnly
                  value={status.webhook.ingestUrl}
                  className="ui-field w-full font-mono text-xs sm:text-sm"
                />
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => void copyToClipboard(status.webhook.ingestUrl, "Webhook URL")}
                  className="ui-btn ui-btn--secondary"
                >
                  Copiar endpoint
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleRotateWebhook()}
                  className="ui-btn ui-btn--secondary"
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
      </div>

      <section className="ui-card space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="ui-kicker ui-kicker--muted">Backups</p>
            <h2 className="ui-title-lg mt-1">Exportaciones</h2>
          </div>
          <span className="ui-chip ui-chip--meta">JSON + CSV</span>
        </div>
        {!status ? (
          <div className="space-y-2">
            <div className="ui-skeleton h-10 w-40" />
            <div className="ui-skeleton h-10 w-40" />
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <a href={status.export.jsonUrl} className="ui-btn ui-btn--secondary">
              Descargar JSON
            </a>
            <a href={status.export.csvUrl} className="ui-btn ui-btn--secondary">
              Descargar CSV
            </a>
          </div>
        )}
      </section>
    </section>
  );
}
