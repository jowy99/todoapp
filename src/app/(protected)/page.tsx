import { TasksWorkspace } from "@/components/tasks/tasks-workspace";
import { requireCurrentUser } from "@/lib/auth/session";
import { listAccessWhere, taskAccessWhere } from "@/lib/collaboration";
import { prisma } from "@/lib/prisma";

export default async function HomeTasksPage() {
  const user = await requireCurrentUser();

  const [tasks, lists, tags] = await Promise.all([
    prisma.task.findMany({
      where: taskAccessWhere(user.id),
      orderBy: [{ isCompleted: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        ownerId: true,
        title: true,
        description: true,
        dueDate: true,
        priority: true,
        status: true,
        isCompleted: true,
        listId: true,
        list: {
          select: {
            id: true,
            name: true,
            color: true,
            ownerId: true,
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
          select: {
            tagId: true,
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    }),
    prisma.list.findMany({
      where: listAccessWhere(user.id),
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        color: true,
        ownerId: true,
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
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    }),
    prisma.tag.findMany({
      where: { ownerId: user.id },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        color: true,
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    }),
  ]);

  const serializedLists = lists.map((list) => {
    const accessRole: "OWNER" | "VIEWER" | "EDITOR" =
      list.ownerId === user.id ? "OWNER" : (list.collaborators[0]?.role ?? "VIEWER");

    return {
      ...list,
      accessRole,
      canEdit: accessRole === "OWNER" || accessRole === "EDITOR",
      isShared: list.ownerId !== user.id,
    };
  });

  const serializedTasks = tasks.map((task) => {
    const accessRole: "OWNER" | "VIEWER" | "EDITOR" =
      task.ownerId === user.id || task.list?.ownerId === user.id
        ? "OWNER"
        : (task.list?.collaborators[0]?.role ?? "VIEWER");

    return {
      ...task,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      accessRole,
      canEdit: accessRole === "OWNER" || accessRole === "EDITOR",
      isShared: task.ownerId !== user.id,
    };
  });

  return (
    <TasksWorkspace
      initialTasks={serializedTasks}
      initialLists={serializedLists}
      initialTags={tags}
    />
  );
}
