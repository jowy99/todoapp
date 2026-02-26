"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { fetchApi } from "@/lib/client-api";
import { useT } from "@/components/settings/locale-provider";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type ListAccessRole = "OWNER" | "EDITOR" | "VIEWER";

type CalendarListOption = {
  id: string;
  name: string;
  color: string | null;
  canEdit?: boolean;
  accessRole?: ListAccessRole;
};

type CalendarTagOption = {
  id: string;
  name: string;
  color: string | null;
};

type MobileNewTaskButtonProps = {
  defaultDate: string;
  compact?: boolean;
  className?: string;
  ariaLabel?: string;
};

function toDefaultDateTimeValue(dateParam: string) {
  return `${dateParam}T12:00`;
}

function toIsoDateTime(value: string) {
  if (!value.trim()) {
    return null;
  }

  return new Date(value).toISOString();
}

export function MobileNewTaskButton({
  defaultDate,
  compact = false,
  className = "",
  ariaLabel,
}: MobileNewTaskButtonProps) {
  const router = useRouter();
  const t = useT();
  const resolvedAriaLabel = ariaLabel ?? t("tasks.add");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [isDesktopDialogViewport, setIsDesktopDialogViewport] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [listId, setListId] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [lists, setLists] = useState<CalendarListOption[]>([]);
  const [tags, setTags] = useState<CalendarTagOption[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  const defaultDueDateValue = useMemo(() => toDefaultDateTimeValue(defaultDate), [defaultDate]);
  const selectedList = useMemo(() => lists.find((list) => list.id === listId) ?? null, [listId, lists]);
  const canCreateInSelectedList = selectedList
    ? (selectedList.canEdit ?? selectedList.accessRole !== "VIEWER")
    : true;

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const syncViewport = () => {
      setIsDesktopDialogViewport(desktopQuery.matches);
    };
    syncViewport();
    desktopQuery.addEventListener("change", syncViewport);
    return () => {
      desktopQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDueDate(defaultDueDateValue);
    setMetaError(null);
    setIsLoadingMeta(true);

    let isCanceled = false;
    void Promise.all([
      fetchApi<{ lists: CalendarListOption[] }>("/api/lists"),
      fetchApi<{ tags: CalendarTagOption[] }>("/api/tags"),
    ])
      .then(([listData, tagData]) => {
        if (isCanceled) {
          return;
        }

        setLists(listData.lists);
        setTags(tagData.tags);
        setListId((previous) =>
          previous && listData.lists.some((list) => list.id === previous) ? previous : "",
        );
        setTagIds((previous) =>
          previous.filter((tagId) => tagData.tags.some((tag) => tag.id === tagId)),
        );
      })
      .catch((metaLoadError) => {
        if (isCanceled) {
          return;
        }
        setMetaError(
          metaLoadError instanceof Error ? metaLoadError.message : t("lists.error.loadTasks"),
        );
      })
      .finally(() => {
        if (!isCanceled) {
          setIsLoadingMeta(false);
        }
      });

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeydown);

    return () => {
      isCanceled = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeydown);
      document.body.style.overflow = previousOverflow;
    };
  }, [defaultDueDateValue, open, t]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      await fetchApi<{ task: { id: string } }>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate: toIsoDateTime(dueDate),
          priority,
          listId: listId || null,
          tagIds,
        }),
      });

      setOpen(false);
      setTitle("");
      setDescription("");
      setDueDate(defaultDueDateValue);
      setPriority("MEDIUM");
      setListId("");
      setTagIds([]);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("tasks.error.taskCreate"));
    } finally {
      setBusy(false);
    }
  }

  const buttonStyles = compact
    ? "ui-btn ui-btn--accent inline-flex h-10 w-10 items-center justify-center rounded-xl px-0 text-xl leading-none"
    : "ui-btn ui-btn--accent inline-flex h-10 items-center rounded-xl px-3.5 text-sm";
  const modalContent = open ? (
    <div
      className={`fixed inset-0 z-[220] ${isDesktopDialogViewport ? "flex items-center justify-center p-4" : ""}`}
      role="presentation"
    >
      <button
        type="button"
        aria-label={t("tasks.closeDetailLabel")}
        className="ui-overlay-fade-in absolute inset-0 bg-[color:var(--ui-overlay-backdrop-soft)] backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t("tasks.quickAddPlaceholder")}
        className={
          isDesktopDialogViewport
            ? "ui-dialog-scale-in relative z-[1] flex max-h-[min(88dvh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)]/95 shadow-[var(--ui-shadow-lg)] backdrop-blur-sm"
            : "ui-sheet-in-up sm-ui-sheet-in-right absolute inset-x-0 bottom-0 z-[1] h-[min(86dvh,700px)] w-full rounded-t-3xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)]/95 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[var(--ui-shadow-lg)] backdrop-blur-sm sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:max-w-md sm:rounded-none sm:border-l sm:border-t-0"
        }
      >
        <form onSubmit={handleSubmit} className="flex h-full min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-[color:var(--ui-border-soft)] px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.12em] text-[color:var(--ui-text-muted)] uppercase">
                {t("tasks.kicker")}
              </p>
              <p className="truncate text-sm font-semibold text-[color:var(--ui-text-strong)]">{t("tasks.quickAddPlaceholder")}</p>
            </div>
            <button
              type="button"
              aria-label={t("common.close")}
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] text-[color:var(--ui-text-muted)] transition-colors hover:bg-[color:var(--ui-surface-3)] hover:text-[color:var(--ui-text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)]"
            >
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden>
                <path
                  d="m6 6 8 8m0-8-8 8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            <label className="block space-y-1">
              <span className="text-xs font-semibold tracking-[0.08em] text-[color:var(--ui-text-muted)] uppercase">
                {t("tasks.name")}
              </span>
              <Input
                ref={inputRef}
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t("tasks.quickAddPlaceholder")}
                className="h-11"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold tracking-[0.08em] text-[color:var(--ui-text-muted)] uppercase">
                {t("tasks.description")}
              </span>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t("tasks.quickDescriptionPlaceholder")}
                rows={3}
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-xs font-semibold tracking-[0.08em] text-[color:var(--ui-text-muted)] uppercase">
                  {t("tasks.dueDate")}
                </span>
                <Input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="h-11"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-semibold tracking-[0.08em] text-[color:var(--ui-text-muted)] uppercase">
                  {t("tasks.priority")}
                </span>
                <Select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as TaskPriority)}
                  className="h-11"
                >
                  <option value="LOW">{t("tasks.priority.low")}</option>
                  <option value="MEDIUM">{t("tasks.priority.medium")}</option>
                  <option value="HIGH">{t("tasks.priority.high")}</option>
                  <option value="URGENT">{t("tasks.priority.urgent")}</option>
                </Select>
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold tracking-[0.08em] text-[color:var(--ui-text-muted)] uppercase">
                {t("tasks.list")}
              </span>
              <Select
                value={listId}
                onChange={(event) => setListId(event.target.value)}
                className="h-11"
              >
                <option value="">{t("tasks.noList")}</option>
                {lists.map((list) => {
                  const listCanEdit = list.canEdit ?? list.accessRole !== "VIEWER";
                  return (
                    <option key={list.id} value={list.id} disabled={!listCanEdit}>
                      {list.name}
                      {!listCanEdit ? ` · ${t("tasks.readOnly")}` : ""}
                    </option>
                  );
                })}
              </Select>
            </label>

            {selectedList && !canCreateInSelectedList ? (
              <p className="rounded-xl border border-[color:color-mix(in_srgb,var(--error)_36%,var(--ui-border-soft))] bg-[color:color-mix(in_srgb,var(--error)_12%,var(--ui-surface-1))] px-3 py-2 text-xs font-medium text-[color:color-mix(in_srgb,var(--error)_86%,var(--ui-text-strong))]">
                {t("tasks.quickReadOnlyList")}
              </p>
            ) : null}

            <fieldset className="space-y-1">
              <legend className="text-xs font-semibold tracking-[0.08em] text-[color:var(--ui-text-muted)] uppercase">
                {t("tasks.tags")}
              </legend>
              {isLoadingMeta ? (
                <p className="rounded-xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] px-3 py-2 text-xs text-[color:var(--ui-text-muted)]">
                  {t("common.loading")}
                </p>
              ) : tags.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] px-3 py-2 text-xs text-[color:var(--ui-text-muted)]">
                  {t("tasks.quickTagsHint")}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const selected = tagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() =>
                          setTagIds((previous) =>
                            previous.includes(tag.id)
                              ? previous.filter((tagId) => tagId !== tag.id)
                              : [...previous, tag.id],
                          )
                        }
                        className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)] ${
                          selected
                            ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--on-accent)]"
                            : "border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] text-[color:var(--ui-text-muted)] hover:bg-[color:var(--ui-surface-3)] hover:text-[color:var(--ui-text-strong)]"
                        }`}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: tag.color ?? "#94a3b8" }}
                          aria-hidden
                        />
                        <span className="max-w-[140px] truncate">{tag.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </fieldset>

            {error ? (
              <p className="rounded-xl border border-[color:color-mix(in_srgb,var(--error)_36%,var(--ui-border-soft))] bg-[color:color-mix(in_srgb,var(--error)_12%,var(--ui-surface-1))] px-3 py-2 text-sm font-medium text-[color:color-mix(in_srgb,var(--error)_86%,var(--ui-text-strong))]">
                {error}
              </p>
            ) : null}
            {metaError ? (
              <p className="rounded-xl border border-[color:color-mix(in_srgb,var(--warning)_36%,var(--ui-border-soft))] bg-[color:color-mix(in_srgb,var(--warning)_12%,var(--ui-surface-1))] px-3 py-2 text-xs font-medium text-[color:color-mix(in_srgb,var(--warning)_84%,var(--ui-text-strong))]">
                {metaError}
              </p>
            ) : null}
          </div>

          <div className="border-t border-[color:var(--ui-border-soft)] px-4 py-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ui-btn ui-btn--secondary h-11 rounded-xl"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={busy || !title.trim() || !canCreateInSelectedList}
                className="ui-btn ui-btn--accent h-11 rounded-xl disabled:opacity-60"
              >
                {busy ? t("common.creating") : t("common.create")}
              </button>
            </div>
          </div>
        </form>
      </aside>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        aria-label={resolvedAriaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={`${buttonStyles} ${className}`.trim()}
      >
        {compact ? "+" : `+ ${t("tasks.add")}`}
      </button>
      {modalContent && typeof document !== "undefined" ? createPortal(modalContent, document.body) : null}
    </>
  );
}
