import Link from "next/link";
import { TaskPriority } from "@prisma/client";
import { requireCurrentUser } from "@/lib/auth/session";
import { taskAccessWhere } from "@/lib/collaboration";
import { prisma } from "@/lib/prisma";

type CalendarSearchParams = Promise<{
  month?: string;
}>;

type CalendarPageProps = {
  searchParams: CalendarSearchParams;
};

type CalendarTask = {
  id: string;
  title: string;
  dueDate: Date;
  priority: TaskPriority;
  isCompleted: boolean;
};

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

function toMonthParam(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

function priorityTone(priority: TaskPriority) {
  if (priority === TaskPriority.URGENT) {
    return "border-danger/40 bg-danger/12";
  }

  if (priority === TaskPriority.HIGH) {
    return "border-accent/35 bg-accent/10";
  }

  if (priority === TaskPriority.MEDIUM) {
    return "border-primary/30 bg-primary/10";
  }

  return "border-border bg-surface";
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const user = await requireCurrentUser();
  const resolvedParams = await searchParams;
  const currentMonthDate = parseMonthParam(resolvedParams.month) ?? new Date();
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
  const weekdayOffset = (monthStart.getDay() + 6) % 7;
  const visibleCellCount = Math.ceil((weekdayOffset + daysInMonth) / 7) * 7;
  const prevMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1);
  const nextMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1);

  const tasks = await prisma.task.findMany({
    where: {
      AND: [
        taskAccessWhere(user.id),
        {
          dueDate: {
            gte: monthStart,
            lt: nextMonthStart,
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
    },
  });

  const tasksByDay = new Map<number, CalendarTask[]>();

  for (const task of tasks) {
    if (!task.dueDate) {
      continue;
    }

    const day = task.dueDate.getDate();
    const entries = tasksByDay.get(day) ?? [];
    entries.push({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      priority: task.priority,
      isCompleted: task.isCompleted,
    });
    tasksByDay.set(day, entries);
  }

  const monthFormatter = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <section className="space-y-6">
      <header className="border-border/80 bg-surface/90 relative overflow-hidden rounded-[1.75rem] border p-6 shadow-[0_20px_50px_-34px_rgb(15_23_42/0.85)] backdrop-blur">
        <div
          aria-hidden
          className="bg-primary/14 pointer-events-none absolute -top-16 right-10 h-36 w-36 rounded-full blur-2xl"
        />
        <div
          aria-hidden
          className="bg-accent/15 pointer-events-none absolute -bottom-12 left-12 h-28 w-28 rounded-full blur-2xl"
        />
        <p className="text-primary-strong text-sm font-semibold tracking-wide uppercase">
          Calendario
        </p>
        <h1 className="text-foreground mt-2 text-3xl font-black tracking-tight">
          {monthFormatter.format(currentMonthDate)}
        </h1>
        <p className="text-muted mt-2 text-sm">
          Vista mensual de tareas con fecha límite. Los bloques se colorean por prioridad.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href={`/calendar?month=${toMonthParam(prevMonth)}`}
            className="border-border/80 hover:bg-surface-strong rounded-xl border px-3 py-2 text-sm font-semibold transition"
          >
            Mes anterior
          </Link>
          <Link
            href={`/calendar?month=${toMonthParam(new Date())}`}
            className="bg-primary-strong hover:bg-primary rounded-xl px-3 py-2.5 text-sm font-semibold text-white transition"
          >
            Hoy
          </Link>
          <Link
            href={`/calendar?month=${toMonthParam(nextMonth)}`}
            className="border-border/80 hover:bg-surface-strong rounded-xl border px-3 py-2 text-sm font-semibold transition"
          >
            Mes siguiente
          </Link>
        </div>
      </header>

      <div className="border-border/80 bg-surface/85 rounded-2xl border p-3 shadow-[0_20px_40px_-30px_rgb(15_23_42/0.75)]">
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => (
            <p key={day} className="text-muted px-2 py-1 text-xs font-bold tracking-wide uppercase">
              {day}
            </p>
          ))}

          {Array.from({ length: visibleCellCount }).map((_, index) => {
            const dayNumber = index - weekdayOffset + 1;
            const isVisibleMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
            const dayTasks = isVisibleMonth ? (tasksByDay.get(dayNumber) ?? []) : [];

            return (
              <article
                key={index}
                className={`min-h-36 rounded-xl border p-2 ${
                  isVisibleMonth
                    ? "border-border/80 bg-surface/95 shadow-[0_10px_24px_-22px_rgb(15_23_42/0.9)]"
                    : "border-transparent bg-transparent"
                }`}
              >
                {isVisibleMonth ? (
                  <>
                    <p className="text-sm font-semibold">{dayNumber}</p>
                    <div className="mt-2 space-y-1">
                      {dayTasks.length === 0 ? (
                        <p className="text-muted text-xs">Sin tareas</p>
                      ) : (
                        dayTasks.slice(0, 4).map((task) => (
                          <div
                            key={task.id}
                            className={`rounded-lg border px-2 py-1 text-xs ${priorityTone(task.priority)} ${
                              task.isCompleted ? "line-through opacity-60" : ""
                            }`}
                          >
                            <p className="truncate font-semibold">{task.title}</p>
                            <p className="text-[10px]">{timeFormatter.format(task.dueDate)}</p>
                          </div>
                        ))
                      )}
                      {dayTasks.length > 4 ? (
                        <p className="text-muted text-[11px]">+{dayTasks.length - 4} más</p>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
