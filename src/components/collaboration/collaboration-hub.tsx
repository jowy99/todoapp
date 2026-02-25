"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/client-api";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

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
    <section className="min-w-0 space-y-5 sm:space-y-6">
      <header className="ui-card ui-card--hero relative overflow-hidden p-5 sm:p-6">
        <div
          aria-hidden
          className="bg-primary/14 pointer-events-none absolute -top-14 right-10 h-36 w-36 rounded-full blur-2xl"
        />
        <div
          aria-hidden
          className="bg-accent/16 pointer-events-none absolute -bottom-14 left-8 h-32 w-32 rounded-full blur-2xl"
        />
        <p className="ui-kicker">Colaboración</p>
        <h1 className="ui-title-xl mt-2">Listas compartidas y trabajo conjunto</h1>
        <p className="ui-subtle mt-2 max-w-2xl">
          Gestiona permisos por lista y mantén contexto con comentarios y actividad por tarea.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="ui-chip font-semibold shadow-sm">Propias: {ownedLists.length}</span>
          <span className="ui-chip bg-primary/10 text-primary-strong font-semibold shadow-sm">
            Compartidas: {sharedLists.length}
          </span>
          <span className="ui-chip bg-accent/10 text-slate-700 font-semibold shadow-sm">
            Tareas colaborativas: {sharedTasks.length}
          </span>
        </div>
      </header>

      {error ? <p className="ui-alert ui-alert--danger">{error}</p> : null}
      {notice ? <p className="ui-alert ui-alert--success">{notice}</p> : null}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="ui-kicker ui-kicker--muted">Permisos</p>
            <h2 className="ui-title-lg mt-1">Listas que compartes</h2>
          </div>
          <span className="ui-pill">{ownedLists.length}</span>
        </div>

        {ownedLists.length === 0 ? <p className="ui-empty">No tienes listas propias para compartir.</p> : null}

        <div className="grid gap-4 xl:grid-cols-2">
          {ownedLists.map((list) => (
            <article
              key={list.id}
              className="ui-card p-4 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-[0_22px_30px_-26px_rgb(15_23_42/0.85)] sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block h-4 w-4 rounded-md border border-slate-300 shadow-inner"
                      style={{ backgroundColor: list.color ?? "#94a3b8" }}
                    />
                    <p className="truncate text-[0.95rem] font-bold text-slate-900">{list.name}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="ui-chip ui-chip--meta">{list._count.tasks} tareas</span>
                    <span className="ui-chip ui-chip--meta">{list.collaborators.length} colaboradores</span>
                  </div>
                </div>
              </div>

              <form
                onSubmit={(event) => handleInvite(event, list.id)}
                className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
              >
                <Input
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
                  className="ui-field min-w-0"
                />
                <Select
                  value={inviteRole[list.id] ?? "VIEWER"}
                  onChange={(event) =>
                    setInviteRole((prev) => ({
                      ...prev,
                      [list.id]: event.target.value as Role,
                    }))
                  }
                  className="ui-field min-h-11"
                >
                  <option value="VIEWER">VIEWER</option>
                  <option value="EDITOR">EDITOR</option>
                </Select>
                <button type="submit" disabled={isBusy} className="ui-btn ui-btn--primary sm:min-h-11">
                  Invitar
                </button>
              </form>

              <div className="mt-4 space-y-2">
                {list.collaborators.length === 0 ? <p className="ui-empty">Sin colaboradores aún.</p> : null}
                {list.collaborators.map((member) => (
                  <div
                    key={member.id}
                    className="border-border bg-surface-strong/60 flex flex-col gap-2 rounded-xl border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{displayName(member.user)}</p>
                      <p className="text-muted truncate text-xs">{member.user.email}</p>
                    </div>
                    <div className="flex w-full items-center gap-2 sm:w-auto">
                      <Select
                        value={member.role}
                        onChange={(event) =>
                          void handleRoleChange(list.id, member.id, event.target.value as Role)
                        }
                        className="ui-field min-h-10 flex-1 px-2 py-1 text-xs font-semibold sm:min-h-9 sm:flex-none"
                      >
                        <option value="VIEWER">VIEWER</option>
                        <option value="EDITOR">EDITOR</option>
                      </Select>
                      <button
                        type="button"
                        onClick={() => void handleRemoveCollaborator(list.id, member.id)}
                        className="ui-btn ui-btn--destructive min-h-10 flex-1 text-xs sm:min-h-9 sm:flex-none"
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
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="ui-kicker ui-kicker--muted">Recibidas</p>
            <h2 className="ui-title-lg mt-1">Listas compartidas contigo</h2>
          </div>
          <span className="ui-pill">{sharedLists.length}</span>
        </div>

        {sharedLists.length === 0 ? (
          <p className="ui-empty">Nadie te ha compartido listas todavía.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sharedLists.map((list) => (
              <article
                key={list.id}
                className="ui-card p-4 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-[0_22px_30px_-26px_rgb(15_23_42/0.85)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[0.95rem] font-bold text-slate-900">{list.name}</p>
                    <p className="text-muted mt-1 text-xs">Propietario: {displayName(list.owner)}</p>
                  </div>
                  <span className="ui-chip ui-chip--meta bg-primary/10 text-primary-strong">{list.myRole}</span>
                </div>
                <p className="text-muted mt-3 text-xs">{list._count.tasks} tareas</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="ui-kicker ui-kicker--muted">Seguimiento</p>
            <h2 className="ui-title-lg mt-1">Comentarios y actividad</h2>
          </div>
          <span className="ui-pill">{sharedTasks.length}</span>
        </div>

        {sharedTasks.length === 0 ? (
          <p className="ui-empty">No tienes tareas compartidas todavía.</p>
        ) : (
          <>
            <div className="ui-card p-4 sm:p-5">
              <label className="block space-y-1 text-sm font-medium">
                <span>Selecciona tarea</span>
                <Select
                  value={selectedTaskId}
                  onChange={(event) => setSelectedTaskId(event.target.value)}
                  className="ui-field w-full"
                >
                  {sharedTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title} ({task.list.name})
                    </option>
                  ))}
                </Select>
              </label>

              {selectedTask ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="ui-chip ui-chip--meta">Rol: {selectedTask.accessRole}</span>
                  <span className="ui-chip ui-chip--meta">Estado: {selectedTask.status}</span>
                  <span className="ui-chip ui-chip--meta">Prioridad: {selectedTask.priority}</span>
                  <button
                    type="button"
                    disabled={!selectedTask.canEdit || isBusy}
                    onClick={() => void toggleTaskStatus(selectedTask)}
                    className="ui-btn ui-btn--primary ui-btn--compact min-h-9 rounded-full px-3"
                  >
                    {selectedTask.isCompleted ? "Marcar pendiente" : "Marcar completada"}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <article className="ui-card p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold tracking-wide text-slate-900 uppercase">Comentarios</h3>
                  <span className="ui-pill text-[11px]">{comments.length}</span>
                </div>
                <form onSubmit={handleAddComment} className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={commentInput}
                    onChange={(event) => setCommentInput(event.target.value)}
                    placeholder="Escribe un comentario..."
                    className="ui-field min-w-0 flex-1"
                  />
                  <button
                    type="submit"
                    disabled={isBusy || !selectedTask}
                    className="ui-btn ui-btn--primary min-h-10 sm:min-h-11"
                  >
                    Enviar
                  </button>
                </form>
                <div className="mt-3 max-h-60 space-y-2 overflow-auto pr-1 sm:max-h-72">
                  {isLoadingStreams ? (
                    <div className="space-y-2">
                      <div className="ui-skeleton h-11 w-full" />
                      <div className="ui-skeleton h-11 w-full" />
                    </div>
                  ) : null}
                  {!isLoadingStreams && comments.length === 0 ? <p className="ui-empty">No hay comentarios.</p> : null}
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="border-border bg-surface-strong/60 rounded-xl border px-3 py-2"
                    >
                      <p className="text-sm text-slate-900">{comment.body}</p>
                      <p className="text-muted mt-1 text-xs">
                        {displayName(comment.author)} · {new Date(comment.createdAt).toLocaleString("es-ES")}
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="ui-card p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold tracking-wide text-slate-900 uppercase">Actividad</h3>
                  <span className="ui-pill text-[11px]">{activity.length}</span>
                </div>
                <div className="mt-3 max-h-72 space-y-2 overflow-auto pr-1 sm:max-h-96">
                  {isLoadingStreams ? (
                    <div className="space-y-2">
                      <div className="ui-skeleton h-11 w-full" />
                      <div className="ui-skeleton h-11 w-full" />
                    </div>
                  ) : null}
                  {!isLoadingStreams && activity.length === 0 ? <p className="ui-empty">Sin eventos por ahora.</p> : null}
                  {activity.map((entry) => (
                    <div
                      key={entry.id}
                      className="border-border bg-surface-strong/60 rounded-xl border px-3 py-2"
                    >
                      <p className="text-sm text-slate-900">{entry.message}</p>
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
