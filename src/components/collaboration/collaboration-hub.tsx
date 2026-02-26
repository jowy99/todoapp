"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/client-api";
import { useLocalePreference, useT } from "@/components/settings/locale-provider";
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
  const t = useT();
  const { locale } = useLocalePreference();
  const localeTag = locale === "es" ? "es-ES" : "en-US";
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
  const roleLabels = useMemo(
    () => ({
      VIEWER: t("collaboration.role.viewer"),
      EDITOR: t("collaboration.role.editor"),
      OWNER: t("tasks.access.owner"),
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
  const priorityLabels = useMemo(
    () => ({
      LOW: t("tasks.priority.low"),
      MEDIUM: t("tasks.priority.medium"),
      HIGH: t("tasks.priority.high"),
      URGENT: t("tasks.priority.urgent"),
    }),
    [t],
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
        throw new Error(t("collaboration.error.emailRequired"));
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
      setNotice(t("collaboration.notice.invited"));
    } catch (inviteError) {
      onError(inviteError, t("collaboration.error.invite"));
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

      setNotice(t("collaboration.notice.roleUpdated"));
    } catch (roleError) {
      onError(roleError, t("collaboration.error.role"));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRemoveCollaborator(listId: string, memberId: string) {
    const confirmed = window.confirm(t("collaboration.confirmRemove"));

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

      setNotice(t("collaboration.notice.removed"));
    } catch (removeError) {
      onError(removeError, t("collaboration.error.remove"));
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
      onError(streamError, t("collaboration.error.streams"));
    } finally {
      setIsLoadingStreams(false);
    }
  }, [t]);

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
        throw new Error(t("collaboration.error.commentRequired"));
      }

      await fetchApi<{ comment: TaskComment }>(`/api/tasks/${selectedTaskId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });

      setCommentInput("");
      setNotice(t("collaboration.notice.commentAdded"));
      await loadTaskStreams(selectedTaskId);
    } catch (commentError) {
      onError(commentError, t("collaboration.error.comment"));
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
      setNotice(t("collaboration.notice.taskStatusUpdated"));
      await loadTaskStreams(task.id);
    } catch (toggleError) {
      onError(toggleError, t("collaboration.error.taskStatus"));
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    void loadTaskStreams(selectedTaskId);
  }, [loadTaskStreams, selectedTaskId]);

  return (
    <section className="h-full min-h-0 min-w-0 space-y-5 overflow-y-auto px-3 py-3 sm:space-y-6 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
      <header className="ui-card ui-card--hero relative overflow-hidden p-5 sm:p-6">
        <div
          aria-hidden
          className="bg-primary/14 pointer-events-none absolute -top-14 right-10 h-36 w-36 rounded-full blur-2xl"
        />
        <div
          aria-hidden
          className="bg-accent/16 pointer-events-none absolute -bottom-14 left-8 h-32 w-32 rounded-full blur-2xl"
        />
        <p className="ui-kicker">{t("collaboration.kicker")}</p>
        <h1 className="ui-title-xl mt-2">{t("collaboration.title")}</h1>
        <p className="ui-subtle mt-2 max-w-2xl">
          {t("collaboration.subtitle")}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="ui-chip font-semibold shadow-sm">{t("collaboration.countOwned", { count: ownedLists.length })}</span>
          <span className="ui-chip bg-primary/10 text-primary-strong font-semibold shadow-sm">
            {t("collaboration.countShared", { count: sharedLists.length })}
          </span>
          <span className="ui-chip bg-accent/10 text-[color:var(--ui-text-strong)] font-semibold shadow-sm">
            {t("collaboration.countTasks", { count: sharedTasks.length })}
          </span>
        </div>
      </header>

      {error ? <p className="ui-alert ui-alert--danger">{error}</p> : null}
      {notice ? <p className="ui-alert ui-alert--success">{notice}</p> : null}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="ui-kicker ui-kicker--muted">{t("collaboration.permissions")}</p>
            <h2 className="ui-title-lg mt-1">{t("collaboration.listsYouShare")}</h2>
          </div>
          <span className="ui-pill">{ownedLists.length}</span>
        </div>

        {ownedLists.length === 0 ? <p className="ui-empty">{t("collaboration.emptyOwned")}</p> : null}

        <div className="grid gap-4 xl:grid-cols-2">
          {ownedLists.map((list) => (
            <article
              key={list.id}
              className="ui-card p-4 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-[var(--ui-shadow-md)] sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block h-4 w-4 rounded-md border border-[color:var(--ui-border-soft)] shadow-inner"
                      style={{ backgroundColor: list.color ?? "#94a3b8" }}
                    />
                    <p className="truncate text-[0.95rem] font-bold text-[color:var(--ui-text-strong)]">{list.name}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="ui-chip ui-chip--meta">{t("collaboration.tasksCount", { count: list._count.tasks })}</span>
                    <span className="ui-chip ui-chip--meta">{t("collaboration.membersCount", { count: list.collaborators.length })}</span>
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
                  placeholder={t("collaboration.invitePlaceholder")}
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
                  <option value="VIEWER">{roleLabels.VIEWER}</option>
                  <option value="EDITOR">{roleLabels.EDITOR}</option>
                </Select>
                <button type="submit" disabled={isBusy} className="ui-btn ui-btn--primary sm:min-h-11">
                  {t("collaboration.invite")}
                </button>
              </form>

              <div className="mt-4 space-y-2">
                {list.collaborators.length === 0 ? <p className="ui-empty">{t("collaboration.emptyMembers")}</p> : null}
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
                        <option value="VIEWER">{roleLabels.VIEWER}</option>
                        <option value="EDITOR">{roleLabels.EDITOR}</option>
                      </Select>
                      <button
                        type="button"
                        onClick={() => void handleRemoveCollaborator(list.id, member.id)}
                        className="ui-btn ui-btn--destructive min-h-10 flex-1 text-xs sm:min-h-9 sm:flex-none"
                      >
                        {t("collaboration.remove")}
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
            <p className="ui-kicker ui-kicker--muted">{t("collaboration.received")}</p>
            <h2 className="ui-title-lg mt-1">{t("collaboration.sharedWithYou")}</h2>
          </div>
          <span className="ui-pill">{sharedLists.length}</span>
        </div>

        {sharedLists.length === 0 ? (
          <p className="ui-empty">{t("collaboration.emptyShared")}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sharedLists.map((list) => (
              <article
                key={list.id}
                className="ui-card p-4 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-[var(--ui-shadow-md)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[0.95rem] font-bold text-[color:var(--ui-text-strong)]">{list.name}</p>
                    <p className="text-muted mt-1 text-xs">{t("collaboration.owner", { name: displayName(list.owner) })}</p>
                  </div>
                  <span className="ui-chip ui-chip--meta bg-primary/10 text-primary-strong">{roleLabels[list.myRole]}</span>
                </div>
                <p className="text-muted mt-3 text-xs">{t("collaboration.tasksCount", { count: list._count.tasks })}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="ui-kicker ui-kicker--muted">{t("collaboration.tracking")}</p>
            <h2 className="ui-title-lg mt-1">{t("collaboration.commentsAndActivity")}</h2>
          </div>
          <span className="ui-pill">{sharedTasks.length}</span>
        </div>

        {sharedTasks.length === 0 ? (
          <p className="ui-empty">{t("collaboration.emptyTasks")}</p>
        ) : (
          <>
            <div className="ui-card p-4 sm:p-5">
              <label className="block space-y-1 text-sm font-medium">
                <span>{t("collaboration.selectTask")}</span>
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
                  <span className="ui-chip ui-chip--meta">{t("collaboration.role", { role: roleLabels[selectedTask.accessRole] })}</span>
                  <span className="ui-chip ui-chip--meta">{t("collaboration.status", { status: statusLabels[selectedTask.status] })}</span>
                  <span className="ui-chip ui-chip--meta">{t("collaboration.priority", { priority: priorityLabels[selectedTask.priority] })}</span>
                  <button
                    type="button"
                    disabled={!selectedTask.canEdit || isBusy}
                    onClick={() => void toggleTaskStatus(selectedTask)}
                    className="ui-btn ui-btn--primary ui-btn--compact min-h-9 rounded-full px-3"
                  >
                    {selectedTask.isCompleted ? t("collaboration.markPending") : t("collaboration.markCompleted")}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <article className="ui-card p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold tracking-wide text-[color:var(--ui-text-strong)] uppercase">{t("collaboration.comments")}</h3>
                  <span className="ui-pill text-[11px]">{comments.length}</span>
                </div>
                <form onSubmit={handleAddComment} className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={commentInput}
                    onChange={(event) => setCommentInput(event.target.value)}
                    placeholder={t("collaboration.commentPlaceholder")}
                    className="ui-field min-w-0 flex-1"
                  />
                  <button
                    type="submit"
                    disabled={isBusy || !selectedTask}
                    className="ui-btn ui-btn--primary min-h-10 sm:min-h-11"
                  >
                    {t("collaboration.send")}
                  </button>
                </form>
                <div className="mt-3 max-h-60 space-y-2 overflow-auto pr-1 sm:max-h-72">
                  {isLoadingStreams ? (
                    <div className="space-y-2">
                      <div className="ui-skeleton h-11 w-full" />
                      <div className="ui-skeleton h-11 w-full" />
                    </div>
                  ) : null}
                  {!isLoadingStreams && comments.length === 0 ? <p className="ui-empty">{t("collaboration.emptyComments")}</p> : null}
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="border-border bg-surface-strong/60 rounded-xl border px-3 py-2"
                    >
                      <p className="text-sm text-[color:var(--ui-text-strong)]">{comment.body}</p>
                      <p className="text-muted mt-1 text-xs">
                        {displayName(comment.author)} · {new Date(comment.createdAt).toLocaleString(localeTag)}
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="ui-card p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold tracking-wide text-[color:var(--ui-text-strong)] uppercase">{t("collaboration.activity")}</h3>
                  <span className="ui-pill text-[11px]">{activity.length}</span>
                </div>
                <div className="mt-3 max-h-72 space-y-2 overflow-auto pr-1 sm:max-h-96">
                  {isLoadingStreams ? (
                    <div className="space-y-2">
                      <div className="ui-skeleton h-11 w-full" />
                      <div className="ui-skeleton h-11 w-full" />
                    </div>
                  ) : null}
                  {!isLoadingStreams && activity.length === 0 ? <p className="ui-empty">{t("collaboration.emptyActivity")}</p> : null}
                  {activity.map((entry) => (
                    <div
                      key={entry.id}
                      className="border-border bg-surface-strong/60 rounded-xl border px-3 py-2"
                    >
                      <p className="text-sm text-[color:var(--ui-text-strong)]">{entry.message}</p>
                      <p className="text-muted mt-1 text-xs">
                        {entry.actor ? displayName(entry.actor) : t("collaboration.system")} ·{" "}
                        {new Date(entry.createdAt).toLocaleString(localeTag)}
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
