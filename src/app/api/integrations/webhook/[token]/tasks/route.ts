import { TaskPriority, TaskStatus } from "@prisma/client";
import { z } from "zod";
import { handleRouteError, HttpError, jsonData, parseRequestJson } from "@/lib/http";
import { createTaskActivity } from "@/lib/task-activity";
import { prisma } from "@/lib/prisma";

const incomingTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  listId: z.string().cuid().optional(),
  listName: z.string().trim().min(1).max(80).optional(),
});

function normalizeTaskState(input: { status?: TaskStatus }) {
  if (!input.status) {
    return {
      status: TaskStatus.TODO,
      isCompleted: false,
    };
  }

  return {
    status: input.status,
    isCompleted: input.status === TaskStatus.DONE,
  };
}

async function resolveListId(params: { userId: string; listId?: string; listName?: string }) {
  if (params.listId) {
    const list = await prisma.list.findFirst({
      where: {
        id: params.listId,
        ownerId: params.userId,
      },
      select: { id: true },
    });

    if (!list) {
      throw new HttpError(400, "Invalid listId for webhook owner.");
    }

    return list.id;
  }

  if (params.listName) {
    const list = await prisma.list.upsert({
      where: {
        ownerId_name: {
          ownerId: params.userId,
          name: params.listName.trim(),
        },
      },
      update: {},
      create: {
        ownerId: params.userId,
        name: params.listName.trim(),
        color: "#2563eb",
      },
      select: { id: true },
    });

    return list.id;
  }

  const inbox = await prisma.list.upsert({
    where: {
      ownerId_name: {
        ownerId: params.userId,
        name: "Inbox",
      },
    },
    update: {},
    create: {
      ownerId: params.userId,
      name: "Inbox",
      color: "#0ea5e9",
    },
    select: { id: true },
  });

  return inbox.id;
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const feedToken = await prisma.userFeedToken.findUnique({
      where: {
        webhookToken: token,
      },
      select: {
        userId: true,
      },
    });

    if (!feedToken) {
      throw new HttpError(404, "Invalid webhook token.");
    }

    const body = await parseRequestJson(request, incomingTaskSchema);
    const normalizedState = normalizeTaskState({
      status: body.status,
    });
    const listId = await resolveListId({
      userId: feedToken.userId,
      listId: body.listId,
      listName: body.listName,
    });

    const task = await prisma.task.create({
      data: {
        ownerId: feedToken.userId,
        listId,
        title: body.title.trim(),
        description: body.description?.trim() ?? "",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        priority: body.priority ?? TaskPriority.MEDIUM,
        status: normalizedState.status,
        isCompleted: normalizedState.isCompleted,
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        priority: true,
        status: true,
      },
    });

    await createTaskActivity({
      taskId: task.id,
      actorId: null,
      type: "TASK_CREATED",
      message: "Webhook creó la tarea.",
    });

    return jsonData({ task }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
