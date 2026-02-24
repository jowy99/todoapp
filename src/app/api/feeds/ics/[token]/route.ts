import { taskAccessWhere } from "@/lib/collaboration";
import { buildIcsCalendar } from "@/lib/integrations/ics";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const feedToken = await prisma.userFeedToken.findUnique({
    where: {
      icsToken: token,
    },
    select: {
      userId: true,
    },
  });

  if (!feedToken) {
    return new Response("Not found", { status: 404 });
  }

  const tasks = await prisma.task.findMany({
    where: {
      AND: [
        taskAccessWhere(feedToken.userId),
        {
          dueDate: {
            not: null,
          },
        },
      ],
    },
    orderBy: [{ dueDate: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      dueDate: true,
      priority: true,
      status: true,
      isCompleted: true,
      updatedAt: true,
    },
  });

  const calendar = buildIcsCalendar(
    tasks
      .filter((task) => Boolean(task.dueDate))
      .map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate as Date,
        priority: task.priority,
        status: task.status,
        isCompleted: task.isCompleted,
        updatedAt: task.updatedAt,
      })),
  );

  return new Response(calendar, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Disposition": 'inline; filename="todo-studio.ics"',
    },
  });
}
