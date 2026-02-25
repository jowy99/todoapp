"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fetchApi } from "@/lib/client-api";
import { Input } from "@/components/ui/input";

type ListItem = {
  id: string;
  name: string;
  color: string | null;
  _count: {
    tasks: number;
  };
};

type ListTaskItem = {
  id: string;
  title: string;
  dueDate: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  isCompleted: boolean;
};

type ListsManagerProps = {
  initialLists: ListItem[];
};

function priorityDotClass(priority: ListTaskItem["priority"]) {
  if (priority === "URGENT") {
    return "bg-rose-500";
  }
  if (priority === "HIGH") {
    return "bg-amber-500";
  }
  if (priority === "MEDIUM") {
    return "bg-cyan-500";
  }
  return "bg-slate-500";
}

export function ListsManager({ initialLists }: ListsManagerProps) {
  const [lists, setLists] = useState(initialLists);
  const [searchQuery, setSearchQuery] = useState("");
  const [name, setName] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDesktopDialogViewport, setIsDesktopDialogViewport] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState("#2563eb");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [previewListId, setPreviewListId] = useState<string | null>(null);
  const [tasksByListId, setTasksByListId] = useState<Record<string, ListTaskItem[]>>({});
  const [loadingTasksByListId, setLoadingTasksByListId] = useState<Record<string, boolean>>({});
  const [tasksErrorByListId, setTasksErrorByListId] = useState<Record<string, string>>({});
  const createNameInputRef = useRef<HTMLInputElement | null>(null);
  const editNameInputRef = useRef<HTMLInputElement | null>(null);

  const totalTasks = useMemo(
    () => lists.reduce((sum, list) => sum + list._count.tasks, 0),
    [lists],
  );
  const filteredLists = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return lists;
    }

    return lists.filter((list) => list.name.toLowerCase().includes(query));
  }, [lists, searchQuery]);
  const editingList = useMemo(
    () => (editingId ? lists.find((list) => list.id === editingId) ?? null : null),
    [editingId, lists],
  );
  const previewList = useMemo(
    () => (previewListId ? lists.find((list) => list.id === previewListId) ?? null : null),
    [previewListId, lists],
  );
  const previewTasks = previewListId ? tasksByListId[previewListId] ?? [] : [];
  const isPreviewLoading = previewListId ? Boolean(loadingTasksByListId[previewListId]) : false;
  const previewError = previewListId ? tasksErrorByListId[previewListId] ?? null : null;
  const taskDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [],
  );

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const syncViewport = () => {
      setIsDesktopDialogViewport(desktopQuery.matches);
    };

    syncViewport();
    desktopQuery.addEventListener("change", syncViewport);
    return () => desktopQuery.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (!isCreateOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      createNameInputRef.current?.focus();
    });

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCreateOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeydown);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeydown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isCreateOpen]);

  useEffect(() => {
    if (!editingId) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      editNameInputRef.current?.focus();
    });

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setEditingId(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeydown);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeydown);
      document.body.style.overflow = previousOverflow;
    };
  }, [editingId]);

  useEffect(() => {
    if (!openMenuId) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-list-menu]")) {
        setOpenMenuId(null);
      }
    };

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeydown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeydown);
    };
  }, [openMenuId]);

  function clearMessages() {
    setNotice(null);
    setError(null);
  }

  function onError(reason: unknown, fallback: string) {
    setNotice(null);
    setError(reason instanceof Error ? reason.message : fallback);
  }

  async function handleCreateList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();
    setIsBusy(true);

    try {
      const data = await fetchApi<{ list: ListItem }>("/api/lists", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          color,
        }),
      });
      setLists((prev) => [...prev, data.list]);
      setName("");
      setColor("#2563eb");
      setIsCreateOpen(false);
      setNotice("Lista creada.");
    } catch (createError) {
      onError(createError, "No fue posible crear la lista.");
    } finally {
      setIsBusy(false);
    }
  }

  function beginEdit(list: ListItem) {
    setOpenMenuId(null);
    setIsCreateOpen(false);
    setEditingId(list.id);
    setEditingName(list.name);
    setEditingColor(list.color ?? "#2563eb");
    clearMessages();
  }

  async function handleUpdateList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingId) {
      return;
    }

    clearMessages();
    setIsBusy(true);

    try {
      const data = await fetchApi<{ list: ListItem }>(`/api/lists/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editingName.trim(),
          color: editingColor,
        }),
      });
      setLists((prev) => prev.map((list) => (list.id === editingId ? data.list : list)));
      setEditingId(null);
      setNotice("Lista actualizada.");
    } catch (updateError) {
      onError(updateError, "No fue posible actualizar la lista.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeleteList(listId: string) {
    const confirmed = window.confirm("¿Eliminar esta lista? Las tareas quedarán sin lista.");

    if (!confirmed) {
      return;
    }

    clearMessages();
    setIsBusy(true);

    try {
      await fetchApi<{ ok: boolean }>(`/api/lists/${listId}`, {
        method: "DELETE",
      });
      setLists((prev) => prev.filter((list) => list.id !== listId));
      if (editingId === listId) {
        setEditingId(null);
      }
      if (openMenuId === listId) {
        setOpenMenuId(null);
      }
      if (previewListId === listId) {
        setPreviewListId(null);
      }
      setTasksByListId((prev) => {
        const next = { ...prev };
        delete next[listId];
        return next;
      });
      setTasksErrorByListId((prev) => {
        const next = { ...prev };
        delete next[listId];
        return next;
      });
      setLoadingTasksByListId((prev) => {
        const next = { ...prev };
        delete next[listId];
        return next;
      });
      setNotice("Lista eliminada.");
    } catch (deleteError) {
      onError(deleteError, "No fue posible eliminar la lista.");
    } finally {
      setIsBusy(false);
    }
  }

  function closeCreateDialog() {
    setIsCreateOpen(false);
  }

  function openCreateDialog() {
    setEditingId(null);
    setOpenMenuId(null);
    setIsCreateOpen(true);
  }

  function closeEditDialog() {
    setEditingId(null);
  }

  async function openListPreview(listId: string) {
    if (previewListId === listId) {
      setPreviewListId(null);
      return;
    }

    setOpenMenuId(null);
    setPreviewListId(listId);

    if (tasksByListId[listId]) {
      return;
    }

    setLoadingTasksByListId((prev) => ({ ...prev, [listId]: true }));
    setTasksErrorByListId((prev) => {
      const next = { ...prev };
      delete next[listId];
      return next;
    });

    try {
      const data = await fetchApi<{ tasks: ListTaskItem[] }>(
        `/api/tasks?listId=${encodeURIComponent(listId)}`,
      );
      setTasksByListId((prev) => ({ ...prev, [listId]: data.tasks }));
    } catch (loadError) {
      setTasksErrorByListId((prev) => ({
        ...prev,
        [listId]: loadError instanceof Error ? loadError.message : "No fue posible cargar las tareas.",
      }));
    } finally {
      setLoadingTasksByListId((prev) => ({ ...prev, [listId]: false }));
    }
  }

  const createListModal = isCreateOpen ? (
    <div
      className={`fixed inset-0 z-[220] ${isDesktopDialogViewport ? "flex items-center justify-center p-4" : ""}`}
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close create list"
        className="ui-overlay-fade-in absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={closeCreateDialog}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Create new list"
        className={
          isDesktopDialogViewport
            ? "ui-dialog-scale-in relative z-[1] flex w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-[0_34px_80px_-38px_rgb(15_23_42/0.72)] backdrop-blur-sm"
            : "ui-sheet-in-up sm-ui-sheet-in-right absolute inset-x-0 bottom-0 z-[1] w-full rounded-t-3xl border border-slate-200/80 bg-white/95 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_22px_56px_-36px_rgb(15_23_42/0.72)] backdrop-blur-sm sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:max-w-md sm:rounded-none sm:border-l sm:border-t-0"
        }
      >
        <form onSubmit={handleCreateList} className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-black/10 px-5 py-4 sm:px-6 sm:py-5">
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.12em] text-slate-500 uppercase">New list</p>
              <p className="truncate text-sm font-semibold text-slate-800">Create a new workspace list</p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={closeCreateDialog}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white/80 text-slate-600 transition-colors hover:bg-slate-100"
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

          <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
            <label className="block min-w-0 space-y-1.5">
              <span className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">Name</span>
              <Input
                ref={createNameInputRef}
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Example: Deep Work"
                className="h-11"
              />
            </label>

            <label className="border-border bg-surface/70 inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm font-semibold">
              <span>Color</span>
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-4 w-4 rounded-full border border-black/10 shadow-inner"
                  style={{ backgroundColor: color }}
                />
                <input
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  className="h-9 w-10 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                />
              </span>
            </label>
          </div>

          <div className="border-t border-black/10 px-5 py-4 sm:px-6 sm:py-5">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={closeCreateDialog}
                className="ui-btn ui-btn--secondary h-11 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isBusy || !name.trim()}
                className="ui-btn ui-btn--primary h-11 rounded-xl disabled:opacity-60"
              >
                {isBusy ? "Creating..." : "Create list"}
              </button>
            </div>
          </div>
        </form>
      </aside>
    </div>
  ) : null;

  const editListModal = editingId ? (
    <div
      className={`fixed inset-0 z-[220] ${isDesktopDialogViewport ? "flex items-center justify-center p-4" : ""}`}
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close edit list"
        className="ui-overlay-fade-in absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={closeEditDialog}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Edit list"
        className={
          isDesktopDialogViewport
            ? "ui-dialog-scale-in relative z-[1] flex w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-[0_34px_80px_-38px_rgb(15_23_42/0.72)] backdrop-blur-sm"
            : "ui-sheet-in-up sm-ui-sheet-in-right absolute inset-x-0 bottom-0 z-[1] w-full rounded-t-3xl border border-slate-200/80 bg-white/95 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_22px_56px_-36px_rgb(15_23_42/0.72)] backdrop-blur-sm sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:max-w-md sm:rounded-none sm:border-l sm:border-t-0"
        }
      >
        <form onSubmit={handleUpdateList} className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-black/10 px-5 py-4 sm:px-6 sm:py-5">
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.12em] text-slate-500 uppercase">Edit list</p>
              <p className="truncate text-sm font-semibold text-slate-800">
                {editingList?.name ?? "Update selected list"}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={closeEditDialog}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white/80 text-slate-600 transition-colors hover:bg-slate-100"
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

          <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
            <label className="block min-w-0 space-y-1.5">
              <span className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">Name</span>
              <Input
                ref={editNameInputRef}
                required
                value={editingName}
                onChange={(event) => setEditingName(event.target.value)}
                placeholder="List name"
                className="h-11"
              />
            </label>

            <label className="border-border bg-surface/70 inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm font-semibold">
              <span>Color</span>
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-4 w-4 rounded-full border border-black/10 shadow-inner"
                  style={{ backgroundColor: editingColor }}
                />
                <input
                  type="color"
                  value={editingColor}
                  onChange={(event) => setEditingColor(event.target.value)}
                  className="h-9 w-10 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                />
              </span>
            </label>
          </div>

          <div className="border-t border-black/10 px-5 py-4 sm:px-6 sm:py-5">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={closeEditDialog}
                className="ui-btn ui-btn--secondary h-11 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isBusy || !editingName.trim()}
                className="ui-btn ui-btn--primary h-11 rounded-xl disabled:opacity-60"
              >
                {isBusy ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      </aside>
    </div>
  ) : null;

  return (
    <>
      <section className="min-w-0 space-y-5 sm:space-y-6">
        <header className="ui-card ui-card--hero relative overflow-hidden p-5 sm:p-6">
          <div
            aria-hidden
            className="bg-primary/15 pointer-events-none absolute -top-14 right-8 h-32 w-32 rounded-full blur-2xl"
          />
          <div
            aria-hidden
            className="bg-accent/15 pointer-events-none absolute -bottom-14 left-10 h-32 w-32 rounded-full blur-2xl"
          />
          <p className="ui-kicker">Listas / Carpetas</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="ui-title-xl">Organización personalizada</h1>
              <p className="ui-subtle mt-2 max-w-2xl">
                Crea listas por contexto y aplica color para clasificar tareas con más claridad.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateDialog}
              className="ui-btn ui-btn--primary inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold sm:w-auto"
            >
              + New list
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
            <span className="ui-chip font-semibold shadow-sm">Listas: {lists.length}</span>
            <span className="ui-chip bg-primary/10 text-primary-strong font-semibold shadow-sm">
              Tareas asignadas: {totalTasks}
            </span>
            <span className="ui-chip bg-accent/10 text-slate-700 font-semibold shadow-sm">
              Gestión visual por color
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative block min-w-0 sm:max-w-sm">
              <span className="sr-only">Buscar listas</span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search lists..."
                className="h-11 w-full rounded-xl border border-black/10 bg-white/80 px-3 text-sm font-medium text-slate-800 transition-colors duration-200 ease-out placeholder:text-slate-400 focus:border-black/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40"
              />
            </label>
            <p className="text-xs font-medium text-slate-500">
              {filteredLists.length} de {lists.length} visibles
            </p>
          </div>
        </header>

        {error ? <p className="ui-alert ui-alert--danger">{error}</p> : null}
        {notice ? <p className="ui-alert ui-alert--success">{notice}</p> : null}

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="ui-kicker ui-kicker--muted">Catálogo</p>
              <h2 className="ui-title-lg mt-1">Listas existentes</h2>
            </div>
            <span className="ui-pill">{filteredLists.length}</span>
          </div>
          {lists.length === 0 ? <p className="ui-empty">No hay listas creadas.</p> : null}
          {lists.length > 0 && filteredLists.length === 0 ? (
            <p className="ui-empty">No hay resultados para “{searchQuery.trim()}”.</p>
          ) : null}

          {previewList ? (
            <section className="rounded-2xl border border-black/10 bg-white/90 p-3 shadow-[0_16px_28px_-24px_rgb(15_23_42/0.65)] sm:p-4">
              <div className="flex items-start justify-between gap-3 border-b border-black/10 pb-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-[0.11em] text-slate-500 uppercase">Tasks in list</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block h-2.5 w-2.5 rounded-full border border-slate-300 shadow-inner"
                      style={{ backgroundColor: previewList.color ?? "#94a3b8" }}
                    />
                    <p className="truncate text-sm font-semibold text-slate-900">{previewList.name}</p>
                    <span className="inline-flex min-h-5 items-center rounded-full border border-black/10 bg-white px-2 text-[10px] font-semibold text-slate-600">
                      {previewList._count.tasks} tasks
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewListId(null)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white/80 text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40"
                  aria-label="Close task preview"
                >
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden>
                    <path d="m6 6 8 8m0-8-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div className="mt-3">
                {isPreviewLoading ? (
                  <p className="px-1 py-1 text-xs font-medium text-slate-500">Cargando tareas...</p>
                ) : previewError ? (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-700">
                    {previewError}
                  </p>
                ) : previewTasks.length === 0 ? (
                  <p className="px-1 py-1 text-xs font-medium text-slate-500">Esta lista no tiene tareas.</p>
                ) : (
                  <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                    {previewTasks.map((task) => (
                      <li
                        key={task.id}
                        className="flex items-center gap-2 rounded-lg border border-black/10 bg-white/85 px-2.5 py-2"
                      >
                        <span
                          aria-hidden
                          className={`h-2 w-2 shrink-0 rounded-full ${priorityDotClass(task.priority)}`}
                        />
                        <p
                          className={`min-w-0 flex-1 truncate text-sm font-medium text-slate-800 ${
                            task.isCompleted ? "text-slate-500 line-through" : ""
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.dueDate ? (
                          <span className="shrink-0 text-[11px] font-medium tabular-nums text-slate-500">
                            {taskDateFormatter.format(new Date(task.dueDate))}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ) : null}

          <ul className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredLists.map((list) => {
              const isMenuOpen = openMenuId === list.id;

              return (
                <li
                  key={list.id}
                  className={`ui-card group relative overflow-visible rounded-2xl border border-black/10 bg-white/85 p-4 text-left transition-all duration-200 ease-out hover:-translate-y-[1px] hover:border-black/20 hover:shadow-[0_22px_30px_-26px_rgb(15_23_42/0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15 ${
                    isMenuOpen ? "z-40" : "z-0"
                  } ${previewListId === list.id ? "ring-2 ring-black/10" : ""} cursor-pointer`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      aria-label={`Show tasks for ${list.name}`}
                      aria-expanded={previewListId === list.id}
                      onClick={() => {
                        void openListPreview(list.id);
                      }}
                      className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40"
                    >
                      <span
                        aria-hidden
                        className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full border border-slate-300 shadow-inner"
                        style={{ backgroundColor: list.color ?? "#94a3b8" }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[0.95rem] font-semibold text-slate-900">{list.name}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span className="inline-flex min-h-6 items-center rounded-full border border-black/10 bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                            {list._count.tasks} tasks
                          </span>
                          <span className="text-[11px] font-medium text-slate-500">Editable</span>
                        </div>
                      </div>
                    </button>

                    <div className="relative" data-list-menu>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenMenuId((prev) => (prev === list.id ? null : list.id));
                        }}
                        aria-label={`Open actions for ${list.name}`}
                        aria-haspopup="menu"
                        aria-expanded={isMenuOpen}
                        aria-controls={`list-menu-${list.id}`}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white/75 text-slate-600 transition-all duration-200 ease-out hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40"
                      >
                        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden>
                          <circle cx="4" cy="10" r="1.5" fill="currentColor" />
                          <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                          <circle cx="16" cy="10" r="1.5" fill="currentColor" />
                        </svg>
                      </button>

                      {isMenuOpen ? (
                        <div
                          id={`list-menu-${list.id}`}
                          role="menu"
                          onClick={(event) => event.stopPropagation()}
                          className="absolute right-0 top-11 z-50 min-w-[150px] rounded-xl border border-black/10 bg-white/95 p-1.5 shadow-[0_16px_36px_-22px_rgb(15_23_42/0.72)] backdrop-blur-sm"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={(event) => {
                              event.stopPropagation();
                              beginEdit(list);
                            }}
                            className="inline-flex h-10 w-full items-center rounded-lg px-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenMenuId(null);
                              void handleDeleteList(list.id);
                            }}
                            className="inline-flex h-10 w-full items-center rounded-lg px-2.5 text-left text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </section>

      {createListModal && typeof document !== "undefined"
        ? createPortal(createListModal, document.body)
        : null}
      {editListModal && typeof document !== "undefined"
        ? createPortal(editListModal, document.body)
        : null}
    </>
  );
}
