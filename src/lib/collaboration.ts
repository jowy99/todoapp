import { CollaboratorRole, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ListAccessRole = "OWNER" | CollaboratorRole;

export type ListAccess = {
  listId: string;
  ownerId: string;
  role: ListAccessRole;
};

export type TaskAccess = {
  taskId: string;
  ownerId: string;
  listId: string | null;
  role: ListAccessRole;
};

export function canEdit(role: ListAccessRole) {
  return role === "OWNER" || role === CollaboratorRole.EDITOR;
}

export function listAccessWhere(userId: string): Prisma.ListWhereInput {
  return {
    OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }],
  };
}

export function taskAccessWhere(userId: string): Prisma.TaskWhereInput {
  return {
    OR: [{ ownerId: userId }, { list: { collaborators: { some: { userId } } } }],
  };
}

export async function getListAccess(listId: string, userId: string): Promise<ListAccess | null> {
  const list = await prisma.list.findUnique({
    where: { id: listId },
    select: {
      id: true,
      ownerId: true,
      collaborators: {
        where: { userId },
        select: { role: true },
        take: 1,
      },
    },
  });

  if (!list) {
    return null;
  }

  if (list.ownerId === userId) {
    return {
      listId: list.id,
      ownerId: list.ownerId,
      role: "OWNER",
    };
  }

  const collaborator = list.collaborators[0];

  if (!collaborator) {
    return null;
  }

  return {
    listId: list.id,
    ownerId: list.ownerId,
    role: collaborator.role,
  };
}

export async function getTaskAccess(taskId: string, userId: string): Promise<TaskAccess | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      ownerId: true,
      listId: true,
      list: {
        select: {
          ownerId: true,
          collaborators: {
            where: { userId },
            select: { role: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!task) {
    return null;
  }

  if (task.ownerId === userId) {
    return {
      taskId: task.id,
      ownerId: task.ownerId,
      listId: task.listId,
      role: "OWNER",
    };
  }

  if (!task.listId || !task.list) {
    return null;
  }

  const collaborator = task.list.collaborators[0];

  if (!collaborator) {
    return null;
  }

  return {
    taskId: task.id,
    ownerId: task.ownerId,
    listId: task.listId,
    role: collaborator.role,
  };
}
