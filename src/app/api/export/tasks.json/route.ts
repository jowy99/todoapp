import { requireCurrentUser } from "@/lib/auth/session";
import { taskAccessWhere } from "@/lib/collaboration";
import { handleRouteError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

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
            id: true,
            email: true,
            displayName: true,
          },
        },
        list: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return Response.json(
      {
        exportedAt: new Date().toISOString(),
        count: tasks.length,
        tasks,
      },
      {
        headers: {
          "Content-Disposition": `attachment; filename="tasks-export-${new Date().toISOString().slice(0, 10)}.json"`,
        },
      },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
