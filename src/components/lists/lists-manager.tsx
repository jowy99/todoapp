"use client";

import { FormEvent, useMemo, useState } from "react";
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

type ListsManagerProps = {
  initialLists: ListItem[];
};

export function ListsManager({ initialLists }: ListsManagerProps) {
  const [lists, setLists] = useState(initialLists);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState("#2563eb");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const totalTasks = useMemo(
    () => lists.reduce((sum, list) => sum + list._count.tasks, 0),
    [lists],
  );

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
      setNotice("Lista creada.");
    } catch (createError) {
      onError(createError, "No fue posible crear la lista.");
    } finally {
      setIsBusy(false);
    }
  }

  function beginEdit(list: ListItem) {
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
      setNotice("Lista eliminada.");
    } catch (deleteError) {
      onError(deleteError, "No fue posible eliminar la lista.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
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
        <p className="ui-kicker">
          Listas / Carpetas
        </p>
        <h1 className="ui-title-xl mt-2">
          Organización personalizada
        </h1>
        <p className="ui-subtle mt-2 max-w-2xl">
          Crea listas por contexto y aplica color para clasificar tareas con más claridad.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
          <span className="ui-chip font-semibold shadow-sm">
            Listas: {lists.length}
          </span>
          <span className="ui-chip bg-primary/10 text-primary-strong font-semibold shadow-sm">
            Tareas asignadas: {totalTasks}
          </span>
          <span className="ui-chip bg-accent/10 text-slate-700 font-semibold shadow-sm">
            Gestión visual por color
          </span>
        </div>
      </header>

      {error ? (
        <p className="ui-alert ui-alert--danger">{error}</p>
      ) : null}
      {notice ? (
        <p className="ui-alert ui-alert--success">{notice}</p>
      ) : null}

      <form onSubmit={handleCreateList} className="ui-card space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="ui-kicker ui-kicker--muted">Nueva lista</p>
            <h2 className="ui-title-lg mt-1">Crear lista</h2>
          </div>
          <span className="ui-chip ui-chip--meta bg-primary/8 text-primary-strong">
            Organización rápida
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
          <label className="block min-w-0 space-y-1">
            <span className="text-muted text-[11px] font-semibold tracking-[0.09em] uppercase">
              Nombre
            </span>
            <Input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej: Trabajo profundo"
              className="ui-field w-full"
            />
          </label>

          <label className="border-border bg-surface/70 inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold">
            <span>Color</span>
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-9 w-10 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
            />
          </label>

          <button
            type="submit"
            disabled={isBusy || !name.trim()}
            className="ui-btn ui-btn--primary sm:min-h-11"
          >
            Guardar lista
          </button>
        </div>
      </form>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="ui-kicker ui-kicker--muted">Catálogo</p>
            <h2 className="ui-title-lg mt-1">Listas existentes</h2>
          </div>
          <span className="ui-pill">{lists.length}</span>
        </div>
        {lists.length === 0 ? (
          <p className="ui-empty">No hay listas creadas.</p>
        ) : null}
        <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {lists.map((list) => {
            const isEditing = editingId === list.id;

            return (
              <li
                key={list.id}
                className="ui-card group p-3 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-[0_22px_30px_-26px_rgb(15_23_42/0.85)] sm:p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-1 inline-block h-4 w-4 rounded-md border border-slate-300 shadow-inner"
                      style={{ backgroundColor: list.color ?? "#94a3b8" }}
                    />
                    <div>
                      <p className="text-[0.95rem] font-semibold text-slate-900">{list.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="ui-chip ui-chip--meta">{list._count.tasks} tareas</span>
                        <span className="text-slate-500">Editable</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
                    <button
                      type="button"
                      onClick={() => beginEdit(list)}
                      className="ui-btn ui-btn--secondary ui-btn--compact min-h-10 flex-1 text-xs sm:flex-none"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteList(list.id)}
                      className="ui-btn ui-btn--destructive ui-btn--compact min-h-10 flex-1 text-xs sm:flex-none"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <form
                    onSubmit={handleUpdateList}
                    className="border-border bg-surface/80 mt-4 space-y-3 rounded-2xl border p-3"
                  >
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                      <label className="block min-w-0 space-y-1">
                        <span className="text-muted text-[11px] font-semibold tracking-[0.09em] uppercase">
                          Nombre
                        </span>
                        <Input
                          required
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          className="ui-field w-full"
                        />
                      </label>
                      <label className="border-border bg-surface/70 inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold">
                        <span>Color</span>
                        <input
                          type="color"
                          value={editingColor}
                          onChange={(event) => setEditingColor(event.target.value)}
                          className="h-9 w-10 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={isBusy || !editingName.trim()}
                        className="ui-btn ui-btn--primary ui-btn--compact min-h-10 flex-1 text-xs sm:flex-none"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="ui-btn ui-btn--secondary ui-btn--compact min-h-10 flex-1 text-xs sm:flex-none"
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
    </section>
  );
}
