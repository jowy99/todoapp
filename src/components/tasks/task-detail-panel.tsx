"use client";

import { FormEvent } from "react";

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
  return (
    <section className="flex h-full flex-col px-6 py-6 md:px-8 md:py-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">Task:</p>
          <h3 className="mt-1 text-2xl font-semibold text-slate-900">{task?.title}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar detalle"
          title="Cerrar detalle"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
            <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </div>

      <form onSubmit={onSave} className="flex h-full flex-col">
        <div className="space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-500">Task name</span>
            <input
              required
              value={form.title}
              disabled={!task?.canEdit}
              onChange={(event) => onChange("title", event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-500">Description</span>
            <textarea
              rows={5}
              value={form.description}
              disabled={!task?.canEdit}
              onChange={(event) => onChange("description", event.target.value)}
              placeholder="Write a short note..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60"
            />
          </label>

          <div className="grid gap-3">
            <label className="grid grid-cols-[96px_1fr] items-center gap-3">
              <span className="text-sm font-semibold text-slate-500">List</span>
              <select
                value={form.listId}
                disabled={!task?.canEdit}
                onChange={(event) => onChange("listId", event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60"
              >
                <option value="">Sin lista</option>
                {lists.map((list) => (
                  <option key={list.id} value={list.id} disabled={list.canEdit === false}>
                    {list.name}
                    {list.isShared ? ` · ${list.accessRole}` : ""}
                    {list.canEdit === false ? " · solo lectura" : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid grid-cols-[96px_1fr] items-center gap-3">
              <span className="text-sm font-semibold text-slate-500">Due date</span>
              <input
                type="datetime-local"
                value={form.dueDate}
                disabled={!task?.canEdit}
                onChange={(event) => onChange("dueDate", event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60"
              />
            </label>

            <label className="grid grid-cols-[96px_1fr] items-center gap-3">
              <span className="text-sm font-semibold text-slate-500">Priority</span>
              <select
                value={form.priority}
                disabled={!task?.canEdit}
                onChange={(event) => onChange("priority", event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60"
              >
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid grid-cols-[96px_1fr] items-center gap-3">
              <span className="text-sm font-semibold text-slate-500">Status</span>
              <select
                value={form.status}
                disabled={!task?.canEdit}
                onChange={(event) => onChange("status", event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-[96px_1fr] gap-3">
              <span className="pt-2 text-sm font-semibold text-slate-500">Tags</span>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => {
                  const selected = form.tagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      disabled={!task?.canEdit}
                      onClick={() => onToggleTag(tag.id)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                        selected
                          ? "bg-emerald-100 text-emerald-900"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                      style={
                        selected
                          ? undefined
                          : {
                              backgroundColor:
                                tag.color ??
                                (index % 3 === 0
                                  ? "#d1fae5"
                                  : index % 3 === 1
                                    ? "#fee2e2"
                                    : "#dbeafe"),
                            }
                      }
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <section className="space-y-2 border-t border-slate-200 pt-5">
            <h4 className="text-4xl font-bold tracking-tight text-slate-900">Subtasks:</h4>
            <p className="text-sm font-semibold text-slate-500">+ Add New Subtask</p>
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" disabled className="h-4 w-4 rounded-[3px] border-slate-300" />
              <span>Subtask</span>
            </label>
          </section>
        </div>

        <div className="mt-auto flex items-center gap-3 border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={onDelete}
            disabled={isBusy || !task?.canEdit}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
          >
            Delete Task
          </button>
          <button
            type="submit"
            disabled={isBusy || !form.title.trim() || !task?.canEdit}
            className="ml-auto rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-amber-400 disabled:opacity-60"
          >
            {isBusy ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}
