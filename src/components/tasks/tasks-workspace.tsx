"use client";

import {
  FormEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fetchApi } from "@/lib/client-api";
import { useLocalePreference, useT } from "@/components/settings/locale-provider";
import { SidebarNav } from "@/components/tasks/sidebar-nav";
import { AppShell } from "@/components/ui/app-shell";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type Status = "TODO" | "IN_PROGRESS" | "DONE";
type AccessRole = "OWNER" | "VIEWER" | "EDITOR";
type TaskView = "all" | "pending" | "completed" | "today" | "upcoming";

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

type TaskFormField = "title" | "description" | "dueDate" | "priority" | "status" | "listId";

type TasksWorkspaceProps = {
  initialTasks: TaskItem[];
  initialLists: ListItem[];
  initialTags: TagItem[];
};

const priorities: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const statuses: Status[] = ["TODO", "IN_PROGRESS", "DONE"];
const taskViews: TaskView[] = ["all", "pending", "completed", "today", "upcoming"];
const TASKS_INITIAL_RENDER_LIMIT = 120;
const TASKS_RENDER_STEP = 120;

const TaskDetailPanel = dynamic(
  () => import("@/components/tasks/task-detail-panel").then((mod) => mod.TaskDetailPanel),
  {
    ssr: false,
    loading: () => (
      <section className="flex h-full flex-col px-3 py-3 sm:px-6 sm:py-6 md:px-8 md:py-8">
        <div className="h-full animate-pulse rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)]" />
      </section>
    ),
  },
);

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

type TaskRowProps = {
  task: TaskItem;
  isEditing: boolean;
  onToggleCompletion: (task: TaskItem) => void | Promise<void>;
  onToggleDetails: (task: TaskItem) => void;
};

const TaskRow = memo(function TaskRow({
  task,
  isEditing,
  onToggleCompletion,
  onToggleDetails,
}: TaskRowProps) {
  const metaChipBaseClass =
    "inline-flex min-h-[1.55rem] items-center gap-1.5 rounded-md border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] px-2 py-0.5 text-[11px] leading-none font-semibold text-[color:var(--ui-text-muted)]";
  const t = useT();
  const { locale } = useLocalePreference();
  const localeTag = locale === "es" ? "es-ES" : "en-US";
  const priorityLabel = useMemo(() => {
    if (task.priority === "URGENT") {
      return t("tasks.priority.urgent");
    }
    if (task.priority === "HIGH") {
      return t("tasks.priority.high");
    }
    if (task.priority === "MEDIUM") {
      return t("tasks.priority.medium");
    }
    return t("tasks.priority.low");
  }, [t, task.priority]);
  const statusLabel = useMemo(() => {
    if (task.status === "IN_PROGRESS") {
      return t("tasks.status.inProgress");
    }
    if (task.status === "DONE") {
      return t("tasks.status.done");
    }
    return t("tasks.status.todo");
  }, [t, task.status]);
  const dueDateLabel = useMemo(
    () => (task.dueDate ? new Date(task.dueDate).toLocaleDateString(localeTag) : null),
    [localeTag, task.dueDate],
  );
  const priorityDotClass = useMemo(() => {
    if (task.priority === "URGENT") {
      return "bg-rose-500";
    }
    if (task.priority === "HIGH") {
      return "bg-amber-500";
    }
    if (task.priority === "MEDIUM") {
      return "bg-blue-500";
    }
    return "bg-slate-400";
  }, [task.priority]);
  const statusDotClass = useMemo(() => {
    if (task.status === "DONE") {
      return "bg-emerald-500";
    }
    if (task.status === "IN_PROGRESS") {
      return "bg-violet-500";
    }
    return "bg-slate-400";
  }, [task.status]);
  const firstTagName = task.tags[0]?.tag.name ?? null;
  const firstTagColor = task.tags[0]?.tag.color ?? null;
  const additionalTagCount = Math.max(0, task.tags.length - 1);

  const handleToggleCompletion = useCallback(() => {
    void onToggleCompletion(task);
  }, [onToggleCompletion, task]);

  const handleItemKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) {
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleToggleCompletion();
      }
    },
    [handleToggleCompletion],
  );

  const handleDetailClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onToggleDetails(task);
    },
    [onToggleDetails, task],
  );

  const renderMetaChips = () => (
    <>
      {dueDateLabel ? (
        <span
          title={`${t("tasks.dueDate")}: ${dueDateLabel}`}
          className={`${metaChipBaseClass} text-[color:var(--ui-text-strong)]`}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[color:var(--ui-text-soft)]" fill="none" aria-hidden>
            <rect x="4" y="5.5" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8 3.8v3.4M16 3.8v3.4M4 9.5h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span>{dueDateLabel}</span>
        </span>
      ) : null}
      <span
        title={`${t("tasks.priority")}: ${priorityLabel}`}
        className={`${metaChipBaseClass} text-[color:var(--ui-text-strong)]`}
      >
        <span className={`h-2 w-2 rounded-full ${priorityDotClass}`} aria-hidden />
        <span>{priorityLabel}</span>
      </span>
      <span
        title={`${t("tasks.status")}: ${statusLabel}`}
        className={`${metaChipBaseClass} text-[color:var(--ui-text-strong)]`}
      >
        <span className={`h-2 w-2 rounded-full ${statusDotClass}`} aria-hidden />
        <span>{statusLabel}</span>
      </span>
      {task.list ? (
        <span
          title={`${t("tasks.list")}: ${task.list.name}`}
          className={`${metaChipBaseClass} text-[color:var(--ui-text-strong)]`}
        >
          <span
            className="h-2 w-2 rounded-[3px]"
            style={{ backgroundColor: task.list.color ?? "#f87171" }}
          />
          <span className="max-w-[120px] truncate">{task.list.name}</span>
        </span>
      ) : (
        <span
          title={`${t("tasks.list")}: ${t("tasks.noList")}`}
          className={metaChipBaseClass}
        >
          {t("tasks.noList")}
        </span>
      )}
      {firstTagName ? (
        <span
          title={`${t("tasks.tags")}: ${firstTagName}`}
          className={metaChipBaseClass}
        >
          <span className="text-[color:var(--ui-text-soft)]" aria-hidden>#</span>
          {firstTagColor ? (
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: firstTagColor }}
              aria-hidden
            />
          ) : null}
          <span className="max-w-[116px] truncate">{firstTagName}</span>
          {additionalTagCount > 0 ? (
            <span className="rounded-full bg-[color:var(--ui-surface-3)] px-1.5 py-0.5 text-[10px] leading-none font-semibold text-[color:var(--ui-text-muted)]">
              +{additionalTagCount}
            </span>
          ) : null}
        </span>
      ) : null}
    </>
  );

  return (
    <li
      className={`ui-task-row group p-3 transition-all duration-200 ease-out last:border-b-0 sm:p-4 ${
        isEditing ? "ui-task-row--active" : ""
      }`}
    >
      <div
        className="flex cursor-pointer items-start justify-between gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)] lg:items-center"
        role="button"
        tabIndex={0}
        onClick={handleToggleCompletion}
        onKeyDown={handleItemKeyDown}
      >
        <div className="flex min-w-0 items-start gap-3 lg:items-center">
          <input
            type="checkbox"
            aria-label={t("tasks.markTask", { title: task.title })}
            checked={task.isCompleted}
            disabled={!task.canEdit}
            onClick={(event) => event.stopPropagation()}
            onChange={handleToggleCompletion}
            className="accent-success mt-1 h-4 w-4 rounded-[4px] lg:mt-0"
          />
          <div className="min-w-0 text-left">
            <p
              className={`truncate text-base leading-tight font-semibold transition-colors duration-200 sm:text-lg md:text-[22px] ${
                task.isCompleted ? "text-[color:var(--ui-text-soft)] line-through" : "text-[color:var(--ui-text-strong)]"
              }`}
            >
              {task.title}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[color:var(--ui-text-muted)] lg:hidden">
              {renderMetaChips()}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-start gap-2 lg:items-center">
          <div className="hidden max-w-[56vw] self-center flex-row-reverse flex-wrap items-center justify-start gap-2 lg:flex">
            {renderMetaChips()}
          </div>
          <button
            type="button"
            disabled={!task.canEdit}
            onClick={handleDetailClick}
            aria-label={
              isEditing
                ? t("tasks.closeDetail", { title: task.title })
                : t("tasks.openDetail", { title: task.title })
            }
            className={`ui-btn ui-btn--secondary ui-btn--icon h-9 w-9 rounded-xl text-[color:var(--ui-text-muted)] opacity-90 transition-all duration-200 group-hover:opacity-100 disabled:opacity-50 ${
              isEditing ? "ui-btn--active-dark" : ""
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
    </li>
  );
});

export function TasksWorkspace({ initialTasks, initialLists, initialTags }: TasksWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useT();

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
  const [visibleTasksLimit, setVisibleTasksLimit] = useState(TASKS_INITIAL_RENDER_LIMIT);

  const searchParamsString = searchParams.toString();
  const rawView = searchParams.get("view");
  const activeView: TaskView =
    rawView && taskViews.includes(rawView as TaskView) ? (rawView as TaskView) : "all";
  const viewLabels = useMemo<Record<TaskView, string>>(
    () => ({
      all: t("tasks.views.all"),
      pending: t("tasks.views.pending"),
      completed: t("tasks.views.completed"),
      today: t("tasks.views.today"),
      upcoming: t("tasks.views.upcoming"),
    }),
    [t],
  );
  const rawListId = searchParams.get("list");
  const rawTagId = searchParams.get("tag");
  const activeList = rawListId ? lists.find((list) => list.id === rawListId) ?? null : null;
  const activeTag = rawTagId ? tags.find((tag) => tag.id === rawTagId) ?? null : null;
  const activeListId = activeList?.id ?? null;
  const activeTagId = activeTag?.id ?? null;
  const scopedTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (activeListId && task.listId !== activeListId) {
        return false;
      }
      if (activeTagId && !task.tags.some((entry) => entry.tagId === activeTagId)) {
        return false;
      }
      return true;
    });
  }, [activeListId, activeTagId, tasks]);
  const viewCounts = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    let pending = 0;
    let completed = 0;
    let today = 0;
    let upcoming = 0;

    for (const task of scopedTasks) {
      if (task.isCompleted) {
        completed += 1;
        continue;
      }

      pending += 1;
      if (!task.dueDate) {
        continue;
      }

      const dueDate = new Date(task.dueDate);
      if (dueDate >= startOfToday && dueDate < startOfTomorrow) {
        today += 1;
      } else if (dueDate >= startOfTomorrow) {
        upcoming += 1;
      }
    }

    return {
      all: scopedTasks.length,
      pending,
      completed,
      today,
      upcoming,
    };
  }, [scopedTasks]);
  const filteredTasks = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    if (activeView === "all") {
      return scopedTasks;
    }
    if (activeView === "pending") {
      return scopedTasks.filter((task) => !task.isCompleted);
    }
    if (activeView === "completed") {
      return scopedTasks.filter((task) => task.isCompleted);
    }
    if (activeView === "today") {
      return scopedTasks.filter((task) => {
        if (task.isCompleted || !task.dueDate) {
          return false;
        }
        const dueDate = new Date(task.dueDate);
        return dueDate >= startOfToday && dueDate < startOfTomorrow;
      });
    }

    return scopedTasks.filter((task) => {
      if (task.isCompleted || !task.dueDate) {
        return false;
      }
      const dueDate = new Date(task.dueDate);
      return dueDate >= startOfTomorrow;
    });
  }, [activeView, scopedTasks]);
  const visibleTasks = useMemo(
    () => filteredTasks.slice(0, visibleTasksLimit),
    [filteredTasks, visibleTasksLimit],
  );
  const hasMoreVisibleTasks = visibleTasks.length < filteredTasks.length;
  const remainingVisibleTaskCount = filteredTasks.length - visibleTasks.length;
  const visibleTaskCount = filteredTasks.length;
  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (activeView !== "all") {
      parts.push(viewLabels[activeView]);
    }
    if (activeList) {
      parts.push(t("tasks.filter.list", { name: activeList.name }));
    }
    if (activeTag) {
      parts.push(t("tasks.filter.tag", { name: activeTag.name }));
    }
    return parts.length > 0 ? parts.join(" · ") : t("tasks.filter.all");
  }, [activeList, activeTag, activeView, t, viewLabels]);
  const mainTitle = useMemo(() => {
    if (activeList) {
      return activeList.name;
    }
    if (activeTag) {
      return `#${activeTag.name}`;
    }
    return viewLabels[activeView];
  }, [activeList, activeTag, activeView, viewLabels]);
  const hasListFilter = Boolean(activeListId);
  const hasTagFilter = Boolean(activeTagId);
  const listTaskCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of tasks) {
      if (!task.listId) {
        continue;
      }
      counts.set(task.listId, (counts.get(task.listId) ?? 0) + 1);
    }
    return counts;
  }, [tasks]);
  const selectedList = useMemo(
    () => lists.find((list) => list.id === taskForm.listId) ?? null,
    [lists, taskForm.listId],
  );
  const canCreateInSelectedList = !selectedList || selectedList.canEdit !== false;
  const selectedTask = useMemo(
    () => (editingTaskId ? (tasks.find((task) => task.id === editingTaskId) ?? null) : null),
    [editingTaskId, tasks],
  );
  const sidebarLists = useMemo(
    () =>
      lists.map((list) => ({
        id: list.id,
        name: list.name,
        color: list.color,
        count: listTaskCounts.get(list.id) ?? list._count?.tasks ?? 0,
      })),
    [lists, listTaskCounts],
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
    setVisibleTasksLimit(TASKS_INITIAL_RENDER_LIMIT);
  }, [activeListId, activeTagId, activeView]);

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
    const shouldLockScroll =
      (isMobileSidebarOpen || Boolean(selectedTask)) && window.innerWidth < 1024;

    if (!shouldLockScroll) {
      document.body.style.overflow = "";
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileSidebarOpen, selectedTask]);

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
    if (!selectedTask) {
      return;
    }

    const stillVisible = filteredTasks.some((task) => task.id === selectedTask.id);
    if (!stillVisible) {
      setEditingTaskId(null);
    }
  }, [filteredTasks, selectedTask]);

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

  const resetNotice = useCallback(() => {
    setNotice(null);
    setError(null);
  }, []);

  const notifySuccess = useCallback((message: string) => {
    setError(null);
    setNotice(message);
  }, []);

  const notifyError = useCallback((reason: unknown, fallback: string) => {
    const message = reason instanceof Error ? reason.message : fallback;
    setNotice(null);
    setError(message);
  }, []);

  const handleCreateList = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
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
        notifySuccess(t("tasks.notice.listCreated"));
      } catch (createListError) {
        notifyError(createListError, t("tasks.error.listCreate"));
      } finally {
        setIsBusy(false);
      }
    },
    [listColor, listName, notifyError, notifySuccess, resetNotice, t],
  );

  const handleCreateTag = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
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
        notifySuccess(t("tasks.notice.tagCreated"));
      } catch (createTagError) {
        notifyError(createTagError, t("tasks.error.tagCreate"));
      } finally {
        setIsBusy(false);
      }
    },
    [notifyError, notifySuccess, resetNotice, t, tagColor, tagName],
  );

  const handleCreateTask = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      resetNotice();
      setIsBusy(true);

      try {
        if (!canCreateInSelectedList) {
          throw new Error(t("tasks.error.readOnlyList"));
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
        notifySuccess(t("tasks.notice.taskCreated"));
      } catch (createTaskError) {
        notifyError(createTaskError, t("tasks.error.taskCreate"));
      } finally {
        setIsBusy(false);
      }
    },
    [canCreateInSelectedList, notifyError, notifySuccess, resetNotice, t, taskForm],
  );

  const toggleTaskCompletion = useCallback(
    async (task: TaskItem) => {
      resetNotice();

      if (!task.canEdit) {
        setError(t("tasks.error.readOnlyTask"));
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
        notifySuccess(t("tasks.notice.statusUpdated"));
      } catch (toggleError) {
        notifyError(toggleError, t("tasks.error.statusUpdate"));
      } finally {
        setIsBusy(false);
      }
    },
    [notifyError, notifySuccess, resetNotice, t],
  );

  const startEditing = useCallback((task: TaskItem) => {
    if (!task.canEdit) {
      setError(t("tasks.error.readOnlyTask"));
      return;
    }

    setEditingTaskId(task.id);
    setEditingForm(buildTaskFormState(task));
    setError(null);
    setNotice(null);
  }, [t]);

  const toggleTaskDetails = useCallback(
    (task: TaskItem) => {
      if (editingTaskId === task.id) {
        setEditingTaskId(null);
        return;
      }

      startEditing(task);
    },
    [editingTaskId, startEditing],
  );

  const handleSidebarRequestCreateList = useCallback(() => {
    if (isSidebarCollapsed && !isMobileSidebarOpen) {
      setIsSidebarCollapsed(false);
      setShowTagCreator(false);
      setShowListCreator(true);
      return;
    }

    setShowTagCreator(false);
    setShowListCreator((prev) => !prev);
  }, [isMobileSidebarOpen, isSidebarCollapsed]);

  const handleSidebarRequestCreateTag = useCallback(() => {
    if (isSidebarCollapsed && !isMobileSidebarOpen) {
      setIsSidebarCollapsed(false);
      setShowListCreator(false);
      setShowTagCreator(true);
      return;
    }

    setShowListCreator(false);
    setShowTagCreator((prev) => !prev);
  }, [isMobileSidebarOpen, isSidebarCollapsed]);

  const updateFilters = useCallback(
    (updates: Partial<{ view: TaskView; listId: string | null; tagId: string | null }>) => {
      const params = new URLSearchParams(searchParamsString);
      if (updates.view !== undefined) {
        if (updates.view === "all") {
          params.delete("view");
        } else {
          params.set("view", updates.view);
        }
      }
      if (updates.listId !== undefined) {
        if (updates.listId) {
          params.set("list", updates.listId);
        } else {
          params.delete("list");
        }
      }
      if (updates.tagId !== undefined) {
        if (updates.tagId) {
          params.set("tag", updates.tagId);
        } else {
          params.delete("tag");
        }
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      setIsMobileSidebarOpen(false);
    },
    [pathname, router, searchParamsString],
  );

  const handleSelectList = useCallback(
    (listId: string | null) => {
      updateFilters({ listId });
    },
    [updateFilters],
  );

  const handleSelectTag = useCallback(
    (tagId: string | null) => {
      updateFilters({ tagId });
    },
    [updateFilters],
  );

  const handleSelectView = useCallback(
    (view: TaskView) => {
      updateFilters({ view });
    },
    [updateFilters],
  );

  const handleClearListFilter = useCallback(() => {
    updateFilters({ listId: null });
  }, [updateFilters]);

  const handleClearTagFilter = useCallback(() => {
    updateFilters({ tagId: null });
  }, [updateFilters]);

  const handleSaveEdit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
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
        notifySuccess(t("tasks.notice.taskUpdated"));
      } catch (editError) {
        notifyError(editError, t("tasks.error.taskUpdate"));
      } finally {
        setIsBusy(false);
      }
    },
    [editingForm, editingTaskId, notifyError, notifySuccess, resetNotice, t],
  );

  const handleDeleteTask = useCallback(
    async (task: TaskItem) => {
      resetNotice();

      if (!task.canEdit) {
        setError(t("tasks.error.readOnlyTask"));
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
        notifySuccess(t("tasks.notice.taskDeleted"));
      } catch (deleteError) {
        notifyError(deleteError, t("tasks.error.taskDelete"));
      } finally {
        setIsBusy(false);
      }
    },
    [editingTaskId, notifyError, notifySuccess, resetNotice, t],
  );

  const toggleFormTag = useCallback((id: string, mode: "create" | "edit") => {
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
  }, []);

  const handleToastDismiss = useCallback(() => {
    setNotice(null);
    setError(null);
  }, []);

  const handleSidebarToggle = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  const handleOpenMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(true);
  }, []);

  const handleCloseMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  const handleToggleTaskDetailsForm = useCallback(() => {
    if (showTaskDetails) {
      setShowListCreator(false);
      setShowTagCreator(false);
    }
    setShowTaskDetails((prev) => !prev);
  }, [showTaskDetails]);

  const handleCloseEditing = useCallback(() => {
    setEditingTaskId(null);
  }, []);

  const handleDeleteSelectedTask = useCallback(() => {
    if (selectedTask) {
      void handleDeleteTask(selectedTask);
    }
  }, [handleDeleteTask, selectedTask]);

  const handleEditFieldChange = useCallback((field: TaskFormField, value: string) => {
    const typedValue = value as TaskFormState[TaskFormField];
    setEditingForm((prev) => ({
      ...prev,
      [field]: typedValue,
    }));
  }, []);

  const handleToggleEditTag = useCallback(
    (tagId: string) => {
      toggleFormTag(tagId, "edit");
    },
    [toggleFormTag],
  );

  const handleLoadMoreTasks = useCallback(() => {
    setVisibleTasksLimit((current) =>
      Math.min(current + TASKS_RENDER_STEP, filteredTasks.length),
    );
  }, [filteredTasks.length]);

  const handleShowAllTasks = useCallback(() => {
    setVisibleTasksLimit(filteredTasks.length);
  }, [filteredTasks.length]);

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
              <p className="todo-toast__title">{t("app.title")}</p>
              <p className="todo-toast__message">{error ?? notice}</p>
            </div>
            <button
              type="button"
              onClick={handleToastDismiss}
              aria-label={t("tasks.toastClose")}
              className="todo-toast__close"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
                <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      <AppShell
        ariaLabel={t("nav.primary")}
        sidebarWidth={isSidebarCollapsed ? "72px" : "280px"}
        showDetail={Boolean(selectedTask)}
        sidebar={
          <SidebarNav
            collapsed={isSidebarCollapsed}
            totalCount={viewCounts.all}
            todayCount={viewCounts.pending}
            activeView={activeView}
            viewCounts={viewCounts}
            activeListId={activeListId}
            activeTagId={activeTagId}
            hasListFilter={hasListFilter}
            hasTagFilter={hasTagFilter}
            lists={sidebarLists}
            tags={sidebarTags}
            onToggle={handleSidebarToggle}
            onSelectView={handleSelectView}
            onSelectList={handleSelectList}
            onSelectTag={handleSelectTag}
            onClearListFilter={handleClearListFilter}
            onClearTagFilter={handleClearTagFilter}
            onRequestCreateList={handleSidebarRequestCreateList}
            onRequestCreateTag={handleSidebarRequestCreateTag}
            isListCreatorOpen={showListCreator}
            isTagCreatorOpen={showTagCreator}
            listDraftName={listName}
            listDraftColor={listColor}
            tagDraftName={tagName}
            tagDraftColor={tagColor}
            isCreatingDisabled={isBusy}
            onListDraftNameChange={setListName}
            onListDraftColorChange={setListColor}
            onTagDraftNameChange={setTagName}
            onTagDraftColorChange={setTagColor}
            onCreateListSubmit={handleCreateList}
            onCreateTagSubmit={handleCreateTag}
          />
        }
        main={
          <section className="todo-main-pane flex h-full min-h-0 flex-col px-3 py-4 sm:px-4 sm:py-5 md:px-7 md:py-7">
            <div className="shrink-0">
              <div className="flex items-end justify-between border-b border-[color:var(--ui-border-soft)] pb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    aria-label={t("tasks.mobile.openMenu")}
                    onClick={handleOpenMobileSidebar}
                    className="todo-main-menu-btn ui-btn ui-btn--secondary ui-btn--icon rounded-2xl md:hidden"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                      <path d="M6 7h12M6 12h12M6 17h12" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </button>
                <div>
                  <h2 className="todo-main-title text-3xl font-black tracking-tight text-[color:var(--ui-text-strong)] sm:text-4xl md:text-5xl">
                    {mainTitle}
                  </h2>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--ui-text-soft)]">
                    {filterSummary}
                  </p>
                </div>
              </div>
              <p className="todo-main-count ui-pill ui-pill--count text-sm sm:text-base">
                {visibleTaskCount}
              </p>
              </div>

              <form onSubmit={handleCreateTask} className="mt-4 space-y-3 border-b border-[color:var(--ui-border-soft)] pb-4">
                <div className="todo-quick-add flex flex-col gap-2 rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)] p-2.5 shadow-[var(--ui-shadow-sm)] transition-all duration-200 ease-out hover:border-[color:var(--ui-border-strong)] focus-within:border-[color:var(--ui-border-strong)] focus-within:shadow-[var(--ui-field-focus-ring)] sm:flex-row sm:items-center sm:gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5">
                    <span className="text-xl leading-none text-[color:var(--ui-text-muted)]" aria-hidden>
                      +
                    </span>
                    <input
                      required
                      value={taskForm.title}
                      onChange={(event) =>
                        setTaskForm((prev) => ({ ...prev, title: event.target.value }))
                      }
                      placeholder={t("tasks.quickAddPlaceholder")}
                      className="min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-base leading-none font-medium text-[color:var(--ui-text-strong)] outline-none placeholder:text-[color:var(--ui-text-soft)] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                    />
                  </div>

                  <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
                    <button
                      type="submit"
                      disabled={isBusy || !taskForm.title.trim() || !canCreateInSelectedList}
                      className="ui-btn ui-btn--primary h-11 min-h-11 w-full rounded-xl px-4 text-sm sm:h-10 sm:min-h-10 sm:w-auto"
                    >
                      {t("tasks.add")}
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleTaskDetailsForm}
                      className="ui-btn ui-btn--secondary h-11 min-h-11 w-full rounded-xl px-4 text-sm sm:h-10 sm:min-h-10 sm:w-auto"
                    >
                      {showTaskDetails ? t("tasks.less") : t("tasks.more")}
                    </button>
                  </div>
                </div>

                {showTaskDetails ? (
                  <div className="ui-card space-y-3 rounded-2xl border p-3">
                    <Textarea
                      value={taskForm.description}
                      onChange={(event) =>
                        setTaskForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      placeholder={t("tasks.quickDescriptionPlaceholder")}
                      rows={3}
                      className="ui-field w-full text-sm"
                    />

                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="block space-y-1 text-sm">
                        <span className="font-semibold text-[color:var(--ui-text-muted)]">{t("tasks.dueDate")}</span>
                        <Input
                          type="datetime-local"
                          value={taskForm.dueDate}
                          onChange={(event) =>
                            setTaskForm((prev) => ({ ...prev, dueDate: event.target.value }))
                          }
                          className="ui-field w-full"
                        />
                      </label>
                      <label className="block space-y-1 text-sm">
                        <span className="font-semibold text-[color:var(--ui-text-muted)]">{t("tasks.priority")}</span>
                        <Select
                          value={taskForm.priority}
                          onChange={(event) =>
                            setTaskForm((prev) => ({
                              ...prev,
                              priority: event.target.value as Priority,
                            }))
                          }
                          className="ui-field w-full"
                        >
                          {priorities.map((priority) => (
                            <option key={priority} value={priority}>
                              {priority === "URGENT"
                                ? t("tasks.priority.urgent")
                                : priority === "HIGH"
                                  ? t("tasks.priority.high")
                                  : priority === "MEDIUM"
                                    ? t("tasks.priority.medium")
                                    : t("tasks.priority.low")}
                            </option>
                          ))}
                        </Select>
                      </label>
                      <label className="block space-y-1 text-sm">
                        <span className="font-semibold text-[color:var(--ui-text-muted)]">{t("tasks.status")}</span>
                        <Select
                          value={taskForm.status}
                          onChange={(event) =>
                            setTaskForm((prev) => ({
                              ...prev,
                              status: event.target.value as Status,
                            }))
                          }
                          className="ui-field w-full"
                        >
                          {statuses.map((status) => (
                            <option key={status} value={status}>
                              {status === "IN_PROGRESS"
                                ? t("tasks.status.inProgress")
                                : status === "DONE"
                                  ? t("tasks.status.done")
                                  : t("tasks.status.todo")}
                            </option>
                          ))}
                        </Select>
                      </label>
                    </div>

                    <label className="block space-y-1 text-sm">
                      <span className="font-semibold text-[color:var(--ui-text-muted)]">{t("tasks.list")}</span>
                      <Select
                        value={taskForm.listId}
                        onChange={(event) =>
                          setTaskForm((prev) => ({ ...prev, listId: event.target.value }))
                        }
                        className="ui-field w-full"
                      >
                        <option value="">{t("tasks.noList")}</option>
                        {lists.map((list) => (
                          <option key={list.id} value={list.id} disabled={list.canEdit === false}>
                            {list.name}
                            {list.isShared && list.accessRole
                              ? ` · ${
                                  list.accessRole === "OWNER"
                                    ? t("tasks.access.owner")
                                    : list.accessRole === "EDITOR"
                                      ? t("tasks.access.editor")
                                      : t("tasks.access.viewer")
                                }`
                              : ""}
                            {list.canEdit === false ? ` · ${t("tasks.readOnly")}` : ""}
                          </option>
                        ))}
                      </Select>
                    </label>

                    {selectedList && selectedList.canEdit === false ? (
                      <p className="ui-alert ui-alert--danger text-xs">
                        {t("tasks.quickReadOnlyList")}
                      </p>
                    ) : null}

                    <fieldset className="space-y-2">
                      <legend className="text-sm font-semibold text-[color:var(--ui-text-muted)]">{t("tasks.tags")}</legend>
                      <div className="flex flex-wrap gap-2">
                        {tags.length === 0 ? (
                          <span className="text-muted text-sm">
                            {t("tasks.quickTagsHint")}
                          </span>
                        ) : null}
                        {tags.map((tag) => {
                          const selected = taskForm.tagIds.includes(tag.id);

                          return (
                            <label
                              key={tag.id}
                              className={`ui-chip cursor-pointer px-3 py-1 text-xs font-semibold ${
                                selected
                                  ? "border-accent bg-accent text-[color:var(--on-accent)]"
                                  : "text-foreground hover:bg-[color:var(--ui-surface-3)]"
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
                  </div>
                ) : null}
              </form>
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
              {filteredTasks.length === 0 ? (
                <div className="ui-empty space-y-2.5">
                  <p>
                    {hasListFilter || hasTagFilter || activeView !== "all"
                      ? t("tasks.emptyFiltered", { summary: filterSummary.toLowerCase() })
                      : t("tasks.emptyDefault")}
                  </p>
                  {hasListFilter || hasTagFilter ? (
                    <p className="text-xs font-medium text-[color:var(--ui-text-muted)]">
                      {t("tasks.emptyFiltersHint")}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  <ul className="overflow-hidden rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)] shadow-[var(--ui-shadow-md)]">
                    {visibleTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        isEditing={editingTaskId === task.id}
                        onToggleCompletion={toggleTaskCompletion}
                        onToggleDetails={toggleTaskDetails}
                      />
                    ))}
                  </ul>
                  {hasMoreVisibleTasks ? (
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleLoadMoreTasks}
                        className="ui-btn ui-btn--secondary h-10 min-h-10 rounded-xl px-4 text-sm"
                        aria-label={t("tasks.loadMoreAria", {
                          count: Math.min(TASKS_RENDER_STEP, remainingVisibleTaskCount),
                        })}
                      >
                        {t("tasks.loadMore", {
                          count: Math.min(TASKS_RENDER_STEP, remainingVisibleTaskCount),
                        })}
                      </button>
                      <button
                        type="button"
                        onClick={handleShowAllTasks}
                        className="ui-btn ui-btn--ghost h-10 min-h-10 rounded-xl px-3 text-sm"
                        aria-label={t("tasks.showAllAria", { count: remainingVisibleTaskCount })}
                      >
                        {t("tasks.showAll", { count: remainingVisibleTaskCount })}
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </section>
        }
        detail={
          selectedTask ? (
            <TaskDetailPanel
              task={selectedTask}
              form={editingForm}
              lists={lists}
              tags={tags}
              isBusy={isBusy}
              onSave={handleSaveEdit}
              onDelete={handleDeleteSelectedTask}
              onClose={handleCloseEditing}
              onChange={handleEditFieldChange}
              onToggleTag={handleToggleEditTag}
            />
          ) : null
        }
      />

      <div className="todo-mobile-overlay" data-open={isMobileSidebarOpen}>
        <button
          type="button"
          aria-label={t("tasks.mobile.closeMenu")}
          className="todo-mobile-backdrop"
          onClick={handleCloseMobileSidebar}
        />
        <aside className="todo-mobile-drawer" role="dialog" aria-modal="true" aria-label={t("tasks.mobile.menu")}>
          <SidebarNav
            collapsed={false}
            mobile
            totalCount={viewCounts.all}
            todayCount={viewCounts.pending}
            activeView={activeView}
            viewCounts={viewCounts}
            activeListId={activeListId}
            activeTagId={activeTagId}
            hasListFilter={hasListFilter}
            hasTagFilter={hasTagFilter}
            lists={sidebarLists}
            tags={sidebarTags}
            onToggle={handleCloseMobileSidebar}
            onSelectView={handleSelectView}
            onSelectList={handleSelectList}
            onSelectTag={handleSelectTag}
            onClearListFilter={handleClearListFilter}
            onClearTagFilter={handleClearTagFilter}
            onRequestCreateList={handleSidebarRequestCreateList}
            onRequestCreateTag={handleSidebarRequestCreateTag}
            isListCreatorOpen={showListCreator}
            isTagCreatorOpen={showTagCreator}
            listDraftName={listName}
            listDraftColor={listColor}
            tagDraftName={tagName}
            tagDraftColor={tagColor}
            isCreatingDisabled={isBusy}
            onListDraftNameChange={setListName}
            onListDraftColorChange={setListColor}
            onTagDraftNameChange={setTagName}
            onTagDraftColorChange={setTagColor}
            onCreateListSubmit={handleCreateList}
            onCreateTagSubmit={handleCreateTag}
          />
        </aside>
      </div>

      <div className="todo-detail-overlay" data-open={Boolean(selectedTask)}>
        <button
          type="button"
          aria-label={t("tasks.mobile.closeDetail")}
          className="todo-detail-backdrop"
          onClick={handleCloseEditing}
        />
        <aside
          className="todo-detail-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={t("tasks.mobile.detail")}
        >
          {selectedTask ? (
            <TaskDetailPanel
              task={selectedTask}
              form={editingForm}
              lists={lists}
              tags={tags}
              isBusy={isBusy}
              onSave={handleSaveEdit}
              onDelete={handleDeleteSelectedTask}
              onClose={handleCloseEditing}
              onChange={handleEditFieldChange}
              onToggleTag={handleToggleEditTag}
            />
          ) : null}
        </aside>
      </div>
    </section>
  );
}
