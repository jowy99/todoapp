"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/client-api";
import { TaskDetailPanel } from "@/components/tasks/task-detail-panel";
import { SidebarNav } from "@/components/tasks/sidebar-nav";
import { AppShell } from "@/components/ui/app-shell";

type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type Status = "TODO" | "IN_PROGRESS" | "DONE";
type AccessRole = "OWNER" | "VIEWER" | "EDITOR";

type UserPreview = {
  id: string;
  email: string;
  displayName: string | null;
};

type ListItem = {
  id: string;
  name: string;
  color: string | null;
  ownerId?: string;
  owner?: UserPreview;
  accessRole?: AccessRole;
  canEdit?: boolean;
  isShared?: boolean;
  _count?: {
    tasks: number;
  };
};

type TagItem = {
  id: string;
  name: string;
  color: string | null;
  _count?: {
    tasks: number;
  };
};

type TaskItem = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  dueDate: string | null;
  priority: Priority;
  status: Status;
  isCompleted: boolean;
  listId: string | null;
  accessRole: AccessRole;
  canEdit: boolean;
  isShared: boolean;
  list: {
    id: string;
    name: string;
    color: string | null;
    ownerId?: string;
    owner?: UserPreview;
  } | null;
  tags: Array<{
    tagId: string;
    tag: TagItem;
  }>;
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

type TasksWorkspaceProps = {
  initialTasks: TaskItem[];
  initialLists: ListItem[];
  initialTags: TagItem[];
};

const priorities: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const statuses: Status[] = ["TODO", "IN_PROGRESS", "DONE"];

function toIsoDateTime(value: string) {
  if (!value.trim()) {
    return null;
  }

  return new Date(value).toISOString();
}

function toLocalDateTime(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function buildTaskFormState(task?: TaskItem): TaskFormState {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    dueDate: toLocalDateTime(task?.dueDate ?? null),
    priority: task?.priority ?? "MEDIUM",
    status: task?.status ?? "TODO",
    listId: task?.listId ?? "",
    tagIds: task?.tags.map((entry) => entry.tagId) ?? [],
  };
}

export function TasksWorkspace({ initialTasks, initialLists, initialTags }: TasksWorkspaceProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [lists, setLists] = useState(initialLists);
  const [tags, setTags] = useState(initialTags);

  const [taskForm, setTaskForm] = useState<TaskFormState>(buildTaskFormState());
  const [listName, setListName] = useState("");
  const [listColor, setListColor] = useState("#0ea5e9");
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#ec4899");

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<TaskFormState>(buildTaskFormState());
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [showListCreator, setShowListCreator] = useState(false);
  const [showTagCreator, setShowTagCreator] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const pendingTasks = useMemo(() => tasks.filter((task) => !task.isCompleted).length, [tasks]);
  const selectedList = lists.find((list) => list.id === taskForm.listId);
  const canCreateInSelectedList = !selectedList || selectedList.canEdit !== false;
  const selectedTask = editingTaskId ? tasks.find((task) => task.id === editingTaskId) : null;
  const showInlineEditForm = false;
  const sidebarLists = useMemo(
    () =>
      lists.map((list) => ({
        id: list.id,
        name: list.name,
        color: list.color,
        count: list._count?.tasks ?? 0,
      })),
    [lists],
  );
  const sidebarTags = useMemo(
    () =>
      tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
      })),
    [tags],
  );

  useEffect(() => {
    const stored = window.localStorage.getItem("todo.sidebar.collapsed");
    setIsSidebarCollapsed(stored === "1");
  }, []);

  useEffect(() => {
    window.localStorage.setItem("todo.sidebar.collapsed", isSidebarCollapsed ? "1" : "0");
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      return;
    }

    function onKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 768) {
        setIsMobileSidebarOpen(false);
      }
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!selectedTask) {
      return;
    }

    function onKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setEditingTaskId(null);
      }
    }

    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [selectedTask]);

  useEffect(() => {
    if (!notice && !error) {
      return;
    }

    const timeout = window.setTimeout(
      () => {
        setNotice(null);
        setError(null);
      },
      error ? 4200 : 2600,
    );

    return () => window.clearTimeout(timeout);
  }, [notice, error]);

  function resetNotice() {
    setNotice(null);
    setError(null);
  }

  function notifySuccess(message: string) {
    setError(null);
    setNotice(message);
  }

  function notifyError(reason: unknown, fallback: string) {
    const message = reason instanceof Error ? reason.message : fallback;
    setNotice(null);
    setError(message);
  }

  async function handleCreateList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetNotice();
    setIsBusy(true);

    try {
      const data = await fetchApi<{ list: ListItem }>("/api/lists", {
        method: "POST",
        body: JSON.stringify({
          name: listName.trim(),
          color: listColor,
        }),
      });

      setLists((prev) => [
        ...prev,
        {
          ...data.list,
          accessRole: "OWNER",
          canEdit: true,
          isShared: false,
        },
      ]);
      setListName("");
      setTaskForm((prev) => ({
        ...prev,
        listId: data.list.id,
      }));
      setShowListCreator(false);
      notifySuccess("Lista creada.");
    } catch (createListError) {
      notifyError(createListError, "No fue posible crear la lista.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreateTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetNotice();
    setIsBusy(true);

    try {
      const data = await fetchApi<{ tag: TagItem }>("/api/tags", {
        method: "POST",
        body: JSON.stringify({
          name: tagName.trim(),
          color: tagColor,
        }),
      });
      setTags((prev) => [...prev, data.tag]);
      setTagName("");
      setTaskForm((prev) => ({
        ...prev,
        tagIds: prev.tagIds.includes(data.tag.id) ? prev.tagIds : [...prev.tagIds, data.tag.id],
      }));
      setShowTagCreator(false);
      notifySuccess("Etiqueta creada.");
    } catch (createTagError) {
      notifyError(createTagError, "No fue posible crear la etiqueta.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetNotice();
    setIsBusy(true);

    try {
      if (!canCreateInSelectedList) {
        throw new Error("Tu rol en la lista seleccionada es de solo lectura.");
      }

      const data = await fetchApi<{ task: TaskItem }>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: taskForm.title.trim(),
          description: taskForm.description.trim() || undefined,
          dueDate: toIsoDateTime(taskForm.dueDate),
          priority: taskForm.priority,
          status: taskForm.status,
          listId: taskForm.listId || null,
          tagIds: taskForm.tagIds,
        }),
      });
      setTasks((prev) => [data.task, ...prev]);
      setTaskForm(buildTaskFormState());
      notifySuccess("Tarea creada.");
    } catch (createTaskError) {
      notifyError(createTaskError, "No fue posible crear la tarea.");
    } finally {
      setIsBusy(false);
    }
  }

  async function toggleTaskCompletion(task: TaskItem) {
    resetNotice();

    if (!task.canEdit) {
      setError("Tu rol es de solo lectura en esta tarea.");
      return;
    }

    setIsBusy(true);

    try {
      const data = await fetchApi<{ task: TaskItem }>(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          isCompleted: !task.isCompleted,
        }),
      });
      setTasks((prev) => prev.map((current) => (current.id === task.id ? data.task : current)));
      notifySuccess("Estado actualizado.");
    } catch (toggleError) {
      notifyError(toggleError, "No fue posible actualizar la tarea.");
    } finally {
      setIsBusy(false);
    }
  }

  function startEditing(task: TaskItem) {
    if (!task.canEdit) {
      setError("Tu rol es de solo lectura en esta tarea.");
      return;
    }

    setEditingTaskId(task.id);
    setEditingForm(buildTaskFormState(task));
    setError(null);
    setNotice(null);
  }

  function toggleTaskDetails(task: TaskItem) {
    if (editingTaskId === task.id) {
      setEditingTaskId(null);
      return;
    }

    startEditing(task);
  }

  async function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingTaskId) {
      return;
    }

    resetNotice();
    setIsBusy(true);

    try {
      const data = await fetchApi<{ task: TaskItem }>(`/api/tasks/${editingTaskId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editingForm.title.trim(),
          description: editingForm.description.trim(),
          dueDate: toIsoDateTime(editingForm.dueDate),
          priority: editingForm.priority,
          status: editingForm.status,
          listId: editingForm.listId || null,
          tagIds: editingForm.tagIds,
        }),
      });
      setTasks((prev) =>
        prev.map((current) => (current.id === editingTaskId ? data.task : current)),
      );
      setEditingTaskId(null);
      notifySuccess("Tarea actualizada.");
    } catch (editError) {
      notifyError(editError, "No fue posible guardar los cambios.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeleteTask(task: TaskItem) {
    resetNotice();

    if (!task.canEdit) {
      setError("Tu rol es de solo lectura en esta tarea.");
      return;
    }

    setIsBusy(true);

    try {
      await fetchApi<{ ok: boolean }>(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });
      setTasks((prev) => prev.filter((item) => item.id !== task.id));
      if (editingTaskId === task.id) {
        setEditingTaskId(null);
      }
      notifySuccess("Tarea eliminada.");
    } catch (deleteError) {
      notifyError(deleteError, "No fue posible eliminar la tarea.");
    } finally {
      setIsBusy(false);
    }
  }

  function toggleFormTag(id: string, mode: "create" | "edit") {
    if (mode === "create") {
      setTaskForm((prev) => ({
        ...prev,
        tagIds: prev.tagIds.includes(id)
          ? prev.tagIds.filter((tagId) => tagId !== id)
          : [...prev.tagIds, id],
      }));
      return;
    }

    setEditingForm((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(id)
        ? prev.tagIds.filter((tagId) => tagId !== id)
        : [...prev.tagIds, id],
    }));
  }

  return (
    <section className="todo-page space-y-6">
      {error || notice ? (
        <div className="todo-toast-stack" aria-live="polite" aria-atomic="true">
          <div
            className={`todo-toast ${error ? "todo-toast--error" : "todo-toast--success"}`}
            role={error ? "alert" : "status"}
          >
            <span className="todo-toast__icon" aria-hidden>
              {error ? "!" : "✓"}
            </span>
            <div className="min-w-0">
              <p className="todo-toast__title">Todo Studio</p>
              <p className="todo-toast__message">{error ?? notice}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setNotice(null);
                setError(null);
              }}
              aria-label="Cerrar notificacion"
              className="todo-toast__close"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
                <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        aria-label="Abrir menu"
        onClick={() => setIsMobileSidebarOpen(true)}
        className="todo-mobile-toggle inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-[0_12px_24px_-18px_rgb(15_23_42/0.85)]"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
          <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </button>

      <AppShell
        sidebarWidth={isSidebarCollapsed ? "72px" : "280px"}
        showDetail={Boolean(selectedTask)}
        sidebar={
          <SidebarNav
            collapsed={isSidebarCollapsed}
            totalCount={tasks.length}
            todayCount={pendingTasks}
            lists={sidebarLists}
            tags={sidebarTags}
            onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
          />
        }
        main={
          <section className="h-full space-y-4 px-4 py-5 md:px-7 md:py-7">
            <div className="flex items-end justify-between border-b border-slate-200 pb-4">
              <h2 className="text-5xl font-black tracking-tight text-slate-900">Today</h2>
              <p className="text-3xl font-semibold text-slate-500">{pendingTasks}</p>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <span className="text-xl leading-none text-slate-500" aria-hidden>
                  +
                </span>
                <input
                  required
                  value={taskForm.title}
                  onChange={(event) =>
                    setTaskForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Add New Task"
                  className="min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-[15px] outline-none placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={isBusy || !taskForm.title.trim() || !canCreateInSelectedList}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (showTaskDetails) {
                      setShowListCreator(false);
                      setShowTagCreator(false);
                    }
                    setShowTaskDetails((prev) => !prev);
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  {showTaskDetails ? "Less" : "More"}
                </button>
              </div>

              {showTaskDetails ? (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                  <textarea
                    value={taskForm.description}
                    onChange={(event) =>
                      setTaskForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="Descripción (opcional)"
                    rows={3}
                    className="ring-primary w-full rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-sm outline-none focus:ring-2"
                  />

                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="block space-y-1 text-sm">
                      <span className="font-medium">Fecha límite</span>
                      <input
                        type="datetime-local"
                        value={taskForm.dueDate}
                        onChange={(event) =>
                          setTaskForm((prev) => ({ ...prev, dueDate: event.target.value }))
                        }
                        className="border-border ring-primary w-full rounded-xl border bg-white/95 px-3 py-2 outline-none focus:ring-2"
                      />
                    </label>
                    <label className="block space-y-1 text-sm">
                      <span className="font-medium">Prioridad</span>
                      <select
                        value={taskForm.priority}
                        onChange={(event) =>
                          setTaskForm((prev) => ({
                            ...prev,
                            priority: event.target.value as Priority,
                          }))
                        }
                        className="border-border ring-primary w-full rounded-xl border bg-white/95 px-3 py-2 outline-none focus:ring-2"
                      >
                        {priorities.map((priority) => (
                          <option key={priority} value={priority}>
                            {priority}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block space-y-1 text-sm">
                      <span className="font-medium">Estado</span>
                      <select
                        value={taskForm.status}
                        onChange={(event) =>
                          setTaskForm((prev) => ({
                            ...prev,
                            status: event.target.value as Status,
                          }))
                        }
                        className="border-border ring-primary w-full rounded-xl border bg-white/95 px-3 py-2 outline-none focus:ring-2"
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="block space-y-1 text-sm">
                    <span className="font-medium">Lista</span>
                    <select
                      value={taskForm.listId}
                      onChange={(event) =>
                        setTaskForm((prev) => ({ ...prev, listId: event.target.value }))
                      }
                      className="border-border ring-primary w-full rounded-xl border bg-white/95 px-3 py-2 outline-none focus:ring-2"
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

                  {selectedList && selectedList.canEdit === false ? (
                    <p className="bg-danger/10 text-danger rounded-lg px-3 py-2 text-xs font-semibold">
                      Esta lista está compartida en modo solo lectura para ti.
                    </p>
                  ) : null}

                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">Etiquetas</legend>
                    <div className="flex flex-wrap gap-2">
                      {tags.length === 0 ? (
                        <span className="text-muted text-sm">
                          No hay etiquetas todavía. Usa “Etiqueta rápida” para crear una.
                        </span>
                      ) : null}
                      {tags.map((tag) => {
                        const selected = taskForm.tagIds.includes(tag.id);

                        return (
                          <label
                            key={tag.id}
                            className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition ${
                              selected
                                ? "border-accent bg-accent text-white"
                                : "border-border bg-surface-strong/70 text-foreground"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleFormTag(tag.id, "create")}
                              className="sr-only"
                            />
                            {tag.name}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setShowListCreator((prev) => !prev)}
                      className="border-border/80 hover:bg-surface-strong rounded-xl border px-3 py-2 text-xs font-semibold transition"
                    >
                      {showListCreator ? "Cerrar lista rápida" : "+ Lista rápida"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTagCreator((prev) => !prev)}
                      className="border-border/80 hover:bg-surface-strong rounded-xl border px-3 py-2 text-xs font-semibold transition"
                    >
                      {showTagCreator ? "Cerrar etiqueta rápida" : "+ Etiqueta rápida"}
                    </button>
                  </div>
                </div>
              ) : null}
            </form>

            {showListCreator || showTagCreator ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {showListCreator ? (
                  <form
                    onSubmit={handleCreateList}
                    className="border-border/80 bg-surface space-y-3 rounded-xl border p-3"
                  >
                    <p className="text-sm font-bold">Crear lista</p>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input
                        required
                        value={listName}
                        onChange={(event) => setListName(event.target.value)}
                        placeholder="Ej: Personal"
                        className="border-border ring-primary w-full rounded-lg border bg-white/95 px-3 py-2 text-sm outline-none focus:ring-2"
                      />
                      <input
                        type="color"
                        value={listColor}
                        onChange={(event) => setListColor(event.target.value)}
                        className="border-border h-10 w-12 rounded-lg border bg-white p-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isBusy || !listName.trim()}
                        className="bg-primary-strong hover:bg-primary rounded-lg px-3 py-2 text-xs font-semibold text-white transition disabled:opacity-60"
                      >
                        Guardar lista
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowListCreator(false)}
                        className="border-border/80 hover:bg-surface rounded-lg border px-3 py-2 text-xs font-semibold transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : null}

                {showTagCreator ? (
                  <form
                    onSubmit={handleCreateTag}
                    className="border-border/80 bg-surface space-y-3 rounded-xl border p-3"
                  >
                    <p className="text-sm font-bold">Crear etiqueta</p>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input
                        required
                        value={tagName}
                        onChange={(event) => setTagName(event.target.value)}
                        placeholder="Ej: Reunión"
                        className="border-border ring-primary w-full rounded-lg border bg-white/95 px-3 py-2 text-sm outline-none focus:ring-2"
                      />
                      <input
                        type="color"
                        value={tagColor}
                        onChange={(event) => setTagColor(event.target.value)}
                        className="border-border h-10 w-12 rounded-lg border bg-white p-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isBusy || !tagName.trim()}
                        className="bg-accent rounded-lg px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                      >
                        Guardar etiqueta
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowTagCreator(false)}
                        className="border-border/80 hover:bg-surface rounded-lg border px-3 py-2 text-xs font-semibold transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            ) : null}

            {tasks.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                No tienes tareas aún.
              </p>
            ) : null}
            <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {tasks.map((task) => {
                const isEditing = editingTaskId === task.id;

                return (
                  <li
                    key={task.id}
                    className={`border-b border-slate-200 p-4 last:border-b-0 ${
                      isEditing
                        ? "bg-slate-50/90 shadow-[inset_3px_0_0_0_rgb(15_23_42)]"
                        : "bg-white hover:bg-slate-50/70"
                    }`}
                  >
                    <div
                      className="flex cursor-pointer items-start justify-between gap-3"
                      onClick={() => void toggleTaskCompletion(task)}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <input
                          type="checkbox"
                          aria-label={`Marcar ${task.title}`}
                          checked={task.isCompleted}
                          disabled={!task.canEdit}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => void toggleTaskCompletion(task)}
                          className="accent-success mt-1 h-4 w-4 rounded-[3px]"
                        />
                        <div className="min-w-0 text-left">
                          <p
                            className={`truncate text-[22px] leading-tight font-semibold ${
                              task.isCompleted ? "text-slate-400 line-through" : "text-slate-900"
                            }`}
                          >
                            {task.title}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            {task.dueDate ? (
                              <span>{new Date(task.dueDate).toLocaleDateString("es-ES")}</span>
                            ) : null}
                            <span>{task.priority}</span>
                            <span>{task.status}</span>
                            {task.list ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
                                <span
                                  className="h-2 w-2 rounded-[3px]"
                                  style={{ backgroundColor: task.list.color ?? "#f87171" }}
                                />
                                {task.list.name}
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5">
                                Sin lista
                              </span>
                            )}
                            {task.tags[0] ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5">
                                {task.tags[0].tag.name}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          disabled={!task.canEdit}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleTaskDetails(task);
                          }}
                          aria-label={`${isEditing ? "Cerrar" : "Abrir"} detalle de ${task.title}`}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 ${
                            isEditing ? "bg-slate-900 text-white hover:bg-slate-800" : ""
                          }`}
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                            <path
                              d={isEditing ? "m14 7-5 5 5 5" : "m10 7 5 5-5 5"}
                              stroke="currentColor"
                              strokeWidth="1.8"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {isEditing && showInlineEditForm ? (
                      <form
                        onSubmit={handleSaveEdit}
                        className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-3"
                      >
                        <input
                          required
                          value={editingForm.title}
                          onChange={(event) =>
                            setEditingForm((prev) => ({ ...prev, title: event.target.value }))
                          }
                          className="border-border ring-primary w-full rounded-lg border bg-white/95 px-3 py-2 text-sm outline-none focus:ring-2"
                        />
                        <textarea
                          rows={2}
                          value={editingForm.description}
                          onChange={(event) =>
                            setEditingForm((prev) => ({ ...prev, description: event.target.value }))
                          }
                          className="border-border ring-primary w-full rounded-lg border bg-white/95 px-3 py-2 text-sm outline-none focus:ring-2"
                        />
                        <div className="grid gap-3 md:grid-cols-3">
                          <input
                            type="datetime-local"
                            value={editingForm.dueDate}
                            onChange={(event) =>
                              setEditingForm((prev) => ({ ...prev, dueDate: event.target.value }))
                            }
                            className="border-border ring-primary rounded-lg border bg-white/95 px-3 py-2 text-sm outline-none focus:ring-2"
                          />
                          <select
                            value={editingForm.priority}
                            onChange={(event) =>
                              setEditingForm((prev) => ({
                                ...prev,
                                priority: event.target.value as Priority,
                              }))
                            }
                            className="border-border ring-primary rounded-lg border bg-white/95 px-3 py-2 text-sm outline-none focus:ring-2"
                          >
                            {priorities.map((priority) => (
                              <option key={priority} value={priority}>
                                {priority}
                              </option>
                            ))}
                          </select>
                          <select
                            value={editingForm.status}
                            onChange={(event) =>
                              setEditingForm((prev) => ({
                                ...prev,
                                status: event.target.value as Status,
                              }))
                            }
                            className="border-border ring-primary rounded-lg border bg-white/95 px-3 py-2 text-sm outline-none focus:ring-2"
                          >
                            {statuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                        <select
                          value={editingForm.listId}
                          onChange={(event) =>
                            setEditingForm((prev) => ({ ...prev, listId: event.target.value }))
                          }
                          className="border-border ring-primary w-full rounded-lg border bg-white/95 px-3 py-2 text-sm outline-none focus:ring-2"
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
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag) => {
                            const selected = editingForm.tagIds.includes(tag.id);

                            return (
                              <label
                                key={tag.id}
                                className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold ${
                                  selected
                                    ? "border-accent bg-accent text-white"
                                    : "border-border bg-surface text-foreground"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => toggleFormTag(tag.id, "edit")}
                                  className="sr-only"
                                />
                                {tag.name}
                              </label>
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={isBusy || !editingForm.title.trim()}
                            className="bg-primary-strong hover:bg-primary rounded-lg px-3 py-2 text-xs font-semibold text-white transition disabled:opacity-60"
                          >
                            Guardar cambios
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTaskId(null)}
                            className="border-border/80 hover:bg-surface rounded-lg border px-3 py-2 text-xs font-semibold transition"
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        }
        detail={
          <TaskDetailPanel
            task={selectedTask}
            form={editingForm}
            lists={lists}
            tags={tags}
            isBusy={isBusy}
            onSave={handleSaveEdit}
            onDelete={() => {
              if (selectedTask) {
                void handleDeleteTask(selectedTask);
              }
            }}
            onClose={() => setEditingTaskId(null)}
            onChange={(field, value) =>
              setEditingForm((prev) => ({
                ...prev,
                [field]: value,
              }))
            }
            onToggleTag={(tagId) => toggleFormTag(tagId, "edit")}
          />
        }
      />

      <div className="todo-mobile-overlay" data-open={isMobileSidebarOpen}>
        <button
          type="button"
          aria-label="Cerrar menu"
          className="todo-mobile-backdrop"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
        <aside className="todo-mobile-drawer" role="dialog" aria-modal="true" aria-label="Menu">
          <SidebarNav
            collapsed={false}
            mobile
            totalCount={tasks.length}
            todayCount={pendingTasks}
            lists={sidebarLists}
            tags={sidebarTags}
            onToggle={() => setIsMobileSidebarOpen(false)}
          />
        </aside>
      </div>

      <div className="todo-detail-overlay" data-open={Boolean(selectedTask)}>
        <button
          type="button"
          aria-label="Cerrar detalle"
          className="todo-detail-backdrop"
          onClick={() => setEditingTaskId(null)}
        />
        <aside
          className="todo-detail-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Detalle de tarea"
        >
          <TaskDetailPanel
            task={selectedTask}
            form={editingForm}
            lists={lists}
            tags={tags}
            isBusy={isBusy}
            onSave={handleSaveEdit}
            onDelete={() => {
              if (selectedTask) {
                void handleDeleteTask(selectedTask);
              }
            }}
            onClose={() => setEditingTaskId(null)}
            onChange={(field, value) =>
              setEditingForm((prev) => ({
                ...prev,
                [field]: value,
              }))
            }
            onToggleTag={(tagId) => toggleFormTag(tagId, "edit")}
          />
        </aside>
      </div>
    </section>
  );
}
