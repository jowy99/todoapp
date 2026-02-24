import { requireCurrentUser } from "@/lib/auth/session";
import { getTaskAccess } from "@/lib/collaboration";
import { handleRouteError, HttpError, jsonData } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: { params: Promise<{ taskId: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { taskId } = await context.params;
    const access = await getTaskAccess(taskId, user.id);

    if (!access) {
      throw new HttpError(404, "Task not found.");
    }

    const activity = await prisma.taskActivity.findMany({
      where: {
        taskId,
      },
      orderBy: [{ createdAt: "desc" }],
      take: 50,
      select: {
        id: true,
        type: true,
        message: true,
        metadata: true,
        createdAt: true,
        actor: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    return jsonData({ activity });
  } catch (error) {
    return handleRouteError(error);
  }
}
