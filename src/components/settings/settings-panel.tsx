"use client";

import { useMemo, useState } from "react";
import { useLocalePreference, useT } from "@/components/settings/locale-provider";
import { useThemePreference } from "@/components/settings/theme-provider";
import { useUiPreferences } from "@/components/settings/ui-preferences-provider";
import { type AppLocale } from "@/lib/preferences/locale";
import { type ThemePreference } from "@/lib/preferences/theme";
import { type MotionPreference, type WeekStartPreference } from "@/lib/preferences/ui";

export function SettingsPanel() {
  const t = useT();
  const { locale, setLocale } = useLocalePreference();
  const { preference, resolvedTheme, setPreference } = useThemePreference();
  const {
    weekStart,
    setWeekStart,
    showCompletedTasks,
    setShowCompletedTasks,
    motionPreference,
    resolvedMotion,
    setMotionPreference,
  } = useUiPreferences();
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const themeOptions = useMemo<Array<{ value: ThemePreference; label: string; description: string }>>(
    () => [
      {
        value: "light",
        label: t("settings.theme.light.label"),
        description: t("settings.theme.light.description"),
      },
      {
        value: "dark",
        label: t("settings.theme.dark.label"),
        description: t("settings.theme.dark.description"),
      },
      {
        value: "system",
        label: t("settings.theme.system.label"),
        description: t("settings.theme.system.description"),
      },
    ],
    [t],
  );

  const localeOptions = useMemo<Array<{ value: AppLocale; label: string; description: string }>>(
    () => [
      {
        value: "es",
        label: t("settings.language.es.label"),
        description: t("settings.language.es.description"),
      },
      {
        value: "en",
        label: t("settings.language.en.label"),
        description: t("settings.language.en.description"),
      },
    ],
    [t],
  );

  const weekStartOptions = useMemo<Array<{ value: WeekStartPreference; label: string }>>(
    () => [
      {
        value: "monday",
        label: t("settings.calendar.weekStart.monday"),
      },
      {
        value: "sunday",
        label: t("settings.calendar.weekStart.sunday"),
      },
    ],
    [t],
  );

  const motionOptions = useMemo<Array<{ value: MotionPreference; label: string; description: string }>>(
    () => [
      {
        value: "system",
        label: t("settings.motion.system.label"),
        description: t("settings.motion.system.description"),
      },
      {
        value: "reduce",
        label: t("settings.motion.reduce.label"),
        description: t("settings.motion.reduce.description"),
      },
      {
        value: "no-preference",
        label: t("settings.motion.noPreference.label"),
        description: t("settings.motion.noPreference.description"),
      },
    ],
    [t],
  );

  const activeOption = useMemo(
    () => themeOptions.find((option) => option.value === preference) ?? themeOptions[2],
    [preference, themeOptions],
  );

  const activeLocaleOption = useMemo(
    () => localeOptions.find((option) => option.value === locale) ?? localeOptions[1],
    [locale, localeOptions],
  );

  const resolvedThemeLabel =
    resolvedTheme === "dark" ? t("settings.theme.resolved.dark") : t("settings.theme.resolved.light");
  const activeWeekStart = weekStartOptions.find((option) => option.value === weekStart) ?? weekStartOptions[0];
  const resolvedMotionLabel =
    resolvedMotion === "reduce"
      ? t("settings.motion.resolved.reduce")
      : t("settings.motion.resolved.noPreference");

  return (
    <section className="min-w-0 space-y-5 sm:space-y-6">
      <header className="ui-card ui-card--hero overflow-hidden p-4 sm:p-5">
        <p className="ui-kicker ui-kicker--muted">{t("settings.kicker")}</p>
        <h1 className="ui-title-lg mt-2">{t("settings.appearance.title")}</h1>
        <p className="ui-subtle mt-2 max-w-2xl">
          {t("settings.appearance.description")}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <article className="ui-card space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.12em] text-[color:var(--ui-text-muted)] uppercase">
                {t("settings.theme.mode")}
              </p>
              <p className="mt-1 text-sm text-[color:var(--ui-text-muted)]">
                {t("settings.selection.current")}:{" "}
                <span className="font-semibold text-[color:var(--ui-text-strong)]">{activeOption.label}</span>
              </p>
            </div>
            <span className="ui-chip ui-chip--meta">
              {t("settings.theme.resolved")}: {resolvedThemeLabel}
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label={t("settings.theme.aria")}
            className="grid grid-cols-1 gap-2.5 rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] p-2 sm:grid-cols-3"
          >
            {themeOptions.map((option) => {
              const isActive = preference === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => {
                    setPreference(option.value);
                    setLastSavedAt(Date.now());
                  }}
                  className={`min-h-12 rounded-xl border px-3 py-2 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)] ${
                    isActive
                      ? "border-[color:var(--primary-600)] bg-[color:var(--primary)] text-[color:var(--on-primary)] shadow-[var(--ui-shadow-sm)]"
                      : "border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)] text-[color:var(--ui-text-muted)] hover:-translate-y-[1px] hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-surface-3)] hover:text-[color:var(--ui-text-strong)]"
                  }`}
                >
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p
                    className={`mt-1 text-xs ${
                      isActive ? "text-[color:color-mix(in_srgb,var(--on-primary)_85%,transparent)]" : "text-[color:var(--ui-text-soft)]"
                    }`}
                  >
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="flex min-h-6 items-center justify-between gap-2">
            <p className="text-xs text-[color:var(--ui-text-muted)]">{t("settings.theme.ready")}</p>
            {lastSavedAt ? (
              <span className="text-xs font-medium text-[color:var(--success)]" aria-live="polite">
                {t("app.saved")}
              </span>
            ) : null}
          </div>
        </article>

        <article className="ui-card space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.12em] text-[color:var(--ui-text-muted)] uppercase">
                {t("settings.language.mode")}
              </p>
              <p className="mt-1 text-sm text-[color:var(--ui-text-muted)]">
                {t("settings.selection.current")}:{" "}
                <span className="font-semibold text-[color:var(--ui-text-strong)]">{activeLocaleOption.label}</span>
              </p>
            </div>
            <span className="ui-chip ui-chip--meta">{activeLocaleOption.value}</span>
          </div>

          <p className="text-sm text-[color:var(--ui-text-muted)]">{t("settings.language.description")}</p>

          <div
            role="radiogroup"
            aria-label={t("settings.language.aria")}
            className="grid grid-cols-1 gap-2.5 rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] p-2 sm:grid-cols-2"
          >
            {localeOptions.map((option) => {
              const isActive = locale === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => {
                    setLocale(option.value);
                    setLastSavedAt(Date.now());
                  }}
                  className={`min-h-12 rounded-xl border px-3 py-2 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)] ${
                    isActive
                      ? "border-[color:var(--primary-600)] bg-[color:var(--primary)] text-[color:var(--on-primary)] shadow-[var(--ui-shadow-sm)]"
                      : "border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)] text-[color:var(--ui-text-muted)] hover:-translate-y-[1px] hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-surface-3)] hover:text-[color:var(--ui-text-strong)]"
                  }`}
                >
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p
                    className={`mt-1 text-xs ${
                      isActive ? "text-[color:color-mix(in_srgb,var(--on-primary)_85%,transparent)]" : "text-[color:var(--ui-text-soft)]"
                    }`}
                  >
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="flex min-h-6 items-center justify-between gap-2">
            <p className="text-xs text-[color:var(--ui-text-muted)]">{t("settings.language.ready")}</p>
            {lastSavedAt ? (
              <span className="text-xs font-medium text-[color:var(--success)]" aria-live="polite">
                {t("app.saved")}
              </span>
            ) : null}
          </div>
        </article>

        <article className="ui-card space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.12em] text-[color:var(--ui-text-muted)] uppercase">
                {t("settings.calendar.title")}
              </p>
              <p className="mt-1 text-sm text-[color:var(--ui-text-muted)]">{t("settings.calendar.description")}</p>
            </div>
            <span className="ui-chip ui-chip--meta">{activeWeekStart.label}</span>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.1em] text-[color:var(--ui-text-muted)] uppercase">
              {t("settings.calendar.weekStart")}
            </p>
            <div
              role="radiogroup"
              aria-label={t("settings.calendar.weekStart")}
              className="grid grid-cols-2 gap-2.5 rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] p-2"
            >
              {weekStartOptions.map((option) => {
                const isActive = weekStart === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => {
                      setWeekStart(option.value);
                      setLastSavedAt(Date.now());
                    }}
                    className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)] ${
                      isActive
                        ? "border-[color:var(--primary-600)] bg-[color:var(--primary)] text-[color:var(--on-primary)]"
                        : "border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)] text-[color:var(--ui-text-muted)] hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-surface-3)] hover:text-[color:var(--ui-text-strong)]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[color:var(--ui-text-strong)]">{t("settings.calendar.showCompleted")}</p>
                <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">{t("settings.calendar.showCompleted.description")}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showCompletedTasks}
                aria-label={t("settings.calendar.showCompleted")}
                onClick={() => {
                  setShowCompletedTasks(!showCompletedTasks);
                  setLastSavedAt(Date.now());
                }}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)] ${
                  showCompletedTasks
                    ? "border-[color:var(--primary-600)] bg-[color:var(--primary)]"
                    : "border-[color:var(--ui-border-strong)] bg-[color:var(--ui-surface-3)]"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-[color:var(--ui-surface-1)] shadow-[var(--ui-shadow-xs)] transition-transform duration-200 ease-out ${
                    showCompletedTasks ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex min-h-6 items-center justify-between gap-2">
            <p className="text-xs text-[color:var(--ui-text-muted)]">{t("settings.calendar.description")}</p>
            {lastSavedAt ? (
              <span className="text-xs font-medium text-[color:var(--success)]" aria-live="polite">
                {t("app.saved")}
              </span>
            ) : null}
          </div>
        </article>

        <article className="ui-card space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.12em] text-[color:var(--ui-text-muted)] uppercase">
                {t("settings.accessibility.title")}
              </p>
              <p className="mt-1 text-sm text-[color:var(--ui-text-muted)]">{t("settings.accessibility.description")}</p>
            </div>
            <span className="ui-chip ui-chip--meta">
              {t("settings.motion.resolved.label")}: {resolvedMotionLabel}
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label={t("settings.motion.mode")}
            className="grid grid-cols-1 gap-2.5 rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] p-2"
          >
            {motionOptions.map((option) => {
              const isActive = motionPreference === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => {
                    setMotionPreference(option.value);
                    setLastSavedAt(Date.now());
                  }}
                  className={`min-h-12 rounded-xl border px-3 py-2 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)] ${
                    isActive
                      ? "border-[color:var(--primary-600)] bg-[color:var(--primary)] text-[color:var(--on-primary)]"
                      : "border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)] text-[color:var(--ui-text-muted)] hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-surface-3)] hover:text-[color:var(--ui-text-strong)]"
                  }`}
                >
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p
                    className={`mt-1 text-xs ${
                      isActive ? "text-[color:color-mix(in_srgb,var(--on-primary)_85%,transparent)]" : "text-[color:var(--ui-text-soft)]"
                    }`}
                  >
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="flex min-h-6 items-center justify-between gap-2">
            <p className="text-xs text-[color:var(--ui-text-muted)]">{t("settings.motion.ready")}</p>
            {lastSavedAt ? (
              <span className="text-xs font-medium text-[color:var(--success)]" aria-live="polite">
                {t("app.saved")}
              </span>
            ) : null}
          </div>
        </article>
      </div>
    </section>
  );
}
