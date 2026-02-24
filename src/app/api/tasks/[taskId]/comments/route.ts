import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth/session";
import { getTaskAccess } from "@/lib/collaboration";
import { handleRouteError, HttpError, jsonData, parseRequestJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { actorLabel, createTaskActivity } from "@/lib/task-activity";
import { TaskActivityType } from "@prisma/client";

const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(1000),
});

export async function GET(_request: Request, context: { params: Promise<{ taskId: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { taskId } = await context.params;
    const access = await getTaskAccess(taskId, user.id);

    if (!access) {
      throw new HttpError(404, "Task not found.");
    }

    const comments = await prisma.taskComment.findMany({
      where: {
        taskId,
      },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        body: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    return jsonData({ comments });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ taskId: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { taskId } = await context.params;
    const access = await getTaskAccess(taskId, user.id);

    if (!access) {
      throw new HttpError(404, "Task not found.");
    }

    const body = await parseRequestJson(request, createCommentSchema);

    const comment = await prisma.taskComment.create({
      data: {
        taskId,
        authorId: user.id,
        body: body.body.trim(),
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    await createTaskActivity({
      taskId,
      actorId: user.id,
      type: TaskActivityType.COMMENT_ADDED,
      message: `${actorLabel(user.displayName, user.email)} añadió un comentario.`,
    });

    return jsonData({ comment }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
