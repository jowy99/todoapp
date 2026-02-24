import { Prisma, TaskActivityType, TaskPriority, TaskStatus } from "@prisma/client";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth/session";
import { canEdit, getListAccess, taskAccessWhere } from "@/lib/collaboration";
import { handleRouteError, HttpError, jsonData, parseRequestJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { actorLabel, createTaskActivity } from "@/lib/task-activity";

const taskFilterSchema = z.object({
  listId: z.string().cuid().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  isCompleted: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  dueFrom: z.string().datetime().optional(),
  dueTo: z.string().datetime().optional(),
});

const taskCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  isCompleted: z.boolean().optional(),
  listId: z.string().cuid().optional().nullable(),
  tagIds: z.array(z.string().cuid()).max(30).optional(),
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

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser();
    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    const filters = taskFilterSchema.parse(params);

    if (filters.listId) {
      const access = await getListAccess(filters.listId, user.id);

      if (!access) {
        throw new HttpError(403, "You do not have access to this list.");
      }
    }

    const where: Prisma.TaskWhereInput = {
      AND: [
        taskAccessWhere(user.id),
        {
          listId: filters.listId,
          priority: filters.priority,
          status: filters.status,
          isCompleted: filters.isCompleted,
          dueDate: {
            gte: filters.dueFrom ? new Date(filters.dueFrom) : undefined,
            lte: filters.dueTo ? new Date(filters.dueTo) : undefined,
          },
        },
      ],
    };

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ isCompleted: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
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

    return jsonData({ tasks: tasks.map((task) => toTaskOutput(task, user.id)) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = await parseRequestJson(request, taskCreateSchema);
    const tagIds = uniqueIds(body.tagIds);
    const normalizedState = normalizeTaskState({
      status: body.status,
      isCompleted: body.isCompleted,
    });

    let ownerId = user.id;

    if (body.listId) {
      const listAccess = await getListAccess(body.listId, user.id);

      if (!listAccess) {
        throw new HttpError(400, "Invalid listId. List not found for this user.");
      }

      if (!canEdit(listAccess.role)) {
        throw new HttpError(403, "You do not have edit permissions for this list.");
      }

      ownerId = listAccess.ownerId;
    }

    await assertOwnedTags(ownerId, tagIds);

    const task = await prisma.task.create({
      data: {
        ownerId,
        title: body.title.trim(),
        description: body.description?.trim() || "",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        listId: body.listId ?? null,
        priority: body.priority ?? TaskPriority.MEDIUM,
        status: normalizedState.status ?? TaskStatus.TODO,
        isCompleted: normalizedState.isCompleted ?? false,
        tags:
          tagIds.length > 0
            ? {
                create: tagIds.map((tagId) => ({ tagId })),
              }
            : undefined,
      },
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

    await createTaskActivity({
      taskId: task.id,
      actorId: user.id,
      type: TaskActivityType.TASK_CREATED,
      message: `${actorLabel(user.displayName, user.email)} creó la tarea.`,
      metadata: {
        listId: task.listId,
      },
    });

    return jsonData({ task: toTaskOutput(task, user.id) }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
