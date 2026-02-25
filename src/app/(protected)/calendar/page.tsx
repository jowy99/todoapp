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
    return "border-rose-200 bg-rose-50 text-rose-900";
  }

  if (priority === TaskPriority.HIGH) {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  if (priority === TaskPriority.MEDIUM) {
    return "border-cyan-200 bg-cyan-50 text-cyan-900";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
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
  const mobileGroups = Array.from(tasksByDay.entries()).sort(([a], [b]) => a - b);

  return (
    <section className="space-y-4 sm:space-y-6">
      <header className="ui-card ui-card--hero relative p-4 sm:p-6">
        <div
          aria-hidden
          className="bg-primary/14 pointer-events-none absolute -top-16 right-10 h-36 w-36 rounded-full blur-2xl"
        />
        <div
          aria-hidden
          className="bg-accent/15 pointer-events-none absolute -bottom-12 left-12 h-28 w-28 rounded-full blur-2xl"
        />
        <p className="ui-kicker">Calendario</p>
        <h1 className="ui-title-xl mt-2">{monthFormatter.format(currentMonthDate)}</h1>
        <p className="ui-subtle mt-2">
          Vista mensual de tareas con fecha límite. Los bloques se colorean por prioridad.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href={`/calendar?month=${toMonthParam(prevMonth)}`}
            className="ui-btn ui-btn--secondary ui-btn--compact"
          >
            Mes anterior
          </Link>
          <Link
            href={`/calendar?month=${toMonthParam(new Date())}`}
            className="ui-btn ui-btn--primary ui-btn--compact"
          >
            Hoy
          </Link>
          <Link
            href={`/calendar?month=${toMonthParam(nextMonth)}`}
            className="ui-btn ui-btn--secondary ui-btn--compact"
          >
            Mes siguiente
          </Link>
        </div>
      </header>

      <section className="space-y-3 md:hidden">
        {mobileGroups.length === 0 ? (
          <p className="ui-empty">No hay tareas con fecha para este mes.</p>
        ) : (
          mobileGroups.map(([day, dayTasks]) => (
            <article key={day} className="ui-card space-y-2 rounded-2xl p-3">
              <p className="ui-title-lg !text-base">
                {day} · {monthFormatter.format(currentMonthDate)}
              </p>
              <div className="mt-2 space-y-1.5">
                {dayTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`rounded-xl border px-2.5 py-2 text-xs font-semibold transition-all duration-200 ease-out ${priorityTone(task.priority)} ${
                      task.isCompleted ? "line-through opacity-60" : ""
                    }`}
                  >
                    <p className="truncate">{task.title}</p>
                    <p className="mt-0.5 text-[11px] font-medium opacity-80">
                      {timeFormatter.format(task.dueDate)}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))
        )}
      </section>

      <div className="ui-card hidden overflow-x-auto rounded-2xl p-3 md:block">
        <div className="grid min-w-[680px] grid-cols-7 gap-2 lg:min-w-0">
          {weekDays.map((day) => (
            <p key={day} className="px-2 py-1 text-xs font-bold tracking-[0.12em] text-slate-500 uppercase">
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
                className={`min-h-32 rounded-xl border p-2 transition-all duration-200 ease-out lg:min-h-36 ${
                  isVisibleMonth
                    ? "border-slate-200/80 bg-white/95 shadow-[0_10px_24px_-22px_rgb(15_23_42/0.9)] hover:-translate-y-[1px] hover:shadow-[0_14px_26px_-20px_rgb(15_23_42/0.85)]"
                    : "border-transparent bg-transparent"
                }`}
              >
                {isVisibleMonth ? (
                  <>
                    <p className="text-sm font-bold text-slate-800">{dayNumber}</p>
                    <div className="mt-2 space-y-1">
                      {dayTasks.length === 0 ? (
                        <p className="text-xs font-medium text-slate-400">Sin tareas</p>
                      ) : (
                        dayTasks.slice(0, 4).map((task) => (
                          <div
                            key={task.id}
                            className={`rounded-lg border px-2 py-1 text-xs font-semibold transition-all duration-200 ease-out ${priorityTone(task.priority)} ${
                              task.isCompleted ? "line-through opacity-60" : ""
                            }`}
                          >
                            <p className="truncate">{task.title}</p>
                            <p className="text-[10px] font-medium opacity-80">
                              {timeFormatter.format(task.dueDate)}
                            </p>
                          </div>
                        ))
                      )}
                      {dayTasks.length > 4 ? (
                        <p className="text-[11px] font-semibold text-slate-500">
                          +{dayTasks.length - 4} más
                        </p>
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
