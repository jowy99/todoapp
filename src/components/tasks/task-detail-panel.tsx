"use client";

import { FormEvent, useMemo } from "react";
import { useT } from "@/components/settings/locale-provider";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type Status = "TODO" | "IN_PROGRESS" | "DONE";

type ListItem = {
  id: string;
  name: string;
  canEdit?: boolean;
  isShared?: boolean;
  accessRole?: "OWNER" | "VIEWER" | "EDITOR";
};

type TagItem = {
  id: string;
  name: string;
  color: string | null;
};

type TaskSummary = {
  id: string;
  title: string;
  canEdit: boolean;
};

type TaskFormState = {
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
  status: Status;
  listId: string;
  tagIds: string[];
};

type TaskDetailPanelProps = {
  task: TaskSummary | null;
  form: TaskFormState;
  lists: ListItem[];
  tags: TagItem[];
  isBusy: boolean;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: () => void;
  onClose: () => void;
  onChange: (
    field: "title" | "description" | "dueDate" | "priority" | "status" | "listId",
    value: string,
  ) => void;
  onToggleTag: (tagId: string) => void;
};

const priorities: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const statuses: Status[] = ["TODO", "IN_PROGRESS", "DONE"];
const darkTagTextHex = "#1e293b";
const lightTagTextHex = "#f8fafc";

function parseHexToRgb(color: string) {
  const normalized = color.replace("#", "");
  const hex = normalized.length === 3 ? normalized.split("").map((value) => `${value}${value}`).join("") : normalized;
  if (!/^[\da-fA-F]{6}$/.test(hex)) {
    return null;
  }

  return {
    red: Number.parseInt(hex.slice(0, 2), 16),
    green: Number.parseInt(hex.slice(2, 4), 16),
    blue: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function srgbToLinearChannel(value: number) {
  const normalized = value / 255;
  if (normalized <= 0.04045) {
    return normalized / 12.92;
  }
  return ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(red: number, green: number, blue: number) {
  const r = srgbToLinearChannel(red);
  const g = srgbToLinearChannel(green);
  const b = srgbToLinearChannel(blue);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(backgroundHex: string, foregroundHex: string) {
  const background = parseHexToRgb(backgroundHex);
  const foreground = parseHexToRgb(foregroundHex);
  if (!background || !foreground) {
    return 1;
  }

  const backgroundLuminance = relativeLuminance(background.red, background.green, background.blue);
  const foregroundLuminance = relativeLuminance(foreground.red, foreground.green, foreground.blue);
  const lighter = Math.max(backgroundLuminance, foregroundLuminance);
  const darker = Math.min(backgroundLuminance, foregroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function getTagTextColor(backgroundHex: string) {
  const darkContrast = contrastRatio(backgroundHex, darkTagTextHex);
  const lightContrast = contrastRatio(backgroundHex, lightTagTextHex);
  return lightContrast >= darkContrast ? lightTagTextHex : darkTagTextHex;
}

function darkenHexColor(color: string, amount = 0.2) {
  const parsed = parseHexToRgb(color);
  if (!parsed) {
    return color;
  }

  const factor = Math.min(Math.max(1 - amount, 0), 1);
  const red = Math.round(parsed.red * factor);
  const green = Math.round(parsed.green * factor);
  const blue = Math.round(parsed.blue * factor);
  return `#${red.toString(16).padStart(2, "0")}${green.toString(16).padStart(2, "0")}${blue
    .toString(16)
    .padStart(2, "0")}`;
}

export function TaskDetailPanel({
  task,
  form,
  lists,
  tags,
  isBusy,
  onSave,
  onDelete,
  onClose,
  onChange,
  onToggleTag,
}: TaskDetailPanelProps) {
  const t = useT();
  const priorityLabels = useMemo(
    () => ({
      LOW: t("tasks.priority.low"),
      MEDIUM: t("tasks.priority.medium"),
      HIGH: t("tasks.priority.high"),
      URGENT: t("tasks.priority.urgent"),
    }),
    [t],
  );
  const statusLabels = useMemo(
    () => ({
      TODO: t("tasks.status.todo"),
      IN_PROGRESS: t("tasks.status.inProgress"),
      DONE: t("tasks.status.done"),
    }),
    [t],
  );
  const accessRoleLabels = useMemo(
    () => ({
      OWNER: t("tasks.access.owner"),
      EDITOR: t("tasks.access.editor"),
      VIEWER: t("tasks.access.viewer"),
    }),
    [t],
  );

  return (
    <section className="flex h-full flex-col bg-[color:var(--ui-surface-1)] px-3 py-3 sm:px-6 sm:py-6 md:px-8 md:py-8">
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)] pb-3 backdrop-blur sm:mb-6 sm:border-b-0 sm:bg-transparent sm:pb-0">
        <div>
          <p className="ui-kicker ui-kicker--muted">{t("tasks.kicker")}</p>
          <h3 className="mt-1 text-lg font-semibold text-[color:var(--ui-text-strong)] sm:text-2xl">
            {task?.title ?? t("tasks.noneSelected")}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("tasks.closeDetailLabel")}
          title={t("tasks.closeDetailLabel")}
          className="ui-btn ui-btn--secondary h-11 w-11 rounded-full p-0 text-[color:var(--ui-text-muted)] sm:h-9 sm:w-9"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
            <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </div>

      <form onSubmit={onSave} className="flex h-full flex-col">
        <div className="space-y-4 sm:space-y-5">
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.09em] text-[color:var(--ui-text-muted)]">
              {t("tasks.name")}
            </span>
            <Input
              required
              value={form.title}
              disabled={!task?.canEdit}
              onChange={(event) => onChange("title", event.target.value)}
              className="ui-field w-full disabled:opacity-60"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.09em] text-[color:var(--ui-text-muted)]">
              {t("tasks.description")}
            </span>
            <Textarea
              rows={5}
              value={form.description}
              disabled={!task?.canEdit}
              onChange={(event) => onChange("description", event.target.value)}
              placeholder={t("tasks.descriptionPlaceholder")}
              className="ui-field w-full resize-none disabled:opacity-60"
            />
          </label>

          <div className="grid gap-3">
            <label className="grid gap-1 md:grid-cols-[96px_1fr] md:items-center md:gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.09em] text-[color:var(--ui-text-muted)]">
                {t("tasks.list")}
              </span>
              <Select
                value={form.listId}
                disabled={!task?.canEdit}
                onChange={(event) => onChange("listId", event.target.value)}
                className="ui-field w-full disabled:opacity-60"
              >
                <option value="">{t("tasks.noList")}</option>
                {lists.map((list) => (
                  <option key={list.id} value={list.id} disabled={list.canEdit === false}>
                    {list.name}
                    {list.isShared && list.accessRole
                      ? ` · ${accessRoleLabels[list.accessRole]}`
                      : ""}
                    {list.canEdit === false ? ` · ${t("tasks.readOnly")}` : ""}
                  </option>
                ))}
              </Select>
            </label>

            <label className="grid gap-1 md:grid-cols-[96px_1fr] md:items-center md:gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.09em] text-[color:var(--ui-text-muted)]">
                {t("tasks.dueDate")}
              </span>
              <Input
                type="datetime-local"
                value={form.dueDate}
                disabled={!task?.canEdit}
                onChange={(event) => onChange("dueDate", event.target.value)}
                className="ui-field w-full disabled:opacity-60"
              />
            </label>

            <label className="grid gap-1 md:grid-cols-[96px_1fr] md:items-center md:gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.09em] text-[color:var(--ui-text-muted)]">
                {t("tasks.priority")}
              </span>
              <Select
                value={form.priority}
                disabled={!task?.canEdit}
                onChange={(event) => onChange("priority", event.target.value)}
                className="ui-field w-full disabled:opacity-60"
              >
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priorityLabels[priority]}
                  </option>
                ))}
              </Select>
            </label>

            <label className="grid gap-1 md:grid-cols-[96px_1fr] md:items-center md:gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.09em] text-[color:var(--ui-text-muted)]">
                {t("tasks.status")}
              </span>
              <Select
                value={form.status}
                disabled={!task?.canEdit}
                onChange={(event) => onChange("status", event.target.value)}
                className="ui-field w-full disabled:opacity-60"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </Select>
            </label>

            <div className="grid gap-1 md:grid-cols-[96px_1fr] md:gap-3">
              <span className="pt-0 text-xs font-semibold tracking-[0.09em] text-[color:var(--ui-text-muted)] uppercase md:pt-2">
                {t("tasks.tags")}
              </span>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => {
                  const selected = form.tagIds.includes(tag.id);
                  const baseTagColor =
                    tag.color ??
                    (index % 3 === 0 ? "#d1fae5" : index % 3 === 1 ? "#fee2e2" : "#dbeafe");
                  const chipBackgroundColor = selected ? darkenHexColor(baseTagColor, 0.2) : baseTagColor;
                  const chipTextColor = selected ? lightTagTextHex : getTagTextColor(chipBackgroundColor);
                  const chipBorderColor = selected ? "rgba(248, 250, 252, 0.45)" : "rgba(15, 23, 42, 0.14)";

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      disabled={!task?.canEdit}
                      onClick={() => onToggleTag(tag.id)}
                      className={`ui-chip rounded-full px-3 py-1.5 text-[13px] font-semibold tracking-[0.01em] transition-all duration-200 ease-out ${
                        selected
                          ? "shadow-[var(--ui-shadow-xs)]"
                          : "hover:brightness-[0.98]"
                      }`}
                      style={{
                        backgroundColor: chipBackgroundColor,
                        color: chipTextColor,
                        borderColor: chipBorderColor,
                      }}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        </div>

        <div className="mt-auto flex flex-col-reverse gap-2 border-t border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)] pt-5 sm:flex-row sm:items-center sm:gap-3">
          <button
            type="button"
            onClick={onDelete}
            disabled={isBusy || !task?.canEdit}
            className="ui-btn ui-btn--secondary w-full sm:w-auto"
          >
            {t("tasks.deleteTask")}
          </button>
          <button
            type="submit"
            disabled={isBusy || !form.title.trim() || !task?.canEdit}
            className="ui-btn ui-btn--accent w-full sm:ml-auto sm:w-auto"
          >
            {isBusy ? t("tasks.savingChanges") : t("tasks.saveChanges")}
          </button>
        </div>
      </form>
    </section>
  );
}
