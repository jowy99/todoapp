import { Prisma, TaskActivityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CreateTaskActivityInput = {
  taskId: string;
  actorId?: string | null;
  type: TaskActivityType;
  message: string;
  metadata?: Prisma.InputJsonValue;
};

export async function createTaskActivity(input: CreateTaskActivityInput) {
  try {
    await prisma.taskActivity.create({
      data: {
        taskId: input.taskId,
        actorId: input.actorId ?? null,
        type: input.type,
        message: input.message,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    console.error("Failed to write task activity log:", error);
  }
}

export function actorLabel(displayName: string | null | undefined, email: string) {
  const normalizedName = displayName?.trim();
  return normalizedName || email;
}
