"use client";

import { FormEvent, useMemo, useState } from "react";
import { fetchApi } from "@/lib/client-api";

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
    <section className="space-y-4 sm:space-y-6">
      <header className="border-border/80 bg-surface/90 relative overflow-hidden rounded-[1.4rem] border p-4 shadow-[0_20px_50px_-34px_rgb(15_23_42/0.85)] backdrop-blur sm:rounded-[1.75rem] sm:p-6">
        <div
          aria-hidden
          className="bg-primary/15 pointer-events-none absolute -top-14 right-8 h-32 w-32 rounded-full blur-2xl"
        />
        <div
          aria-hidden
          className="bg-accent/15 pointer-events-none absolute -bottom-14 left-10 h-32 w-32 rounded-full blur-2xl"
        />
        <p className="text-primary-strong text-sm font-semibold tracking-wide uppercase">
          Listas / Carpetas
        </p>
        <h1 className="text-foreground mt-2 text-2xl font-black tracking-tight sm:text-3xl">
          Organización personalizada
        </h1>
        <p className="text-muted mt-2 text-sm">
          Crea listas por contexto y aplica color para clasificar tareas con más claridad.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="bg-surface-strong text-foreground rounded-full px-3 py-1 font-semibold">
            Listas: {lists.length}
          </span>
          <span className="bg-primary/10 text-primary-strong rounded-full px-3 py-1 font-semibold">
            Tareas asignadas: {totalTasks}
          </span>
        </div>
      </header>

      {error ? (
        <p className="bg-danger/10 text-danger rounded-xl px-4 py-3 text-sm font-medium">{error}</p>
      ) : null}
      {notice ? (
        <p className="bg-success/10 text-success rounded-xl px-4 py-3 text-sm font-medium">
          {notice}
        </p>
      ) : null}

      <form
        onSubmit={handleCreateList}
        className="border-border/80 bg-surface/90 space-y-3 rounded-2xl border p-4 shadow-[0_16px_32px_-24px_rgb(15_23_42/0.75)] sm:p-5"
      >
        <h2 className="text-lg font-bold">Crear lista nueva</h2>
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ej: Trabajo profundo"
          className="border-border ring-primary w-full rounded-xl border bg-white/95 px-3 py-2 text-sm outline-none focus:ring-2"
        />
        <label className="inline-flex items-center gap-2 text-sm font-medium">
          Color
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="border-border h-10 w-12 rounded-lg border bg-white p-1"
          />
        </label>
        <div>
          <button
            type="submit"
            disabled={isBusy || !name.trim()}
            className="bg-primary-strong hover:bg-primary inline-flex min-h-11 items-center rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
          >
            Guardar lista
          </button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="text-xl font-black tracking-tight">Listas existentes</h2>
        {lists.length === 0 ? (
          <p className="border-border/80 bg-surface/70 text-muted rounded-xl border px-4 py-3 text-sm">
            No hay listas creadas.
          </p>
        ) : null}
        <ul className="space-y-3">
          {lists.map((list) => {
            const isEditing = editingId === list.id;

            return (
              <li
                key={list.id}
                className="border-border/80 bg-surface/90 rounded-2xl border p-3 shadow-[0_14px_26px_-24px_rgb(15_23_42/0.8)] sm:p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-1 inline-block h-4 w-4 rounded-full border border-slate-300"
                      style={{ backgroundColor: list.color ?? "#94a3b8" }}
                    />
                    <div>
                      <p className="text-sm font-semibold">{list.name}</p>
                      <p className="text-muted text-xs">{list._count.tasks} tareas</p>
                    </div>
                  </div>
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
                    <button
                      type="button"
                      onClick={() => beginEdit(list)}
                      className="border-border/80 hover:bg-surface-strong inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition sm:min-h-9 sm:flex-none"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteList(list.id)}
                      className="border-danger/30 text-danger hover:bg-danger/10 inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition sm:min-h-9 sm:flex-none"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <form
                    onSubmit={handleUpdateList}
                    className="border-border/80 bg-surface-strong/60 mt-4 space-y-3 rounded-xl border p-3"
                  >
                    <input
                      required
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      className="border-border ring-primary w-full rounded-lg border bg-white/95 px-3 py-2 text-sm outline-none focus:ring-2"
                    />
                    <label className="inline-flex items-center gap-2 text-sm font-medium">
                      Color
                      <input
                        type="color"
                        value={editingColor}
                        onChange={(event) => setEditingColor(event.target.value)}
                        className="border-border h-10 w-12 rounded-lg border bg-white p-1"
                      />
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isBusy || !editingName.trim()}
                        className="bg-primary-strong hover:bg-primary inline-flex min-h-10 items-center rounded-lg px-3 py-2 text-xs font-semibold text-white transition disabled:opacity-60"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="border-border/80 hover:bg-surface inline-flex min-h-10 items-center rounded-lg border px-3 py-2 text-xs font-semibold transition"
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
