"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchApi, isApiRequestError } from "@/lib/client-api";
import { useT } from "@/components/settings/locale-provider";
import { useAppToast } from "@/components/ui/toaster-provider";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Role = "VIEWER" | "EDITOR";

type UserPreview = {
  id: string;
  username?: string | null;
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

type CollaborationHubProps = {
  initialOwnedLists: OwnedListItem[];
  initialSharedLists: SharedListItem[];
};

function displayName(user: UserPreview) {
  return user.displayName?.trim() || user.username?.trim() || user.email;
}

export function CollaborationHub({
  initialOwnedLists,
  initialSharedLists,
}: CollaborationHubProps) {
  const t = useT();
  const { pushToast } = useAppToast();
  const [ownedLists, setOwnedLists] = useState(initialOwnedLists);
  const [sharedLists] = useState(initialSharedLists);
  const [isBusy, setIsBusy] = useState(false);

  const [inviteIdentifier, setInviteIdentifier] = useState<Record<string, string>>({});
  const [inviteRole, setInviteRole] = useState<Record<string, Role>>({});
  const [inviteSuggestions, setInviteSuggestions] = useState<Record<string, UserPreview[]>>({});
  const [isSearchingUsers, setIsSearchingUsers] = useState<Record<string, boolean>>({});
  const [isSuggestionOpen, setIsSuggestionOpen] = useState<Record<string, boolean>>({});
  const searchRequestIds = useRef<Record<string, number>>({});
  const searchTimers = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({});
  const roleLabels = useMemo(
    () => ({
      VIEWER: t("collaboration.role.viewer"),
      EDITOR: t("collaboration.role.editor"),
      OWNER: t("tasks.access.owner"),
    }),
    [t],
  );

  useEffect(() => {
    const activeTimers = searchTimers.current;
    return () => {
      for (const timer of Object.values(activeTimers)) {
        if (timer) {
          clearTimeout(timer);
        }
      }
    };
  }, []);

  const resolveErrorMessage = useCallback((reason: unknown, fallback: string) => {
    if (isApiRequestError(reason)) {
      return fallback;
    }
    return reason instanceof Error ? reason.message : fallback;
  }, []);

  const showErrorToast = useCallback((reason: unknown, fallback: string) => {
    pushToast({
      variant: "error",
      message: resolveErrorMessage(reason, fallback),
    });
  }, [pushToast, resolveErrorMessage]);

  const loadInviteSuggestions = useCallback(
    (listId: string, rawValue: string) => {
      const query = rawValue.trim();
      const currentTimer = searchTimers.current[listId];
      if (currentTimer) {
        clearTimeout(currentTimer);
      }

      if (query.length < 2) {
        setInviteSuggestions((prev) => ({ ...prev, [listId]: [] }));
        setIsSearchingUsers((prev) => ({ ...prev, [listId]: false }));
        setIsSuggestionOpen((prev) => ({ ...prev, [listId]: false }));
        return;
      }

      setIsSuggestionOpen((prev) => ({ ...prev, [listId]: true }));
      setIsSearchingUsers((prev) => ({ ...prev, [listId]: true }));

      searchTimers.current[listId] = setTimeout(() => {
        const nextRequestId = (searchRequestIds.current[listId] ?? 0) + 1;
        searchRequestIds.current[listId] = nextRequestId;

        void fetchApi<{ users: UserPreview[] }>(
          `/api/collaboration/lists/${listId}/members?query=${encodeURIComponent(query)}`,
        )
          .then((data) => {
            if (searchRequestIds.current[listId] !== nextRequestId) {
              return;
            }
            setInviteSuggestions((prev) => ({
              ...prev,
              [listId]: data.users,
            }));
          })
          .catch((searchError) => {
            if (searchRequestIds.current[listId] !== nextRequestId) {
              return;
            }

            setInviteSuggestions((prev) => ({ ...prev, [listId]: [] }));
            showErrorToast(searchError, t("collaboration.error.userSearch"));
          })
          .finally(() => {
            if (searchRequestIds.current[listId] !== nextRequestId) {
              return;
            }
            setIsSearchingUsers((prev) => ({ ...prev, [listId]: false }));
          });
      }, 160);
    },
    [showErrorToast, t],
  );

  function onInviteInputChange(listId: string, nextValue: string) {
    setInviteIdentifier((prev) => ({
      ...prev,
      [listId]: nextValue,
    }));
    loadInviteSuggestions(listId, nextValue);
  }

  function onSelectSuggestedUser(listId: string, user: UserPreview) {
    const value = user.username?.trim() || user.email;
    setInviteIdentifier((prev) => ({
      ...prev,
      [listId]: value,
    }));
    setInviteSuggestions((prev) => ({
      ...prev,
      [listId]: [],
    }));
    setIsSuggestionOpen((prev) => ({
      ...prev,
      [listId]: false,
    }));
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>, listId: string) {
    event.preventDefault();
    setIsBusy(true);

    try {
      const identifier = inviteIdentifier[listId]?.trim();

      if (!identifier) {
        throw new Error(t("collaboration.error.identifierRequired"));
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
        body: JSON.stringify({ identifier, role }),
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

      setInviteIdentifier((prev) => ({ ...prev, [listId]: "" }));
      setInviteSuggestions((prev) => ({ ...prev, [listId]: [] }));
      setIsSuggestionOpen((prev) => ({ ...prev, [listId]: false }));
      pushToast({
        variant: "success",
        message: t("collaboration.notice.invited"),
      });
    } catch (inviteError) {
      if (isApiRequestError(inviteError) && inviteError.status === 404) {
        showErrorToast(inviteError, t("collaboration.error.userNotFound"));
      } else {
        showErrorToast(inviteError, t("collaboration.error.invite"));
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRoleChange(listId: string, memberId: string, role: Role) {
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

      pushToast({
        variant: "success",
        message: t("collaboration.notice.roleUpdated"),
      });
    } catch (roleError) {
      showErrorToast(roleError, t("collaboration.error.role"));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRemoveCollaborator(listId: string, memberId: string) {
    const confirmed = window.confirm(t("collaboration.confirmRemove"));

    if (!confirmed) {
      return;
    }

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

      pushToast({
        variant: "success",
        message: t("collaboration.notice.removed"),
      });
    } catch (removeError) {
      showErrorToast(removeError, t("collaboration.error.remove"));
    } finally {
      setIsBusy(false);
    }
  }

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
        </div>
      </header>

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
                <div className="relative min-w-0">
                  <Input
                    type="text"
                    required
                    value={inviteIdentifier[list.id] ?? ""}
                    onChange={(event) => onInviteInputChange(list.id, event.target.value)}
                    onFocus={() => {
                      if ((inviteSuggestions[list.id]?.length ?? 0) > 0) {
                        setIsSuggestionOpen((prev) => ({ ...prev, [list.id]: true }));
                      }
                    }}
                    onBlur={() => {
                      window.setTimeout(() => {
                        setIsSuggestionOpen((prev) => ({ ...prev, [list.id]: false }));
                      }, 130);
                    }}
                    autoComplete="off"
                    placeholder={t("collaboration.invitePlaceholder")}
                    className="ui-field min-w-0"
                  />
                  {isSuggestionOpen[list.id] ? (
                    <div
                      role="listbox"
                      aria-label={t("collaboration.userSuggestions")}
                      className="border-border bg-surface/95 absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border p-1 shadow-[var(--ui-shadow-md)] backdrop-blur-md"
                    >
                      {isSearchingUsers[list.id] ? (
                        <p className="text-muted px-3 py-2 text-sm">{t("common.loading")}</p>
                      ) : null}
                      {!isSearchingUsers[list.id] &&
                      (inviteIdentifier[list.id]?.trim().length ?? 0) >= 2 &&
                      (inviteSuggestions[list.id]?.length ?? 0) === 0 ? (
                        <p className="text-muted px-3 py-2 text-sm">{t("collaboration.noUsersFound")}</p>
                      ) : null}
                      {!isSearchingUsers[list.id]
                        ? (inviteSuggestions[list.id] ?? []).map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              role="option"
                              aria-selected={
                                (inviteIdentifier[list.id]?.trim().toLowerCase() ?? "") ===
                                (user.username?.trim().toLowerCase() || user.email.toLowerCase())
                              }
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => onSelectSuggestedUser(list.id, user)}
                              className="hover:bg-surface-strong/80 focus-visible:ring-primary/35 flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2"
                            >
                              <span className="text-sm font-semibold text-[color:var(--ui-text-strong)]">
                                {displayName(user)}
                              </span>
                              <span className="text-muted text-xs">
                                {user.username ? `@${user.username} · ` : ""}
                                {user.email}
                              </span>
                            </button>
                          ))
                        : null}
                    </div>
                  ) : null}
                </div>
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
                      {member.user.username?.trim() ? (
                        <p className="text-muted truncate text-xs">@{member.user.username}</p>
                      ) : null}
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

    </section>
  );
}
