import Link from "next/link";
import dynamic from "next/dynamic";
import { cookies } from "next/headers";
import { TaskPriority } from "@prisma/client";
import { CalendarTaskPill } from "@/components/calendar/calendar-task-pill";
import { requireCurrentUser } from "@/lib/auth/session";
import { taskAccessWhere } from "@/lib/collaboration";
import { getServerI18n } from "@/lib/i18n/server";
import {
  DEFAULT_SHOW_COMPLETED_TASKS_PREFERENCE,
  DEFAULT_WEEK_START_PREFERENCE,
  parseShowCompletedPreference,
  UI_SHOW_COMPLETED_COOKIE_KEY,
  UI_WEEK_START_COOKIE_KEY,
  type WeekStartPreference,
} from "@/lib/preferences/ui";
import { prisma } from "@/lib/prisma";

type CalendarSearchParams = Promise<{
  month?: string;
  date?: string;
  view?: string;
  task?: string;
  sidebar?: string;
  daySheet?: string;
  priorities?: string;
  lists?: string;
  tags?: string;
  completed?: string;
}>;

type CalendarPageProps = {
  searchParams: CalendarSearchParams;
};

type CalendarViewMode = "day" | "week" | "month" | "year";

type CalendarTask = {
  id: string;
  title: string;
  dueDate: Date;
  priority: TaskPriority;
  isCompleted: boolean;
  list: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  tags: Array<{
    tagId: string;
    tag: {
      id: string;
      name: string;
      color: string | null;
    };
  }>;
};

const calendarViews: CalendarViewMode[] = ["day", "week", "month", "year"];

const MobileNewTaskButton = dynamic(
  () => import("@/components/calendar/mobile-new-task-button").then((mod) => mod.MobileNewTaskButton),
  {
    loading: () => (
      <span
        aria-hidden
        className="inline-flex h-10 min-w-10 animate-pulse rounded-xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-3)] px-3.5"
      />
    ),
  },
);

const SheetA11yBridge = dynamic(
  () => import("@/components/calendar/sheet-a11y-bridge").then((mod) => mod.SheetA11yBridge),
);

function parseMonthParam(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return null;
  }

  const [yearPart, monthPart] = value.split("-");
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;

  if (Number.isNaN(year) || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return null;
  }

  return new Date(year, monthIndex, 1);
}

function parseDateParam(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [yearPart, monthPart, dayPart] = value.split("-");
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;
  const day = Number(dayPart);

  if (
    Number.isNaN(year) ||
    Number.isNaN(monthIndex) ||
    Number.isNaN(day) ||
    monthIndex < 0 ||
    monthIndex > 11 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return new Date(year, monthIndex, day, 0, 0, 0, 0);
}

function parseViewParam(value: string | undefined): CalendarViewMode {
  if (value === "day" || value === "week" || value === "month" || value === "year") {
    return value;
  }

  return "month";
}

function parseCsvParam(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePriorityFilter(value: string | undefined) {
  const validPriorities = new Set(Object.values(TaskPriority));
  return parseCsvParam(value).filter((priority): priority is TaskPriority =>
    validPriorities.has(priority as TaskPriority),
  );
}

function toggleValue(values: string[], value: string) {
  if (values.includes(value)) {
    return values.filter((entry) => entry !== value);
  }
  return [...values, value];
}

function togglePriorityValue(values: TaskPriority[], value: TaskPriority) {
  if (values.includes(value)) {
    return values.filter((entry) => entry !== value);
  }
  return [...values, value];
}

function toMonthParam(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

function toDateParam(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + amount);
  return shifted;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function clampTimelineHour(hour: number) {
  if (hour < 6) {
    return 6;
  }
  if (hour > 22) {
    return 22;
  }
  return hour;
}

function hourLabel(hour: number) {
  return `${`${hour}`.padStart(2, "0")}:00`;
}

function startOfWeek(date: Date, weekStartPreference: WeekStartPreference) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  const day = normalized.getDay();
  const offset = weekStartPreference === "sunday" ? -day : day === 0 ? -6 : 1 - day;
  normalized.setDate(normalized.getDate() + offset);
  return normalized;
}

function endOfWeek(date: Date, weekStartPreference: WeekStartPreference) {
  const start = startOfWeek(date, weekStartPreference);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

function shiftFocusDate(date: Date, view: CalendarViewMode, direction: -1 | 1) {
  const shifted = new Date(date);
  shifted.setHours(0, 0, 0, 0);

  if (view === "day") {
    shifted.setDate(shifted.getDate() + direction);
    return shifted;
  }

  if (view === "week") {
    shifted.setDate(shifted.getDate() + direction * 7);
    return shifted;
  }

  if (view === "month") {
    return new Date(shifted.getFullYear(), shifted.getMonth() + direction, 1);
  }

  return new Date(shifted.getFullYear() + direction, shifted.getMonth(), shifted.getDate());
}

function toCalendarHref(
  date: Date,
  view: CalendarViewMode,
  options?: {
    taskId?: string | null;
    sidebarOpen?: boolean;
    daySheetDate?: Date | null;
    priorities?: TaskPriority[];
    listIds?: string[];
    tagIds?: string[];
    showCompleted?: boolean;
  },
) {
  const params = new URLSearchParams();
  params.set("month", toMonthParam(date));
  params.set("date", toDateParam(date));
  params.set("view", view);

  if (options?.taskId) {
    params.set("task", options.taskId);
  }

  if (options?.sidebarOpen) {
    params.set("sidebar", "1");
  }

  if (options?.daySheetDate) {
    params.set("daySheet", toDateParam(options.daySheetDate));
  }

  if (options?.priorities && options.priorities.length > 0) {
    params.set("priorities", options.priorities.join(","));
  }

  if (options?.listIds && options.listIds.length > 0) {
    params.set("lists", options.listIds.join(","));
  }

  if (options?.tagIds && options.tagIds.length > 0) {
    params.set("tags", options.tagIds.join(","));
  }

  if (options?.showCompleted === false) {
    params.set("completed", "0");
  }

  return `/calendar?${params.toString()}`;
}

function getToolbarTitle(
  date: Date,
  view: CalendarViewMode,
  options: {
    localeTag: string;
    weekStartPreference: WeekStartPreference;
  },
) {
  const { localeTag, weekStartPreference } = options;

  if (view === "day") {
    return new Intl.DateTimeFormat(localeTag, {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);
  }

  if (view === "week") {
    const weekStart = startOfWeek(date, weekStartPreference);
    const weekEnd = endOfWeek(date, weekStartPreference);
    const shortFormatter = new Intl.DateTimeFormat(localeTag, {
      day: "2-digit",
      month: "short",
    });
    const endFormatter = new Intl.DateTimeFormat(localeTag, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return `${shortFormatter.format(weekStart)} - ${endFormatter.format(weekEnd)}`;
  }

  if (view === "year") {
    return new Intl.DateTimeFormat(localeTag, {
      year: "numeric",
    }).format(date);
  }

  return new Intl.DateTimeFormat(localeTag, {
    month: "long",
    year: "numeric",
  }).format(date);
}

function priorityTone(priority: TaskPriority) {
  if (priority === TaskPriority.URGENT) {
    return "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-400/45 dark:bg-rose-500/18 dark:text-rose-100";
  }

  if (priority === TaskPriority.HIGH) {
    return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/45 dark:bg-amber-500/18 dark:text-amber-100";
  }

  if (priority === TaskPriority.MEDIUM) {
    return "border-cyan-200 bg-cyan-50 text-cyan-900 dark:border-cyan-400/45 dark:bg-cyan-500/18 dark:text-cyan-100";
  }

  return "border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] text-[color:var(--ui-text-muted)]";
}

function priorityPillTone(priority: TaskPriority) {
  if (priority === TaskPriority.URGENT) {
    return "border-rose-200/90 bg-rose-50/95 dark:border-rose-400/45 dark:bg-rose-500/16";
  }

  if (priority === TaskPriority.HIGH) {
    return "border-amber-200/90 bg-amber-50/95 dark:border-amber-400/45 dark:bg-amber-500/16";
  }

  if (priority === TaskPriority.MEDIUM) {
    return "border-cyan-200/90 bg-cyan-50/95 dark:border-cyan-400/45 dark:bg-cyan-500/16";
  }

  return "border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)]";
}

function priorityDotTone(priority: TaskPriority) {
  if (priority === TaskPriority.URGENT) {
    return "bg-rose-500";
  }

  if (priority === TaskPriority.HIGH) {
    return "bg-amber-500";
  }

  if (priority === TaskPriority.MEDIUM) {
    return "bg-cyan-500";
  }

  return "bg-[color:var(--ui-text-muted)]";
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const [cookieStore, serverI18n] = await Promise.all([cookies(), getServerI18n()]);
  const { localeTag, t } = serverI18n;
  const cookieWeekStartPreference = cookieStore.get(UI_WEEK_START_COOKIE_KEY)?.value;
  const weekStartPreference: WeekStartPreference =
    cookieWeekStartPreference === "sunday" || cookieWeekStartPreference === "monday"
      ? cookieWeekStartPreference
      : DEFAULT_WEEK_START_PREFERENCE;
  const cookieShowCompletedPreference = cookieStore.get(UI_SHOW_COMPLETED_COOKIE_KEY)?.value;
  const showCompletedPreference =
    parseShowCompletedPreference(cookieShowCompletedPreference) ?? DEFAULT_SHOW_COMPLETED_TASKS_PREFERENCE;
  const user = await requireCurrentUser();
  const resolvedParams = await searchParams;
  const resolvedView = parseViewParam(resolvedParams.view);
  const resolvedDate = parseDateParam(resolvedParams.date) ?? parseMonthParam(resolvedParams.month) ?? new Date();
  resolvedDate.setHours(0, 0, 0, 0);

  const currentMonthDate = new Date(resolvedDate.getFullYear(), resolvedDate.getMonth(), 1, 0, 0, 0, 0);
  const resolvedDayStart = startOfDay(resolvedDate);
  const nextDayStart = addDays(resolvedDayStart, 1);
  const weekStartDate = startOfWeek(resolvedDate, weekStartPreference);
  const nextWeekStart = addDays(weekStartDate, 7);
  const yearStart = new Date(resolvedDate.getFullYear(), 0, 1, 0, 0, 0, 0);
  const nextYearStart = new Date(resolvedDate.getFullYear() + 1, 0, 1, 0, 0, 0, 0);
  const monthStart = new Date(
    currentMonthDate.getFullYear(),
    currentMonthDate.getMonth(),
    1,
    0,
    0,
    0,
    0,
  );
  const nextMonthStart = new Date(
    currentMonthDate.getFullYear(),
    currentMonthDate.getMonth() + 1,
    1,
    0,
    0,
    0,
    0,
  );
  const daysInMonth = new Date(
    currentMonthDate.getFullYear(),
    currentMonthDate.getMonth() + 1,
    0,
  ).getDate();
  const weekdayOffset =
    weekStartPreference === "sunday" ? monthStart.getDay() : (monthStart.getDay() + 6) % 7;
  const visibleCellCount = Math.ceil((weekdayOffset + daysInMonth) / 7) * 7;
  const selectedPriorityFilters = parsePriorityFilter(resolvedParams.priorities);
  const selectedListFilters = parseCsvParam(resolvedParams.lists);
  const selectedTagFilters = parseCsvParam(resolvedParams.tags);
  const showCompletedTasks =
    resolvedParams.completed === "0"
      ? false
      : resolvedParams.completed === "1"
        ? true
        : showCompletedPreference;
  const selectedPrioritySet = new Set(selectedPriorityFilters);
  const selectedListSet = new Set(selectedListFilters);
  const selectedTagSet = new Set(selectedTagFilters);
  let queryStart = monthStart;
  let queryEnd = nextMonthStart;

  if (resolvedView === "day") {
    queryStart = resolvedDayStart;
    queryEnd = nextDayStart;
  } else if (resolvedView === "week") {
    queryStart = weekStartDate;
    queryEnd = nextWeekStart;
  } else if (resolvedView === "year") {
    queryStart = yearStart;
    queryEnd = nextYearStart;
  }

  const tasks = await prisma.task.findMany({
    where: {
      AND: [
        taskAccessWhere(user.id),
        {
          dueDate: {
            gte: queryStart,
            lt: queryEnd,
          },
        },
      ],
    },
    orderBy: [{ dueDate: "asc" }],
    select: {
      id: true,
      title: true,
      dueDate: true,
      priority: true,
      isCompleted: true,
      list: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      tags: {
        select: {
          tagId: true,
          tag: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      },
    },
  });

  const availableListsMap = new Map<string, { id: string; name: string; color: string | null; count: number }>();
  const availableTagsMap = new Map<string, { id: string; name: string; color: string | null; count: number }>();

  for (const task of tasks) {
    if (task.list) {
      const existingList = availableListsMap.get(task.list.id);
      if (existingList) {
        existingList.count += 1;
      } else {
        availableListsMap.set(task.list.id, {
          id: task.list.id,
          name: task.list.name,
          color: task.list.color,
          count: 1,
        });
      }
    }

    for (const tagEntry of task.tags) {
      const existingTag = availableTagsMap.get(tagEntry.tag.id);
      if (existingTag) {
        existingTag.count += 1;
      } else {
        availableTagsMap.set(tagEntry.tag.id, {
          id: tagEntry.tag.id,
          name: tagEntry.tag.name,
          color: tagEntry.tag.color,
          count: 1,
        });
      }
    }
  }

  const availableLists = Array.from(availableListsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  const availableTags = Array.from(availableTagsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  const filteredTasks: typeof tasks = [];
  for (const task of tasks) {
    if (!showCompletedTasks && task.isCompleted) {
      continue;
    }
    if (selectedPrioritySet.size > 0 && !selectedPrioritySet.has(task.priority)) {
      continue;
    }
    if (selectedListSet.size > 0 && (!task.list || !selectedListSet.has(task.list.id))) {
      continue;
    }
    if (selectedTagSet.size > 0) {
      let hasMatchingTag = false;
      for (const tagEntry of task.tags) {
        if (selectedTagSet.has(tagEntry.tag.id)) {
          hasMatchingTag = true;
          break;
        }
      }
      if (!hasMatchingTag) {
        continue;
      }
    }
    filteredTasks.push(task);
  }

  const tasksByDate = new Map<string, CalendarTask[]>();

  for (const task of filteredTasks) {
    if (!task.dueDate) {
      continue;
    }

    const dateKey = toDateKey(task.dueDate);
    const byDateEntries = tasksByDate.get(dateKey) ?? [];
    byDateEntries.push({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      priority: task.priority,
      isCompleted: task.isCompleted,
      list: task.list,
      tags: task.tags,
    });
    tasksByDate.set(dateKey, byDateEntries);
  }

  const toolbarTitle = getToolbarTitle(resolvedDate, resolvedView, {
    localeTag,
    weekStartPreference,
  });
  const previousDate = shiftFocusDate(resolvedDate, resolvedView, -1);
  const nextDate = shiftFocusDate(resolvedDate, resolvedView, 1);
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const selectedTaskId = resolvedParams.task?.trim() || null;
  const selectedTask = selectedTaskId ? filteredTasks.find((task) => task.id === selectedTaskId) ?? null : null;
  const isSidebarSheetOpen = resolvedParams.sidebar === "1";
  const resolvedDaySheetDate = parseDateParam(resolvedParams.daySheet);
  if (resolvedDaySheetDate) {
    resolvedDaySheetDate.setHours(0, 0, 0, 0);
  }
  const isDaySheetOpen = resolvedView === "month" && Boolean(resolvedDaySheetDate);
  const daySheetDateKey =
    resolvedDaySheetDate && isDaySheetOpen ? toDateKey(resolvedDaySheetDate) : null;
  const daySheetTasks = daySheetDateKey ? tasksByDate.get(daySheetDateKey) ?? [] : [];
  const daySheetTitle = resolvedDaySheetDate
    ? new Intl.DateTimeFormat(localeTag, {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(resolvedDaySheetDate)
    : "";
  const quickCreateBaseDate =
    resolvedView === "month" ? resolvedDaySheetDate ?? todayDate : resolvedDaySheetDate ?? resolvedDate;
  const quickCreateDefaultDate = toDateParam(quickCreateBaseDate);
  const calendarHref = (
    date: Date,
    view: CalendarViewMode,
    options?: {
      taskId?: string | null;
      sidebarOpen?: boolean;
      daySheetDate?: Date | null;
      priorities?: TaskPriority[];
      listIds?: string[];
      tagIds?: string[];
      showCompleted?: boolean;
    },
  ) =>
    toCalendarHref(date, view, {
      priorities: selectedPriorityFilters,
      listIds: selectedListFilters,
      tagIds: selectedTagFilters,
      showCompleted: showCompletedTasks,
      ...options,
    });
  const closeSidebarHref = calendarHref(resolvedDate, resolvedView, {
    taskId: selectedTask?.id ?? null,
    daySheetDate: isDaySheetOpen ? resolvedDaySheetDate : undefined,
  });
  const openSidebarHref = calendarHref(resolvedDate, resolvedView, {
    taskId: selectedTask?.id ?? null,
    daySheetDate: isDaySheetOpen ? resolvedDaySheetDate : undefined,
    sidebarOpen: true,
  });
  const closeTaskHref = calendarHref(resolvedDate, resolvedView, {
    sidebarOpen: isSidebarSheetOpen,
    daySheetDate: isDaySheetOpen ? resolvedDaySheetDate : undefined,
  });
  const openTaskHref = (taskId: string) =>
    calendarHref(resolvedDate, resolvedView, {
      taskId,
      daySheetDate: isDaySheetOpen ? resolvedDaySheetDate : undefined,
    });
  const openDaySheetHref = (date: Date) =>
    calendarHref(resolvedDate, resolvedView, {
      daySheetDate: date,
      sidebarOpen: false,
      taskId: null,
    });
  const closeDaySheetHref = calendarHref(resolvedDate, resolvedView, {
    sidebarOpen: isSidebarSheetOpen,
    taskId: selectedTask?.id ?? null,
  });
  const clearFiltersHref = toCalendarHref(resolvedDate, resolvedView, {
    taskId: selectedTask?.id ?? null,
    sidebarOpen: isSidebarSheetOpen,
    showCompleted: true,
  });
  const toggleCompletedHref = calendarHref(resolvedDate, resolvedView, {
    taskId: selectedTask?.id ?? null,
    sidebarOpen: isSidebarSheetOpen,
    showCompleted: !showCompletedTasks,
  });
  const togglePriorityHref = (priority: TaskPriority) =>
    calendarHref(resolvedDate, resolvedView, {
      taskId: selectedTask?.id ?? null,
      sidebarOpen: isSidebarSheetOpen,
      priorities: togglePriorityValue(selectedPriorityFilters, priority),
    });
  const toggleListHref = (listId: string) =>
    calendarHref(resolvedDate, resolvedView, {
      taskId: selectedTask?.id ?? null,
      sidebarOpen: isSidebarSheetOpen,
      listIds: toggleValue(selectedListFilters, listId),
    });
  const toggleTagHref = (tagId: string) =>
    calendarHref(resolvedDate, resolvedView, {
      taskId: selectedTask?.id ?? null,
      sidebarOpen: isSidebarSheetOpen,
      tagIds: toggleValue(selectedTagFilters, tagId),
    });
  const hasActiveFilters =
    selectedPriorityFilters.length > 0 ||
    selectedListFilters.length > 0 ||
    selectedTagFilters.length > 0 ||
    !showCompletedTasks;
  const activeFilterCount =
    selectedPriorityFilters.length +
    selectedListFilters.length +
    selectedTagFilters.length +
    (showCompletedTasks ? 0 : 1);
  const viewLabelByMode: Record<CalendarViewMode, string> = {
    day: t("calendar.view.day"),
    week: t("calendar.view.week"),
    month: t("calendar.view.month"),
    year: t("calendar.view.year"),
  };
  const listNameById = new Map(availableLists.map((list) => [list.id, list.name]));
  const tagNameById = new Map(availableTags.map((tag) => [tag.id, tag.name]));
  const priorityLabelByValue: Record<TaskPriority, string> = {
    [TaskPriority.URGENT]: t("tasks.priority.urgent"),
    [TaskPriority.HIGH]: t("tasks.priority.high"),
    [TaskPriority.MEDIUM]: t("tasks.priority.medium"),
    [TaskPriority.LOW]: t("tasks.priority.low"),
  };
  const activeFilters = [
    ...selectedPriorityFilters.map((priority) => ({
      id: `priority-${priority}`,
      label: t("calendar.priorityLabel", { priority: priorityLabelByValue[priority] }),
      href: togglePriorityHref(priority),
    })),
    ...selectedListFilters.map((listId) => ({
      id: `list-${listId}`,
      label: t("tasks.filter.list", { name: listNameById.get(listId) ?? t("tasks.list") }),
      href: toggleListHref(listId),
    })),
    ...selectedTagFilters.map((tagId) => ({
      id: `tag-${tagId}`,
      label: t("tasks.filter.tag", { name: tagNameById.get(tagId) ?? t("tasks.tags") }),
      href: toggleTagHref(tagId),
    })),
    ...(!showCompletedTasks
      ? [
          {
            id: "completed-hidden",
            label: t("calendar.showCompleted"),
            href: toggleCompletedHref,
          },
        ]
      : []),
  ];

  const timeFormatter = new Intl.DateTimeFormat(localeTag, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const detailDateFormatter = new Intl.DateTimeFormat(localeTag, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const weekDays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(localeTag, {
      weekday: "short",
    })
      .format(addDays(weekStartDate, index))
      .replace(".", ""),
  );
  const timelineHours = Array.from({ length: 17 }, (_, index) => index + 6);
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(weekStartDate, index));
  const weekDayLabelFormatter = new Intl.DateTimeFormat(localeTag, {
    weekday: "short",
  });
  const weekDayNumberFormatter = new Intl.DateTimeFormat(localeTag, {
    day: "2-digit",
  });
  const dayTitleFormatter = new Intl.DateTimeFormat(localeTag, {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const yearMonthLabelFormatter = new Intl.DateTimeFormat(localeTag, {
    month: "long",
  });
  const miniWeekDays = weekDays.map((dayLabel) => dayLabel.slice(0, 1).toUpperCase());
  const todayDateKey = toDateKey(todayDate);
  const isFocusedDayToday = toDateKey(resolvedDate) === todayDateKey;
  const weekAllDayTasks = new Map<string, CalendarTask[]>();
  const weekTimedTasksByHour = new Map<string, CalendarTask[]>();
  const dayAllDayTasks: CalendarTask[] = [];
  const dayTimedTasksByHour = new Map<number, CalendarTask[]>();
  const dayDateKey = toDateKey(resolvedDate);
  const dayTasks = tasksByDate.get(dayDateKey) ?? [];
  const yearMonths = Array.from({ length: 12 }, (_, index) => new Date(resolvedDate.getFullYear(), index, 1));
  const monthWeeks = Array.from({ length: visibleCellCount / 7 }, (_, weekIndex) => {
    const cells = Array.from({ length: 7 }, (_, dayIndex) => {
      const cellIndex = weekIndex * 7 + dayIndex;
      const dayNumber = cellIndex - weekdayOffset + 1;
      const isVisibleMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
      const dayDate = isVisibleMonth
        ? new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), dayNumber)
        : null;
      const dayDateKey = dayDate ? toDateKey(dayDate) : null;
      const dayTasksForCell = dayDateKey ? tasksByDate.get(dayDateKey) ?? [] : [];
      const daySheetHref = dayDate ? openDaySheetHref(dayDate) : "";
      const isSelectedDayCell = Boolean(dayDateKey && daySheetDateKey === dayDateKey);
      const dayToggleHref = isSelectedDayCell ? closeDaySheetHref : daySheetHref;
      const isTodayCell =
        isVisibleMonth &&
        dayNumber === todayDate.getDate() &&
        todayDate.getMonth() === currentMonthDate.getMonth() &&
        todayDate.getFullYear() === currentMonthDate.getFullYear();

      return {
        cellIndex,
        dayNumber,
        isVisibleMonth,
        dayDate,
        dayTasksForCell,
        isSelectedDayCell,
        dayToggleHref,
        isTodayCell,
      };
    });

    return {
      weekIndex,
      cells,
      hasSelectedDay: cells.some((cell) => cell.isSelectedDayCell),
    };
  });

  for (const weekDate of weekDates) {
    const dateKey = toDateKey(weekDate);
    const dayTasks = tasksByDate.get(dateKey) ?? [];
    const allDayTasks: CalendarTask[] = [];

    for (const task of dayTasks) {
      const hours = task.dueDate.getHours();
      const minutes = task.dueDate.getMinutes();

      if (hours === 0 && minutes === 0) {
        allDayTasks.push(task);
        continue;
      }

      const timelineHour = clampTimelineHour(hours);
      const hourKey = `${dateKey}-${timelineHour}`;
      const hourEntries = weekTimedTasksByHour.get(hourKey) ?? [];
      hourEntries.push(task);
      weekTimedTasksByHour.set(hourKey, hourEntries);
    }

    if (allDayTasks.length > 0) {
      weekAllDayTasks.set(dateKey, allDayTasks);
    }
  }

  for (const task of dayTasks) {
    const hours = task.dueDate.getHours();
    const minutes = task.dueDate.getMinutes();

    if (hours === 0 && minutes === 0) {
      dayAllDayTasks.push(task);
      continue;
    }

    const timelineHour = clampTimelineHour(hours);
    const hourEntries = dayTimedTasksByHour.get(timelineHour) ?? [];
    hourEntries.push(task);
    dayTimedTasksByHour.set(timelineHour, hourEntries);
  }

  const renderSidebarPanelContent = (variant: "desktop" | "sheet") => {
    const isSheet = variant === "sheet";
    const chipHeightClass = isSheet ? "h-11" : "h-8";
    const listRowHeightClass = isSheet ? "min-h-11" : "min-h-10";
    const statusHeightClass = isSheet ? "h-11" : "h-10";
    const sectionSpacingClass = isSheet ? "mt-6" : "mt-5";

    return (
      <div className="flex h-full min-h-0 flex-col">
        {variant === "desktop" ? (
          <div className="border-b border-[color:var(--ui-border-soft)] px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[color:var(--ui-text-strong)]">{t("calendar.filters")}</p>
              {hasActiveFilters ? (
                <Link
                  href={clearFiltersHref}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] px-2.5 text-xs font-semibold text-[color:var(--ui-text-muted)] transition-colors hover:bg-[color:var(--ui-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)]"
                >
                  <span aria-hidden>↺</span>
                  {t("calendar.resetAll")}
                </Link>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">{t("calendar.refineHint")}</p>
            {hasActiveFilters ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {activeFilters.map((filter) => (
                  <Link
                    key={filter.id}
                    href={filter.href}
                    className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] px-2.5 text-[11px] font-medium text-[color:var(--ui-text-muted)] transition-colors hover:bg-[color:var(--ui-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)]"
                  >
                    <span className="truncate">{filter.label}</span>
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--ui-surface-3)] text-[11px] leading-none text-[color:var(--ui-text-muted)]">
                      ×
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          className={`flex-1 overflow-y-auto ${isSheet ? "px-4 py-4 pb-[max(16px,env(safe-area-inset-bottom))]" : "px-4 py-4"}`}
        >
          <section>
            <p className="text-xs font-semibold tracking-wide text-[color:var(--ui-text-muted)] uppercase">{t("sidebar.main")}</p>
            <div className="mt-3 space-y-2">
              <Link
                href="/"
                prefetch
                className={`flex ${listRowHeightClass} min-w-0 items-center gap-3 rounded-xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] px-3 py-2 text-sm font-semibold text-[color:var(--ui-text-muted)] transition-all duration-200 ease-out hover:bg-[color:var(--ui-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)]`}
              >
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[color:var(--ui-surface-3)] text-[color:var(--ui-text-muted)]" aria-hidden>
                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
                    <path
                      d="M8 6h11M8 12h11M8 18h11"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                    />
                    <circle cx="4.5" cy="6" r="1.2" fill="currentColor" />
                    <circle cx="4.5" cy="12" r="1.2" fill="currentColor" />
                    <circle cx="4.5" cy="18" r="1.2" fill="currentColor" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1 truncate">{t("nav.tasks")}</span>
              </Link>
              <Link
                href={calendarHref(resolvedDate, resolvedView)}
                prefetch
                aria-current="page"
                className={`flex ${listRowHeightClass} min-w-0 items-center gap-3 rounded-xl border border-[color:var(--ui-border-strong)] bg-[color:var(--ui-surface-3)] px-3 py-2 text-sm font-semibold text-[color:var(--ui-text-strong)] ring-2 ring-[color:var(--ui-border-soft)] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)]`}
              >
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[color:var(--primary-strong)] text-white" aria-hidden>
                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
                    <rect x="4" y="6" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.9" />
                    <path
                      d="M8 4v4M16 4v4M4 10h16"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <span className="min-w-0 flex-1 truncate">{t("nav.calendar")}</span>
              </Link>
            </div>
          </section>

          <div className={`${sectionSpacingClass} h-px bg-[color:var(--ui-border-soft)]`} aria-hidden />

          <section className={sectionSpacingClass}>
            <p className="text-xs font-semibold tracking-wide text-[color:var(--ui-text-muted)] uppercase">{t("calendar.priority")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  { value: TaskPriority.URGENT, label: t("tasks.priority.urgent"), dotClass: "bg-rose-500" },
                  { value: TaskPriority.HIGH, label: t("tasks.priority.high"), dotClass: "bg-amber-500" },
                  { value: TaskPriority.MEDIUM, label: t("tasks.priority.medium"), dotClass: "bg-cyan-500" },
                  { value: TaskPriority.LOW, label: t("tasks.priority.low"), dotClass: "bg-[color:var(--ui-text-muted)]" },
                ] as const
              ).map((priorityOption) => {
                const isActive = selectedPriorityFilters.includes(priorityOption.value);
                return (
                  <Link
                    key={priorityOption.value}
                    href={togglePriorityHref(priorityOption.value)}
                    className={`inline-flex ${chipHeightClass} items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)] ${
                      isActive
                        ? "border-[color:var(--ui-border-strong)] bg-[color:var(--ui-surface-3)] text-[color:var(--ui-text-strong)]"
                        : "border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] text-[color:var(--ui-text-muted)] hover:bg-[color:var(--ui-surface-3)]"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${priorityOption.dotClass}`} aria-hidden />
                    {priorityOption.label}
                  </Link>
                );
              })}
            </div>
          </section>

          <section className={sectionSpacingClass}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold tracking-wide text-[color:var(--ui-text-muted)] uppercase">{t("sidebar.lists")}</p>
              <p className="text-xs font-medium text-[color:var(--ui-text-soft)]">
                {selectedListFilters.length > 0
                  ? t("calendar.selectedCount", { count: selectedListFilters.length })
                  : t("tasks.filter.all")}
              </p>
            </div>
            {availableLists.length === 0 ? (
              <p className="mt-3 text-sm text-[color:var(--ui-text-soft)]">{t("calendar.noListsRange")}</p>
            ) : (
              <div className="mt-3 space-y-2">
                {availableLists.map((list) => {
                  const isActive = selectedListFilters.includes(list.id);
                  return (
                    <Link
                      key={list.id}
                      href={toggleListHref(list.id)}
                      className={`flex ${listRowHeightClass} min-w-0 items-center gap-3 rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)] ${
                        isActive
                          ? "border-[color:var(--ui-border-strong)] bg-[color:var(--ui-surface-3)] ring-2 ring-[color:var(--ui-border-soft)]"
                          : "border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] text-[color:var(--ui-text-muted)] hover:bg-[color:var(--ui-surface-3)]"
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/60"
                        style={{ backgroundColor: list.color ?? "#94a3b8" }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate">{list.name}</span>
                      <span className="shrink-0 rounded-full bg-[color:var(--ui-surface-3)] px-2 py-0.5 text-xs font-semibold text-[color:var(--ui-text-muted)]">
                        {list.count}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <div className={`${sectionSpacingClass} h-px bg-[color:var(--ui-border-soft)]`} aria-hidden />

          <section className={sectionSpacingClass}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold tracking-wide text-[color:var(--ui-text-muted)] uppercase">{t("sidebar.tags")}</p>
              <p className="text-xs font-medium text-[color:var(--ui-text-soft)]">
                {selectedTagFilters.length > 0
                  ? t("calendar.selectedCount", { count: selectedTagFilters.length })
                  : t("tasks.filter.all")}
              </p>
            </div>

            {availableTags.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] px-3 py-3">
                <p className="text-sm font-medium text-[color:var(--ui-text-muted)]">{t("calendar.noTagsRange")}</p>
                <p className="mt-1 text-xs text-[color:var(--ui-text-soft)]">{t("calendar.createTagHint")}</p>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {availableTags.map((tag) => {
                  const isActive = selectedTagFilters.includes(tag.id);
                  return (
                    <Link
                      key={tag.id}
                      href={toggleTagHref(tag.id)}
                      className={`inline-flex ${chipHeightClass} min-w-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)] ${
                        isActive
                          ? "border-[color:var(--ui-border-strong)] bg-[color:var(--ui-surface-3)] text-[color:var(--ui-text-strong)]"
                          : "border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] text-[color:var(--ui-text-muted)] hover:bg-[color:var(--ui-surface-3)]"
                      }`}
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: tag.color ?? "#94a3b8" }}
                        aria-hidden
                      />
                      <span className="max-w-[124px] truncate">{tag.name}</span>
                      <span className="shrink-0 rounded-full bg-[color:var(--ui-surface-3)] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--ui-text-muted)]">
                        {tag.count}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <div className={`${sectionSpacingClass} h-px bg-[color:var(--ui-border-soft)]`} aria-hidden />

          <section className={sectionSpacingClass}>
            <p className="text-xs font-semibold tracking-wide text-[color:var(--ui-text-muted)] uppercase">{t("calendar.status")}</p>
            <Link
              href={toggleCompletedHref}
              role="switch"
              aria-checked={showCompletedTasks}
              className={`mt-3 flex ${statusHeightClass} items-center justify-between rounded-xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] px-3 transition-colors duration-200 ease-out hover:bg-[color:var(--ui-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)]`}
            >
              <span className="text-sm font-medium text-[color:var(--ui-text-muted)]">{t("calendar.showCompleted")}</span>
              <span
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ease-out ${
                  showCompletedTasks ? "bg-[color:var(--primary-strong)]" : "bg-[color:var(--ui-border-strong)]"
                }`}
                aria-hidden
              >
                <span
                  className={`h-4 w-4 rounded-full bg-[color:var(--ui-surface-1)] shadow-[var(--ui-shadow-xs)] transition-transform duration-200 ease-out ${
                    showCompletedTasks ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </span>
            </Link>
          </section>
        </div>
      </div>
    );
  };

  const renderDayDetailsPanel = (viewport: "mobile" | "desktop") => {
    const hasSelectedDay = Boolean(isDaySheetOpen && resolvedDaySheetDate);

    return (
      <aside
        className={`min-h-0 overflow-hidden rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)] shadow-[0_16px_32px_-24px_rgb(15_23_42/0.85)] ${
          viewport === "mobile" ? "mt-2" : "h-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--ui-border-soft)] px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.12em] text-[color:var(--ui-text-muted)] uppercase">{t("calendar.dayTasks")}</p>
            <p className="truncate text-sm font-semibold capitalize text-[color:var(--ui-text-strong)]">
              {hasSelectedDay ? daySheetTitle : t("calendar.selectDay")}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-[color:var(--ui-text-muted)]">
              {hasSelectedDay
                ? t("lists.preview.tasks", { count: daySheetTasks.length })
                : t("calendar.tapDateHint")}
            </p>
          </div>
          {hasSelectedDay ? (
            <Link
              href={closeDaySheetHref}
              aria-label={t("calendar.closeDayDetails")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] text-[color:var(--ui-text-muted)] transition-colors hover:bg-[color:var(--ui-surface-3)]"
            >
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden>
                <path
                  d="m6 6 8 8m0-8-8 8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </Link>
          ) : null}
        </div>
        <div
          className={`space-y-2 overflow-y-auto p-3 ${
            viewport === "mobile" ? "max-h-[220px]" : "max-h-[520px]"
          }`}
        >
          {!hasSelectedDay ? (
            <div className="rounded-xl border border-dashed border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] px-3 py-3">
              <p className="text-sm font-medium text-[color:var(--ui-text-muted)]">{t("calendar.noDaySelected")}</p>
              <p className="mt-1 text-xs text-[color:var(--ui-text-soft)]">{t("calendar.tapDateHint")}</p>
            </div>
          ) : daySheetTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] px-3 py-3">
              <p className="text-sm font-medium text-[color:var(--ui-text-muted)]">{t("calendar.noTasksForDay")}</p>
              <p className="mt-1 text-xs text-[color:var(--ui-text-soft)]">{t("calendar.selectAnotherDate")}</p>
            </div>
          ) : (
            daySheetTasks.map((task) => {
              const timeLabel =
                task.dueDate.getHours() === 0 && task.dueDate.getMinutes() === 0
                  ? t("calendar.allDay")
                  : timeFormatter.format(task.dueDate);
              const priorityLabel =
                task.priority === TaskPriority.URGENT
                  ? t("tasks.priority.urgent")
                  : task.priority === TaskPriority.HIGH
                    ? t("tasks.priority.high")
                    : task.priority === TaskPriority.MEDIUM
                      ? t("tasks.priority.medium")
                      : t("tasks.priority.low");

              return (
                <Link
                  key={task.id}
                  href={openTaskHref(task.id)}
                  className={`group block min-w-0 rounded-xl border border-[color:var(--ui-border-soft)] px-2.5 py-2 shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-sm ${priorityPillTone(task.priority)} ${
                    task.isCompleted ? "opacity-70" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <span className="shrink-0 rounded-md bg-[color:var(--ui-surface-2)] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[color:var(--ui-text-muted)]">
                      {timeLabel}
                    </span>
                    <p
                      className={`min-w-0 flex-1 truncate text-[13px] font-semibold text-[color:var(--ui-text-strong)] ${
                        task.isCompleted ? "line-through" : ""
                      }`}
                    >
                      {task.title}
                    </p>
                  </div>
                  <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className="inline-flex rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--ui-text-muted)]">
                      {priorityLabel}
                    </span>
                    {task.list ? (
                      <span className="inline-flex min-w-0 items-center gap-1 rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--ui-text-muted)]">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: task.list.color ?? "#94a3b8" }}
                          aria-hidden
                        />
                        <span className="max-w-[110px] truncate">{task.list.name}</span>
                      </span>
                    ) : null}
                    {task.tags[0] ? (
                      <span className="inline-flex min-w-0 items-center gap-1 rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--ui-text-muted)]">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: task.tags[0].tag.color ?? "#94a3b8" }}
                          aria-hidden
                        />
                        <span className="max-w-[96px] truncate">{task.tags[0].tag.name}</span>
                      </span>
                    ) : null}
                    {task.isCompleted ? (
                      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        {t("tasks.views.completed")}
                      </span>
                    ) : null}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </aside>
    );
  };

  return (
    <section
      className="h-full min-h-0 w-full max-w-none overflow-hidden"
    >
      <div
        className={`grid h-full min-h-0 gap-3 ${
          selectedTask ? "lg:grid-cols-[320px_minmax(0,1fr)_360px]" : "lg:grid-cols-[320px_minmax(0,1fr)]"
        }`}
      >
        <aside className="hidden min-h-0 min-w-0 overflow-hidden rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] shadow-sm backdrop-blur-sm lg:flex lg:h-full lg:flex-col">
          {renderSidebarPanelContent("desktop")}
        </aside>
        <div className="ui-card relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[24px] p-0">
        <div className="sticky top-0 z-20 shrink-0 border-b border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)] px-3 py-3 backdrop-blur sm:px-4 sm:py-3.5">
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="ui-kicker ui-kicker--muted">{t("nav.calendar")}</p>
                <h1 className="truncate text-lg font-bold capitalize text-[color:var(--ui-text-strong)] sm:text-2xl">{toolbarTitle}</h1>
              </div>
              <div className="flex items-center gap-2 lg:hidden">
                <Link
                  href={openSidebarHref}
                  aria-label={t("calendar.openFilters")}
                  aria-haspopup="dialog"
                  aria-expanded={isSidebarSheetOpen}
                  aria-controls="calendar-filters-sheet"
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] px-4 text-sm font-semibold text-[color:var(--ui-text-muted)] transition-all duration-200 ease-out hover:bg-[color:var(--ui-surface-3)]"
                >
                  {t("calendar.filters")}
                  {activeFilterCount > 0 ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--primary-strong)] px-1 text-[11px] font-semibold text-white">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </Link>
                <MobileNewTaskButton
                  defaultDate={quickCreateDefaultDate}
                  compact
                  className="inline-flex sm:hidden"
                />
                <MobileNewTaskButton
                  defaultDate={quickCreateDefaultDate}
                  className="hidden sm:inline-flex lg:hidden"
                />
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:justify-end lg:gap-3">
              <div className="inline-flex items-center rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)] p-1">
                <Link
                  href={calendarHref(previousDate, resolvedView)}
                  aria-label={t("calendar.previousPeriod")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] text-[color:var(--ui-text-muted)] transition-all duration-200 ease-out hover:bg-[color:var(--ui-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)]"
                >
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-4 w-4">
                    <path
                      d="M12.5 4.5L7 10l5.5 5.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
                <Link
                  href={calendarHref(todayDate, resolvedView)}
                  className="inline-flex h-9 items-center justify-center rounded-xl px-3 text-sm font-semibold text-[color:var(--ui-text-strong)] transition-all duration-200 ease-out hover:bg-[color:var(--ui-surface-3)]"
                >
                  {t("sidebar.today")}
                </Link>
                <Link
                  href={calendarHref(nextDate, resolvedView)}
                  aria-label={t("calendar.nextPeriod")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] text-[color:var(--ui-text-muted)] transition-all duration-200 ease-out hover:bg-[color:var(--ui-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)]"
                >
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-4 w-4">
                    <path
                      d="M7.5 4.5L13 10l-5.5 5.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </div>

              <div className="-mx-1 overflow-x-auto pb-1 sm:mx-0 sm:overflow-visible sm:pb-0">
                <div className="inline-flex min-w-max items-center rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)] p-1">
                  {calendarViews.map((view) => {
                    const isActive = resolvedView === view;
                    return (
                      <Link
                        key={view}
                        href={calendarHref(resolvedDate, view)}
                        aria-current={isActive ? "page" : undefined}
                        className={`inline-flex h-9 items-center justify-center rounded-xl px-3 text-sm font-semibold transition-all duration-200 ease-out ${
                          isActive
                            ? "bg-[color:var(--primary-strong)] text-white shadow-[var(--ui-shadow-sm)]"
                            : "text-[color:var(--ui-text-muted)] hover:bg-[color:var(--ui-surface-3)] hover:text-[color:var(--ui-text-strong)]"
                        }`}
                      >
                        {viewLabelByMode[view]}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="hidden items-center gap-2 lg:flex">
                <MobileNewTaskButton
                  defaultDate={quickCreateDefaultDate}
                  className="hidden lg:inline-flex"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-3 sm:p-4 md:p-5">
          {resolvedView === "day" ? (
            <section className="flex h-full min-h-0 flex-col">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)]">
                <div className="flex items-center justify-between border-b border-[color:var(--ui-border-soft)] px-3 py-3 sm:px-4">
                  <p
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-semibold capitalize ${
                      isFocusedDayToday
                        ? "bg-[color:var(--ui-surface-3)] text-[color:var(--ui-text-strong)] ring-1 ring-[color:var(--ui-border-soft)]"
                        : "text-[color:var(--ui-text-strong)]"
                    }`}
                  >
                    {dayTitleFormatter.format(resolvedDate)}
                  </p>
                  <p className="text-xs font-semibold text-[color:var(--ui-text-muted)]">{t("lists.preview.tasks", { count: dayTasks.length })}</p>
                </div>

                <div className="border-b border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] px-3 py-2.5 sm:px-4">
                  <p className="text-[10px] font-bold tracking-[0.1em] text-[color:var(--ui-text-muted)] uppercase">{t("calendar.allDay")}</p>
                  {dayAllDayTasks.length === 0 ? (
                    <p className="mt-1 text-xs text-[color:var(--ui-text-soft)]">{t("calendar.noAllDayTasks")}</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {dayAllDayTasks.map((task) => (
                        <Link
                          key={task.id}
                          href={openTaskHref(task.id)}
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityTone(task.priority)} ${
                            task.isCompleted ? "line-through opacity-60" : ""
                          }`}
                        >
                          {task.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  {timelineHours.map((hour) => {
                    const hourTasks = dayTimedTasksByHour.get(hour) ?? [];
                    return (
                      <div key={hour} className="grid grid-cols-[64px_minmax(0,1fr)] border-b border-[color:var(--ui-border-soft)] last:border-b-0">
                        <div className="border-r border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)] px-2 py-2 text-[10px] font-semibold tracking-[0.08em] text-[color:var(--ui-text-muted)] uppercase">
                          {hourLabel(hour)}
                        </div>
                        <div className="min-h-[62px] px-2 py-1.5">
                          <div className="space-y-1">
                            {hourTasks.slice(0, 3).map((task) => (
                              <Link
                                key={task.id}
                                href={openTaskHref(task.id)}
                                className={`rounded-lg border px-2 py-1 text-xs font-semibold leading-tight ${priorityTone(task.priority)} ${
                                  task.isCompleted ? "line-through opacity-60" : ""
                                }`}
                              >
                                <p className="truncate">{task.title}</p>
                                <p className="text-[10px] font-medium opacity-80">{timeFormatter.format(task.dueDate)}</p>
                              </Link>
                            ))}
                            {hourTasks.length > 3 ? (
                              <p className="text-[10px] font-semibold text-[color:var(--ui-text-muted)]">{t("calendar.moreCount", { count: hourTasks.length - 3 })}</p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          ) : resolvedView === "week" ? (
            <section className="flex h-full min-h-0 flex-col">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)]">
                <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
                  <div className="min-h-full min-w-[860px] lg:min-w-0">
                    <div className="grid grid-cols-[68px_repeat(7,minmax(0,1fr))] border-b border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)]">
                      <div className="sticky left-0 z-20 border-r border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)] px-2 py-2 text-[10px] font-semibold tracking-[0.1em] text-[color:var(--ui-text-soft)] uppercase">
                        {t("calendar.time")}
                      </div>
                      {weekDates.map((weekDate) => {
                        const dateKey = toDateKey(weekDate);
                        const isToday = dateKey === todayDateKey;
                        return (
                          <div
                            key={dateKey}
                            className={`border-r border-[color:var(--ui-border-soft)] px-2 py-2 text-center last:border-r-0 ${
                              isToday ? "bg-[color:var(--ui-surface-3)] ring-1 ring-inset ring-[color:var(--ui-border-soft)]" : ""
                            }`}
                          >
                            <p
                              className={`text-[10px] font-bold tracking-[0.08em] uppercase ${
                                isToday ? "text-[color:var(--ui-text-muted)]" : "text-[color:var(--ui-text-muted)]"
                              }`}
                            >
                              {weekDayLabelFormatter.format(weekDate)}
                            </p>
                            <p className="mt-1">
                              <span
                                className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                                  isToday ? "bg-black text-white" : "text-[color:var(--ui-text-muted)]"
                                }`}
                              >
                                {weekDayNumberFormatter.format(weekDate)}
                              </span>
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-[68px_repeat(7,minmax(0,1fr))] border-b border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)]">
                      <div className="sticky left-0 z-10 border-r border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] px-2 py-2 text-[10px] font-semibold tracking-[0.1em] text-[color:var(--ui-text-soft)] uppercase">
                        {t("calendar.allDay")}
                      </div>
                      {weekDates.map((weekDate) => {
                        const dateKey = toDateKey(weekDate);
                        const allDayTasks = weekAllDayTasks.get(dateKey) ?? [];
                        return (
                          <div key={dateKey} className="min-h-12 border-r border-[color:var(--ui-border-soft)] px-1.5 py-1.5 last:border-r-0">
                            <div className="space-y-1">
                              {allDayTasks.slice(0, 2).map((task) => (
                                <Link
                                  key={task.id}
                                  href={openTaskHref(task.id)}
                                  className={`rounded-lg border px-2 py-1 text-[11px] font-semibold leading-tight ${priorityTone(task.priority)} ${
                                    task.isCompleted ? "line-through opacity-60" : ""
                                  }`}
                                >
                                  <p className="truncate">{task.title}</p>
                                </Link>
                              ))}
                              {allDayTasks.length > 2 ? (
                                <p className="px-1 text-[10px] font-semibold text-[color:var(--ui-text-muted)]">
                                  {t("calendar.moreCount", { count: allDayTasks.length - 2 })}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {timelineHours.map((hour) => (
                      <div
                        key={hour}
                        className="grid grid-cols-[68px_repeat(7,minmax(0,1fr))] border-b border-[color:var(--ui-border-soft)] last:border-b-0"
                      >
                        <div className="sticky left-0 z-10 border-r border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)] px-2 py-2 text-[10px] font-semibold tracking-[0.08em] text-[color:var(--ui-text-muted)] uppercase">
                          {hourLabel(hour)}
                        </div>
                        {weekDates.map((weekDate) => {
                          const dateKey = toDateKey(weekDate);
                          const hourTasks = weekTimedTasksByHour.get(`${dateKey}-${hour}`) ?? [];
                          return (
                            <div key={dateKey} className="min-h-[64px] border-r border-[color:var(--ui-border-soft)] px-1.5 py-1.5 last:border-r-0">
                              <div className="space-y-1">
                                {hourTasks.slice(0, 2).map((task) => (
                                  <Link
                                    key={task.id}
                                    href={openTaskHref(task.id)}
                                    className={`rounded-lg border px-2 py-1 text-[11px] font-semibold leading-tight ${priorityTone(task.priority)} ${
                                      task.isCompleted ? "line-through opacity-60" : ""
                                    }`}
                                  >
                                    <p className="truncate">{task.title}</p>
                                    <p className="text-[10px] font-medium opacity-80">
                                      {timeFormatter.format(task.dueDate)}
                                    </p>
                                  </Link>
                                ))}
                                {hourTasks.length > 2 ? (
                                  <p className="px-1 text-[10px] font-semibold text-[color:var(--ui-text-muted)]">
                                    {t("calendar.moreCount", { count: hourTasks.length - 2 })}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ) : resolvedView === "year" ? (
            <section className="flex h-full min-h-0 flex-col">
              <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 auto-rows-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {yearMonths.map((monthDate) => {
                  const monthIndex = monthDate.getMonth();
                  const miniMonthStart = new Date(resolvedDate.getFullYear(), monthIndex, 1);
                  const miniDaysInMonth = new Date(resolvedDate.getFullYear(), monthIndex + 1, 0).getDate();
                  const miniWeekdayOffset = (miniMonthStart.getDay() + 6) % 7;
                  const miniVisibleCellCount = Math.ceil((miniWeekdayOffset + miniDaysInMonth) / 7) * 7;
                  let monthTaskCount = 0;

                  for (let day = 1; day <= miniDaysInMonth; day += 1) {
                    const dateKey = toDateKey(new Date(resolvedDate.getFullYear(), monthIndex, day));
                    monthTaskCount += tasksByDate.get(dateKey)?.length ?? 0;
                  }

                  return (
                    <Link
                      key={monthIndex}
                      href={calendarHref(miniMonthStart, "month")}
                      className="group flex h-full min-h-0 flex-col rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)] p-3 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:border-[color:var(--ui-border-strong)] hover:shadow-[0_16px_28px_-20px_rgb(15_23_42/0.8)]"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold capitalize text-[color:var(--ui-text-strong)]">
                          {yearMonthLabelFormatter.format(monthDate)}
                        </p>
                        <p className="text-[11px] font-semibold text-[color:var(--ui-text-muted)]">{monthTaskCount}</p>
                      </div>
                      <div className="grid flex-1 content-start grid-cols-7 gap-1">
                        {miniWeekDays.map((day, dayIndex) => (
                          <p
                            key={`${day}-${dayIndex}`}
                            className="text-center text-[9px] font-bold tracking-[0.08em] text-[color:var(--ui-text-soft)]"
                          >
                            {day}
                          </p>
                        ))}
                        {Array.from({ length: miniVisibleCellCount }).map((_, index) => {
                          const dayNumber = index - miniWeekdayOffset + 1;
                          const isVisibleMonth = dayNumber >= 1 && dayNumber <= miniDaysInMonth;
                          if (!isVisibleMonth) {
                            return <span key={index} className="h-7 rounded-md" aria-hidden />;
                          }
                          const dateKey = toDateKey(new Date(resolvedDate.getFullYear(), monthIndex, dayNumber));
                          const dayTaskCount = tasksByDate.get(dateKey)?.length ?? 0;
                          return (
                            <span
                              key={index}
                              className={`grid h-7 place-items-center rounded-md text-[10px] font-semibold ${
                                dayTaskCount > 0
                                  ? "bg-[color:var(--ui-surface-3)] text-[color:var(--ui-text-strong)]"
                                  : "text-[color:var(--ui-text-muted)] group-hover:bg-[color:var(--ui-surface-3)]"
                              }`}
                            >
                              {dayNumber}
                            </span>
                          );
                        })}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : (
            <>
              <section className="md:hidden">
                <div className="rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] p-2">
                  <div className="grid grid-cols-7 gap-1">
                    {weekDays.map((day) => (
                      <p key={day} className="px-1 py-1 text-center text-[10px] font-bold tracking-[0.08em] text-[color:var(--ui-text-muted)] uppercase">
                        {day}
                      </p>
                    ))}
                    {monthWeeks.map((week) => (
                      <div key={week.weekIndex} className="contents">
                        {week.cells.map((cell) => (
                          <article
                            key={cell.cellIndex}
                            className={`relative min-h-[88px] min-w-0 overflow-hidden rounded-xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] p-2 ${
                              cell.isVisibleMonth
                                ? cell.isSelectedDayCell
                                  ? "border-[color:var(--ui-border-strong)] bg-[color:var(--ui-surface-3)] ring-2 ring-[color:var(--ui-border-strong)]"
                                  : cell.isTodayCell
                                    ? "border-[color:var(--ui-border-strong)] bg-[color:var(--ui-surface-3)] ring-2 ring-[color:var(--ui-border-soft)]"
                                    : ""
                                : "border-transparent bg-transparent"
                            }`}
                          >
                            {cell.isVisibleMonth && cell.dayDate ? (
                              <>
                                <Link
                                  href={cell.dayToggleHref}
                                  aria-label={
                                    cell.isSelectedDayCell
                                      ? t("calendar.closeTasksForDay", { day: cell.dayNumber })
                                      : t("calendar.openTasksForDay", { day: cell.dayNumber })
                                  }
                                  className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)]"
                                />
                                <div className="relative z-10 min-w-0 pointer-events-none">
                                  <p>
                                    <span
                                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                                        cell.isTodayCell ? "bg-black text-white" : "text-[color:var(--ui-text-muted)]"
                                      }`}
                                    >
                                      {cell.dayNumber}
                                    </span>
                                  </p>
                                  <div className="mt-1 min-w-0">
                                    {cell.dayTasksForCell.length > 0 ? (
                                      <div className="flex items-center gap-1">
                                        {cell.dayTasksForCell.slice(0, 2).map((task) => (
                                          <Link
                                            key={task.id}
                                            href={openTaskHref(task.id)}
                                            aria-label={task.title}
                                            className={`pointer-events-auto h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/90 transition-transform duration-200 ease-out hover:scale-110 ${
                                              priorityDotTone(task.priority)
                                            } ${task.isCompleted ? "opacity-45" : ""}`}
                                          />
                                        ))}
                                        <Link
                                          href={cell.dayToggleHref}
                                          aria-label={t("lists.preview.tasks", { count: cell.dayTasksForCell.length })}
                                          className="pointer-events-auto ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--ui-surface-3)] px-1 text-[9px] font-semibold text-[color:var(--ui-text-muted)] transition-colors hover:bg-[color:var(--ui-surface-2)]"
                                        >
                                          {cell.dayTasksForCell.length}
                                        </Link>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </>
                            ) : null}
                          </article>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                {isDaySheetOpen && resolvedDaySheetDate ? renderDayDetailsPanel("mobile") : null}
              </section>

              <div
                className={`hidden h-full min-h-0 md:grid ${
                  isDaySheetOpen && resolvedDaySheetDate
                    ? "md:grid-cols-[minmax(0,1fr)_320px] md:gap-3"
                    : "md:grid-cols-1"
                }`}
              >
                <div className="h-full min-h-0 overflow-x-auto rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] p-3">
                  <div
                    className="grid h-full min-h-full min-w-[680px] grid-cols-7 gap-2 lg:min-w-0"
                    style={{
                      gridTemplateRows: `auto repeat(${monthWeeks.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {weekDays.map((day) => (
                      <p key={day} className="px-2 py-1 text-xs font-bold tracking-[0.12em] text-[color:var(--ui-text-muted)] uppercase">
                        {day}
                      </p>
                    ))}
                    {monthWeeks.map((week) => (
                      <div key={week.weekIndex} className="contents">
                        {week.cells.map((cell) => (
                          <article
                            key={cell.cellIndex}
                            className={`relative h-full min-h-0 min-w-0 overflow-hidden rounded-xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] p-2 transition-all duration-200 ease-out ${
                              cell.isVisibleMonth
                                ? `${cell.isSelectedDayCell ? "border-[color:var(--ui-border-strong)] bg-[color:var(--ui-surface-3)] ring-2 ring-[color:var(--ui-border-strong)] " : cell.isTodayCell ? "border-[color:var(--ui-border-strong)] bg-[color:var(--ui-surface-3)] ring-2 ring-[color:var(--ui-border-soft)] " : ""}shadow-[0_10px_24px_-22px_rgb(15_23_42/0.9)] hover:-translate-y-[1px] hover:shadow-[0_14px_26px_-20px_rgb(15_23_42/0.85)]`
                                : "border-transparent bg-transparent"
                            }`}
                          >
                            {cell.isVisibleMonth && cell.dayDate ? (
                              <>
                                <Link
                                  href={cell.dayToggleHref}
                                  aria-label={
                                    cell.isSelectedDayCell
                                      ? t("calendar.closeTasksForDay", { day: cell.dayNumber })
                                      : t("calendar.openTasksForDay", { day: cell.dayNumber })
                                  }
                                  className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)]"
                                />
                                <div className="relative z-10 min-w-0 pointer-events-none">
                                  <p>
                                    <span
                                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                                        cell.isTodayCell ? "bg-black text-white" : "text-[color:var(--ui-text-strong)]"
                                      }`}
                                    >
                                      {cell.dayNumber}
                                    </span>
                                  </p>
                                  <div className="mt-1 min-w-0 space-y-1">
                                    {cell.dayTasksForCell.length === 0 ? (
                                      <p className="text-xs font-medium text-[color:var(--ui-text-soft)]">{t("calendar.noTasks")}</p>
                                    ) : (
                                      cell.dayTasksForCell.slice(0, 3).map((task, taskIndex) => (
                                        <CalendarTaskPill
                                          key={task.id}
                                          href={openTaskHref(task.id)}
                                          title={task.title}
                                          toneClass={priorityPillTone(task.priority)}
                                          timeLabel={
                                            task.dueDate.getHours() === 0 && task.dueDate.getMinutes() === 0
                                              ? undefined
                                              : timeFormatter.format(task.dueDate)
                                          }
                                          className={`pointer-events-auto ${task.isCompleted ? "line-through opacity-60" : ""} ${
                                            taskIndex === 2 ? "hidden lg:flex" : ""
                                          }`}
                                        />
                                      ))
                                    )}
                                    {cell.dayTasksForCell.length > 2 ? (
                                      <Link
                                        href={cell.dayToggleHref}
                                        className="pointer-events-auto inline-flex rounded-md bg-[color:var(--ui-surface-3)] px-1.5 py-0.5 text-[11px] font-semibold text-[color:var(--ui-text-muted)] transition-colors hover:bg-[color:var(--ui-surface-3)] lg:hidden"
                                      >
                                        {t("calendar.moreCount", { count: cell.dayTasksForCell.length - 2 })}
                                      </Link>
                                    ) : null}
                                    {cell.dayTasksForCell.length > 3 ? (
                                      <Link
                                        href={cell.dayToggleHref}
                                        className="pointer-events-auto hidden rounded-md bg-[color:var(--ui-surface-3)] px-1.5 py-0.5 text-[11px] font-semibold text-[color:var(--ui-text-muted)] transition-colors hover:bg-[color:var(--ui-surface-3)] lg:inline-flex"
                                      >
                                        {t("calendar.moreCount", { count: cell.dayTasksForCell.length - 3 })}
                                      </Link>
                                    ) : null}
                                  </div>
                                </div>
                              </>
                            ) : null}
                          </article>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                {isDaySheetOpen && resolvedDaySheetDate ? renderDayDetailsPanel("desktop") : null}
              </div>
            </>
          )}
        </div>
      </div>
      {selectedTask ? (
        <aside className="hidden min-h-0 min-w-0 overflow-hidden rounded-2xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)] lg:flex lg:h-full lg:flex-col">
          <div className="flex items-center justify-between border-b border-[color:var(--ui-border-soft)] px-4 py-3">
            <p className="text-[10px] font-bold tracking-[0.12em] text-[color:var(--ui-text-muted)] uppercase">{t("calendar.taskDetail")}</p>
            <Link
              href={closeTaskHref}
              className="inline-flex h-8 items-center rounded-lg border border-[color:var(--ui-border-soft)] px-2.5 text-xs font-semibold text-[color:var(--ui-text-muted)] transition-colors hover:bg-[color:var(--ui-surface-3)]"
            >
              {t("common.close")}
            </Link>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.1em] text-[color:var(--ui-text-muted)] uppercase">{t("calendar.detail.title")}</p>
              <h2 className="mt-1 text-lg font-semibold text-[color:var(--ui-text-strong)]">{selectedTask.title}</h2>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.1em] text-[color:var(--ui-text-muted)] uppercase">{t("calendar.detail.dueDate")}</p>
              <p className="mt-1 text-sm font-medium capitalize text-[color:var(--ui-text-muted)]">
                {selectedTask.dueDate ? detailDateFormatter.format(selectedTask.dueDate) : t("calendar.detail.noDueDate")}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.1em] text-[color:var(--ui-text-muted)] uppercase">{t("calendar.detail.priority")}</p>
              <span className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityTone(selectedTask.priority)}`}>
                {priorityLabelByValue[selectedTask.priority]}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.1em] text-[color:var(--ui-text-muted)] uppercase">{t("calendar.status")}</p>
              <p className="mt-1 text-sm font-medium text-[color:var(--ui-text-muted)]">
                {selectedTask.isCompleted ? t("tasks.views.completed") : t("tasks.views.pending")}
              </p>
            </div>
          </div>
        </aside>
      ) : null}
      </div>
      {isSidebarSheetOpen ? (
        <div className="fixed inset-0 z-[125] lg:hidden" role="presentation">
          <SheetA11yBridge closeHref={closeSidebarHref} initialFocusId="calendar-filters-close" />
          <Link
            href={closeSidebarHref}
            aria-label={t("calendar.closeFilters")}
            className="ui-overlay-fade-in absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          />
          <aside
            id="calendar-filters-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t("calendar.filters")}
            className="ui-sheet-in-right absolute inset-y-0 left-0 z-[1] h-full w-full max-w-full border-r border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)] pt-[max(0px,env(safe-area-inset-top))] shadow-[0_22px_56px_-36px_rgb(15_23_42/0.72)] backdrop-blur-sm sm:max-w-md sm:rounded-r-3xl"
          >
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[color:var(--ui-text-strong)]">{t("calendar.filters")}</p>
                    <p className="mt-1 text-xs text-[color:var(--ui-text-muted)]">{t("calendar.refineHint")}</p>
                  </div>
                  <Link
                    id="calendar-filters-close"
                    href={closeSidebarHref}
                    className="inline-flex h-11 items-center rounded-xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] px-4 text-sm font-semibold text-[color:var(--ui-text-muted)] transition-colors hover:bg-[color:var(--ui-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)]"
                  >
                    {t("common.close")}
                  </Link>
                </div>
                {hasActiveFilters ? (
                  <div className="mt-3">
                    <Link
                      href={clearFiltersHref}
                      className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] px-4 text-sm font-semibold text-[color:var(--ui-text-muted)] transition-colors hover:bg-[color:var(--ui-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)]"
                    >
                      <span aria-hidden>↺</span>
                      {t("calendar.resetAll")}
                    </Link>
                  </div>
                ) : null}
                {hasActiveFilters ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeFilters.map((filter) => (
                      <Link
                        key={filter.id}
                        href={filter.href}
                        className="inline-flex h-10 max-w-full items-center gap-2 rounded-full border border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-2)] px-3 text-xs font-medium text-[color:var(--ui-text-muted)] transition-colors hover:bg-[color:var(--ui-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-ring-color)]"
                      >
                        <span className="truncate">{filter.label}</span>
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--ui-surface-3)] text-[11px] leading-none text-[color:var(--ui-text-muted)]">
                          ×
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
              {renderSidebarPanelContent("sheet")}
            </div>
          </aside>
        </div>
      ) : null}

      {selectedTask ? (
        <div className="fixed inset-0 z-[130] lg:hidden" role="presentation">
          <SheetA11yBridge closeHref={closeTaskHref} initialFocusId="calendar-task-close" />
          <Link
            href={closeTaskHref}
            aria-label={t("calendar.closeTaskDetail")}
            className="ui-overlay-fade-in absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={t("calendar.taskDetail")}
            className="ui-sheet-in-right absolute inset-y-0 right-0 z-[1] h-full w-full border-l border-[color:var(--ui-border-soft)] bg-[color:var(--ui-surface-1)] pt-[max(0px,env(safe-area-inset-top))] pb-[max(0px,env(safe-area-inset-bottom))] shadow-[0_22px_56px_-36px_rgb(15_23_42/0.72)] backdrop-blur-sm sm:max-w-lg"
          >
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-center justify-between border-b border-[color:var(--ui-border-soft)] px-4 py-3">
                <p className="text-[10px] font-bold tracking-[0.12em] text-[color:var(--ui-text-muted)] uppercase">{t("calendar.taskDetail")}</p>
                <Link
                  id="calendar-task-close"
                  href={closeTaskHref}
                  className="inline-flex h-8 items-center rounded-lg border border-[color:var(--ui-border-soft)] px-2.5 text-xs font-semibold text-[color:var(--ui-text-muted)] transition-colors hover:bg-[color:var(--ui-surface-3)]"
                >
                  {t("common.close")}
                </Link>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                <div>
                  <p className="text-xs font-semibold tracking-[0.1em] text-[color:var(--ui-text-muted)] uppercase">{t("calendar.detail.title")}</p>
                  <h2 className="mt-1 text-lg font-semibold text-[color:var(--ui-text-strong)]">{selectedTask.title}</h2>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-[0.1em] text-[color:var(--ui-text-muted)] uppercase">{t("calendar.detail.dueDate")}</p>
                  <p className="mt-1 text-sm font-medium capitalize text-[color:var(--ui-text-muted)]">
                    {selectedTask.dueDate ? detailDateFormatter.format(selectedTask.dueDate) : t("calendar.detail.noDueDate")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-[0.1em] text-[color:var(--ui-text-muted)] uppercase">{t("calendar.detail.priority")}</p>
                  <span className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityTone(selectedTask.priority)}`}>
                    {priorityLabelByValue[selectedTask.priority]}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-[0.1em] text-[color:var(--ui-text-muted)] uppercase">{t("calendar.status")}</p>
                  <p className="mt-1 text-sm font-medium text-[color:var(--ui-text-muted)]">
                    {selectedTask.isCompleted ? t("tasks.views.completed") : t("tasks.views.pending")}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

    </section>
  );
}
