"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/client-api";

type Role = "VIEWER" | "EDITOR";

type UserPreview = {
  id: string;
  email: string;
  displayName: string | null;
};

type OwnedListCollaborator = {
  id: string;
  role: Role;
  user: UserPreview;
};

type OwnedListItem = {
  id: string;
  name: string;
  color: string | null;
  _count: {
    tasks: number;
    collaborators: number;
  };
  collaborators: OwnedListCollaborator[];
};

type SharedListItem = {
  id: string;
  name: string;
  color: string | null;
  myRole: Role;
  owner: UserPreview;
  _count: {
    tasks: number;
  };
};

type SharedTaskItem = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  isCompleted: boolean;
  canEdit: boolean;
  accessRole: "OWNER" | Role;
  list: {
    id: string;
    name: string;
    owner: UserPreview;
  };
};

type TaskComment = {
  id: string;
  body: string;
  createdAt: string;
  author: UserPreview;
};

type TaskActivity = {
  id: string;
  message: string;
  createdAt: string;
  type: string;
  actor: UserPreview | null;
};

type CollaborationHubProps = {
  initialOwnedLists: OwnedListItem[];
  initialSharedLists: SharedListItem[];
  initialSharedTasks: SharedTaskItem[];
};

function displayName(user: UserPreview) {
  return user.displayName?.trim() || user.email;
}

export function CollaborationHub({
  initialOwnedLists,
  initialSharedLists,
  initialSharedTasks,
}: CollaborationHubProps) {
  const [ownedLists, setOwnedLists] = useState(initialOwnedLists);
  const [sharedLists] = useState(initialSharedLists);
  const [sharedTasks, setSharedTasks] = useState(initialSharedTasks);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const [inviteEmail, setInviteEmail] = useState<Record<string, string>>({});
  const [inviteRole, setInviteRole] = useState<Record<string, Role>>({});
  const [selectedTaskId, setSelectedTaskId] = useState<string>(initialSharedTasks[0]?.id ?? "");
  const [commentInput, setCommentInput] = useState("");
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [activity, setActivity] = useState<TaskActivity[]>([]);
  const [isLoadingStreams, setIsLoadingStreams] = useState(false);

  const selectedTask = useMemo(
    () => sharedTasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, sharedTasks],
  );

  function clearMessages() {
    setNotice(null);
    setError(null);
  }

  function onError(reason: unknown, fallback: string) {
    setNotice(null);
    setError(reason instanceof Error ? reason.message : fallback);
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>, listId: string) {
    event.preventDefault();
    clearMessages();
    setIsBusy(true);

    try {
      const email = inviteEmail[listId]?.trim();

      if (!email) {
        throw new Error("Debes indicar un email.");
      }

      const role = inviteRole[listId] ?? "VIEWER";

      const data = await fetchApi<{
        collaborator: {
          id: string;
          role: Role;
          user: UserPreview;
        };
      }>(`/api/collaboration/lists/${listId}/members`, {
        method: "POST",
        body: JSON.stringify({ email, role }),
      });

      setOwnedLists((prev) =>
        prev.map((list) => {
          if (list.id !== listId) {
            return list;
          }

          const existingIndex = list.collaborators.findIndex(
            (member) => member.user.id === data.collaborator.user.id,
          );

          if (existingIndex >= 0) {
            const nextCollaborators = [...list.collaborators];
            nextCollaborators[existingIndex] = data.collaborator;
            return {
              ...list,
              collaborators: nextCollaborators,
            };
          }

          return {
            ...list,
            collaborators: [...list.collaborators, data.collaborator],
            _count: {
              ...list._count,
              collaborators: list._count.collaborators + 1,
            },
          };
        }),
      );

      setInviteEmail((prev) => ({ ...prev, [listId]: "" }));
      setNotice("Colaborador añadido.");
    } catch (inviteError) {
      onError(inviteError, "No fue posible invitar al colaborador.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRoleChange(listId: string, memberId: string, role: Role) {
    clearMessages();
    setIsBusy(true);

    try {
      const data = await fetchApi<{
        collaborator: {
          id: string;
          role: Role;
          user: UserPreview;
        };
      }>(`/api/collaboration/lists/${listId}/members/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });

      setOwnedLists((prev) =>
        prev.map((list) => {
          if (list.id !== listId) {
            return list;
          }

          return {
            ...list,
            collaborators: list.collaborators.map((member) =>
              member.id === memberId ? { ...member, role: data.collaborator.role } : member,
            ),
          };
        }),
      );

      setNotice("Rol actualizado.");
    } catch (roleError) {
      onError(roleError, "No fue posible actualizar el rol.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRemoveCollaborator(listId: string, memberId: string) {
    const confirmed = window.confirm("¿Quitar acceso a este colaborador?");

    if (!confirmed) {
      return;
    }

    clearMessages();
    setIsBusy(true);

    try {
      await fetchApi<{ ok: boolean }>(`/api/collaboration/lists/${listId}/members/${memberId}`, {
        method: "DELETE",
      });

      setOwnedLists((prev) =>
        prev.map((list) => {
          if (list.id !== listId) {
            return list;
          }

          return {
            ...list,
            collaborators: list.collaborators.filter((member) => member.id !== memberId),
            _count: {
              ...list._count,
              collaborators: Math.max(0, list._count.collaborators - 1),
            },
          };
        }),
      );

      setNotice("Colaborador eliminado.");
    } catch (removeError) {
      onError(removeError, "No fue posible quitar el colaborador.");
    } finally {
      setIsBusy(false);
    }
  }

  const loadTaskStreams = useCallback(async (taskId: string) => {
    if (!taskId) {
      setComments([]);
      setActivity([]);
      return;
    }

    setIsLoadingStreams(true);

    try {
      const [commentsData, activityData] = await Promise.all([
        fetchApi<{ comments: TaskComment[] }>(`/api/tasks/${taskId}/comments`),
        fetchApi<{ activity: TaskActivity[] }>(`/api/tasks/${taskId}/activity`),
      ]);

      setComments(commentsData.comments);
      setActivity(activityData.activity);
    } catch (streamError) {
      onError(streamError, "No fue posible cargar comentarios o actividad.");
    } finally {
      setIsLoadingStreams(false);
    }
  }, []);

  async function handleAddComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTaskId) {
      return;
    }

    clearMessages();
    setIsBusy(true);

    try {
      const body = commentInput.trim();

      if (!body) {
        throw new Error("Escribe un comentario antes de enviar.");
      }

      await fetchApi<{ comment: TaskComment }>(`/api/tasks/${selectedTaskId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });

      setCommentInput("");
      setNotice("Comentario añadido.");
      await loadTaskStreams(selectedTaskId);
    } catch (commentError) {
      onError(commentError, "No fue posible añadir el comentario.");
    } finally {
      setIsBusy(false);
    }
  }

  async function toggleTaskStatus(task: SharedTaskItem) {
    if (!task.canEdit) {
      return;
    }

    clearMessages();
    setIsBusy(true);

    try {
      const data = await fetchApi<{ task: SharedTaskItem }>(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          isCompleted: !task.isCompleted,
        }),
      });

      setSharedTasks((prev) => prev.map((item) => (item.id === task.id ? data.task : item)));
      setNotice("Estado de tarea actualizado.");
      await loadTaskStreams(task.id);
    } catch (toggleError) {
      onError(toggleError, "No fue posible actualizar la tarea.");
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    void loadTaskStreams(selectedTaskId);
  }, [loadTaskStreams, selectedTaskId]);

  return (
    <section className="space-y-6">
      <header className="border-border/80 bg-surface/90 relative overflow-hidden rounded-[1.75rem] border p-6 shadow-[0_20px_50px_-34px_rgb(15_23_42/0.85)] backdrop-blur">
        <div
          aria-hidden
          className="bg-primary/14 pointer-events-none absolute -top-14 right-10 h-36 w-36 rounded-full blur-2xl"
        />
        <div
          aria-hidden
          className="bg-accent/16 pointer-events-none absolute -bottom-14 left-8 h-32 w-32 rounded-full blur-2xl"
        />
        <p className="text-primary-strong text-sm font-semibold tracking-wide uppercase">
          Colaboración
        </p>
        <h1 className="text-foreground mt-2 text-3xl font-black tracking-tight">
          Listas compartidas y trabajo conjunto
        </h1>
        <p className="text-muted mt-2 text-sm">
          Gestiona permisos por lista y mantén contexto con comentarios y actividad por tarea.
        </p>
      </header>

      {error ? (
        <p className="bg-danger/10 text-danger rounded-xl px-4 py-3 text-sm font-medium">{error}</p>
      ) : null}
      {notice ? (
        <p className="bg-success/10 text-success rounded-xl px-4 py-3 text-sm font-medium">
          {notice}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xl font-black tracking-tight">Listas que compartes</h2>
        {ownedLists.length === 0 ? (
          <p className="border-border/80 bg-surface/70 text-muted rounded-xl border px-4 py-3 text-sm">
            No tienes listas propias para compartir.
          </p>
        ) : null}
        <div className="grid gap-4">
          {ownedLists.map((list) => (
            <article
              key={list.id}
              className="border-border/80 bg-surface/90 rounded-2xl border p-4 shadow-[0_14px_26px_-24px_rgb(15_23_42/0.8)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">{list.name}</p>
                  <p className="text-muted text-xs">
                    {list._count.tasks} tareas · {list.collaborators.length} colaboradores
                  </p>
                </div>
                <span
                  aria-hidden
                  className="inline-block h-4 w-4 rounded-full border border-slate-300"
                  style={{ backgroundColor: list.color ?? "#94a3b8" }}
                />
              </div>

              <form
                onSubmit={(event) => handleInvite(event, list.id)}
                className="mt-4 flex flex-wrap gap-2"
              >
                <input
                  type="email"
                  required
                  value={inviteEmail[list.id] ?? ""}
                  onChange={(event) =>
                    setInviteEmail((prev) => ({
                      ...prev,
                      [list.id]: event.target.value,
                    }))
                  }
                  placeholder="email@colaborador.com"
                  className="border-border ring-primary min-w-56 flex-1 rounded-lg border bg-white/95 px-3 py-2 text-sm outline-none focus:ring-2"
                />
                <select
                  value={inviteRole[list.id] ?? "VIEWER"}
                  onChange={(event) =>
                    setInviteRole((prev) => ({
                      ...prev,
                      [list.id]: event.target.value as Role,
                    }))
                  }
                  className="border-border ring-primary rounded-lg border bg-white/95 px-3 py-2 text-sm outline-none focus:ring-2"
                >
                  <option value="VIEWER">VIEWER</option>
                  <option value="EDITOR">EDITOR</option>
                </select>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="bg-primary-strong hover:bg-primary rounded-lg px-3 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
                >
                  Invitar
                </button>
              </form>

              <div className="mt-4 space-y-2">
                {list.collaborators.length === 0 ? (
                  <p className="text-muted text-sm">Sin colaboradores aún.</p>
                ) : null}
                {list.collaborators.map((member) => (
                  <div
                    key={member.id}
                    className="border-border bg-surface-strong/60 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold">{displayName(member.user)}</p>
                      <p className="text-muted text-xs">{member.user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        onChange={(event) =>
                          void handleRoleChange(list.id, member.id, event.target.value as Role)
                        }
                        className="border-border/80 rounded-lg border bg-white/95 px-2 py-1 text-xs font-semibold"
                      >
                        <option value="VIEWER">VIEWER</option>
                        <option value="EDITOR">EDITOR</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => void handleRemoveCollaborator(list.id, member.id)}
                        className="border-danger/30 text-danger hover:bg-danger/10 rounded-lg border px-2 py-1 text-xs font-semibold transition"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-black tracking-tight">Listas compartidas contigo</h2>
        {sharedLists.length === 0 ? (
          <p className="border-border/80 bg-surface/70 text-muted rounded-xl border px-4 py-3 text-sm">
            Nadie te ha compartido listas todavía.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {sharedLists.map((list) => (
              <article
                key={list.id}
                className="border-border/80 bg-surface/90 rounded-2xl border p-4 shadow-[0_14px_26px_-24px_rgb(15_23_42/0.8)]"
              >
                <p className="text-sm font-bold">{list.name}</p>
                <p className="text-muted mt-1 text-xs">
                  Propietario: {displayName(list.owner)} · Rol: {list.myRole}
                </p>
                <p className="text-muted mt-1 text-xs">{list._count.tasks} tareas</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-black tracking-tight">
          Comentarios y actividad (tareas compartidas)
        </h2>

        {sharedTasks.length === 0 ? (
          <p className="border-border/80 bg-surface/70 text-muted rounded-xl border px-4 py-3 text-sm">
            No tienes tareas compartidas todavía.
          </p>
        ) : (
          <>
            <div className="border-border/80 bg-surface/90 rounded-2xl border p-4 shadow-[0_14px_26px_-24px_rgb(15_23_42/0.8)]">
              <label className="block space-y-1 text-sm font-medium">
                <span>Selecciona tarea</span>
                <select
                  value={selectedTaskId}
                  onChange={(event) => setSelectedTaskId(event.target.value)}
                  className="border-border ring-primary w-full rounded-xl border bg-white/95 px-3 py-2 outline-none focus:ring-2"
                >
                  {sharedTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title} ({task.list.name})
                    </option>
                  ))}
                </select>
              </label>

              {selectedTask ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="bg-surface-strong rounded-full px-2 py-1 font-semibold">
                    Rol: {selectedTask.accessRole}
                  </span>
                  <span className="bg-surface-strong rounded-full px-2 py-1 font-semibold">
                    Estado: {selectedTask.status}
                  </span>
                  <span className="bg-surface-strong rounded-full px-2 py-1 font-semibold">
                    Prioridad: {selectedTask.priority}
                  </span>
                  <button
                    type="button"
                    disabled={!selectedTask.canEdit || isBusy}
                    onClick={() => void toggleTaskStatus(selectedTask)}
                    className="bg-primary-strong hover:bg-primary rounded-full px-3 py-1 font-semibold text-white transition disabled:opacity-50"
                  >
                    {selectedTask.isCompleted ? "Marcar pendiente" : "Marcar completada"}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <article className="border-border/80 bg-surface/90 rounded-2xl border p-4 shadow-[0_14px_26px_-24px_rgb(15_23_42/0.8)]">
                <h3 className="text-sm font-bold">Comentarios</h3>
                <form onSubmit={handleAddComment} className="mt-3 flex gap-2">
                  <input
                    value={commentInput}
                    onChange={(event) => setCommentInput(event.target.value)}
                    placeholder="Escribe un comentario..."
                    className="border-border ring-primary min-w-0 flex-1 rounded-lg border bg-white/95 px-3 py-2 text-sm outline-none focus:ring-2"
                  />
                  <button
                    type="submit"
                    disabled={isBusy || !selectedTask}
                    className="bg-primary-strong hover:bg-primary rounded-lg px-3 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
                  >
                    Enviar
                  </button>
                </form>
                <div className="mt-3 max-h-72 space-y-2 overflow-auto pr-1">
                  {isLoadingStreams ? <p className="text-muted text-sm">Cargando...</p> : null}
                  {!isLoadingStreams && comments.length === 0 ? (
                    <p className="text-muted text-sm">No hay comentarios.</p>
                  ) : null}
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="border-border bg-surface-strong/60 rounded-lg border px-3 py-2"
                    >
                      <p className="text-sm">{comment.body}</p>
                      <p className="text-muted mt-1 text-xs">
                        {displayName(comment.author)} ·{" "}
                        {new Date(comment.createdAt).toLocaleString("es-ES")}
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="border-border/80 bg-surface/90 rounded-2xl border p-4 shadow-[0_14px_26px_-24px_rgb(15_23_42/0.8)]">
                <h3 className="text-sm font-bold">Actividad</h3>
                <div className="mt-3 max-h-96 space-y-2 overflow-auto pr-1">
                  {isLoadingStreams ? <p className="text-muted text-sm">Cargando...</p> : null}
                  {!isLoadingStreams && activity.length === 0 ? (
                    <p className="text-muted text-sm">Sin eventos por ahora.</p>
                  ) : null}
                  {activity.map((entry) => (
                    <div
                      key={entry.id}
                      className="border-border bg-surface-strong/60 rounded-lg border px-3 py-2"
                    >
                      <p className="text-sm">{entry.message}</p>
                      <p className="text-muted mt-1 text-xs">
                        {entry.actor ? displayName(entry.actor) : "Sistema"} ·{" "}
                        {new Date(entry.createdAt).toLocaleString("es-ES")}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </>
        )}
      </section>
    </section>
  );
}
