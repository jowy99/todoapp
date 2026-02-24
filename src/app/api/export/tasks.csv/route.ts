import { requireCurrentUser } from "@/lib/auth/session";
import { taskAccessWhere } from "@/lib/collaboration";
import { handleRouteError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

function csvEscape(value: string | null | undefined) {
  const normalized = value ?? "";
  return `"${normalized.replace(/"/g, '""')}"`;
}

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const tasks = await prisma.task.findMany({
      where: taskAccessWhere(user.id),
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        priority: true,
        status: true,
        isCompleted: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            email: true,
            displayName: true,
          },
        },
        list: {
          select: {
            name: true,
          },
        },
      },
    });

    const header = [
      "id",
      "title",
      "description",
      "dueDate",
      "priority",
      "status",
      "isCompleted",
      "list",
      "owner",
      "createdAt",
      "updatedAt",
    ];

    const rows = tasks.map((task) =>
      [
        csvEscape(task.id),
        csvEscape(task.title),
        csvEscape(task.description),
        csvEscape(task.dueDate?.toISOString() ?? ""),
        csvEscape(task.priority),
        csvEscape(task.status),
        csvEscape(String(task.isCompleted)),
        csvEscape(task.list?.name ?? ""),
        csvEscape(task.owner.displayName?.trim() || task.owner.email),
        csvEscape(task.createdAt.toISOString()),
        csvEscape(task.updatedAt.toISOString()),
      ].join(","),
    );

    const content = [header.join(","), ...rows].join("\n");

    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="tasks-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
