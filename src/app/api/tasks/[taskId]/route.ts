import { Prisma, TaskActivityType, TaskPriority, TaskStatus } from "@prisma/client";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth/session";
import { canEdit, getListAccess, getTaskAccess } from "@/lib/collaboration";
import { handleRouteError, HttpError, jsonData, parseRequestJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { actorLabel, createTaskActivity } from "@/lib/task-activity";

const taskUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    dueDate: z.string().datetime().optional().nullable(),
    priority: z.nativeEnum(TaskPriority).optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    isCompleted: z.boolean().optional(),
    listId: z.string().cuid().optional().nullable(),
    tagIds: z.array(z.string().cuid()).max(30).optional(),
  })
  .refine((value) => Object.values(value).some((fieldValue) => fieldValue !== undefined), {
    message: "At least one field is required.",
  });

function normalizeTaskState(input: { status?: TaskStatus; isCompleted?: boolean }) {
  if (input.status !== undefined && input.isCompleted === undefined) {
    return {
      status: input.status,
      isCompleted: input.status === TaskStatus.DONE,
    };
  }

  if (input.isCompleted !== undefined && input.status === undefined) {
    return {
      status: input.isCompleted ? TaskStatus.DONE : TaskStatus.TODO,
      isCompleted: input.isCompleted,
    };
  }

  return {
    status: input.status,
    isCompleted: input.isCompleted,
  };
}

function uniqueIds(values: string[] | undefined) {
  if (!values) {
    return [];
  }

  return [...new Set(values)];
}

function toTaskOutput(
  task: {
    ownerId: string;
    list: {
      ownerId: string;
      collaborators: Array<{ role: "VIEWER" | "EDITOR" }>;
    } | null;
  },
  userId: string,
) {
  let accessRole: "OWNER" | "VIEWER" | "EDITOR" = "VIEWER";

  if (task.ownerId === userId || task.list?.ownerId === userId) {
    accessRole = "OWNER";
  } else if (task.list?.collaborators[0]) {
    accessRole = task.list.collaborators[0].role;
  }

  return {
    ...task,
    accessRole,
    canEdit: accessRole === "OWNER" || accessRole === "EDITOR",
    isShared: task.ownerId !== userId,
  };
}

async function assertOwnedTags(ownerId: string, tagIds: string[]) {
  if (tagIds.length === 0) {
    return;
  }

  const count = await prisma.tag.count({
    where: {
      ownerId,
      id: {
        in: tagIds,
      },
    },
  });

  if (count !== tagIds.length) {
    throw new HttpError(400, "Some tagIds are invalid for this user.");
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ taskId: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { taskId } = await context.params;
    const body = await parseRequestJson(request, taskUpdateSchema);
    const tagIds = uniqueIds(body.tagIds);
    const normalizedState = normalizeTaskState({
      status: body.status,
      isCompleted: body.isCompleted,
    });

    const taskAccess = await getTaskAccess(taskId, user.id);

    if (!taskAccess) {
      throw new HttpError(404, "Task not found.");
    }

    if (!canEdit(taskAccess.role)) {
      throw new HttpError(403, "You do not have edit permissions for this task.");
    }

    if (taskAccess.role !== "OWNER" && body.listId !== undefined) {
      if (!taskAccess.listId || body.listId !== taskAccess.listId) {
        throw new HttpError(403, "Editors cannot move a task to another list.");
      }
    }

    if (body.listId !== undefined && body.listId !== null) {
      const listAccess = await getListAccess(body.listId, user.id);

      if (!listAccess) {
        throw new HttpError(400, "Invalid listId. List not found for this user.");
      }

      if (!canEdit(listAccess.role)) {
        throw new HttpError(403, "You do not have edit permissions for the target list.");
      }
    }

    await assertOwnedTags(taskAccess.ownerId, tagIds);

    const previousTask = await prisma.task.findUnique({
      where: {
        id: taskId,
      },
      select: {
        status: true,
        isCompleted: true,
      },
    });

    if (!previousTask) {
      throw new HttpError(404, "Task not found.");
    }

    const updateData: Prisma.TaskUpdateInput = {};

    if (body.title !== undefined) {
      updateData.title = body.title.trim();
    }

    if (body.description !== undefined) {
      updateData.description = body.description.trim();
    }

    if (body.dueDate !== undefined) {
      updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }

    if (body.priority !== undefined) {
      updateData.priority = body.priority;
    }

    if (normalizedState.status !== undefined) {
      updateData.status = normalizedState.status;
    }

    if (normalizedState.isCompleted !== undefined) {
      updateData.isCompleted = normalizedState.isCompleted;
    }

    if (body.listId !== undefined) {
      updateData.list = body.listId ? { connect: { id: body.listId } } : { disconnect: true };
    }

    if (body.tagIds !== undefined) {
      updateData.tags = {
        deleteMany: {},
        create: tagIds.map((tagId) => ({ tagId })),
      };
    }

    const task = await prisma.task.update({
      where: {
        id: taskId,
      },
      data: updateData,
      include: {
        list: {
          include: {
            owner: {
              select: {
                id: true,
                email: true,
                displayName: true,
              },
            },
            collaborators: {
              where: {
                userId: user.id,
              },
              select: {
                role: true,
              },
              take: 1,
            },
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    const statusChanged =
      previousTask.status !== task.status || previousTask.isCompleted !== task.isCompleted;

    await createTaskActivity({
      taskId: task.id,
      actorId: user.id,
      type: statusChanged ? TaskActivityType.STATUS_CHANGED : TaskActivityType.TASK_UPDATED,
      message: statusChanged
        ? `${actorLabel(user.displayName, user.email)} cambió el estado de la tarea.`
        : `${actorLabel(user.displayName, user.email)} actualizó la tarea.`,
    });

    return jsonData({ task: toTaskOutput(task, user.id) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ taskId: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { taskId } = await context.params;
    const taskAccess = await getTaskAccess(taskId, user.id);

    if (!taskAccess) {
      throw new HttpError(404, "Task not found.");
    }

    if (!canEdit(taskAccess.role)) {
      throw new HttpError(403, "You do not have edit permissions for this task.");
    }

    await prisma.task.delete({
      where: {
        id: taskId,
      },
    });

    return jsonData({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
