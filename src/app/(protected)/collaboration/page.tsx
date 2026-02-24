import { CollaborationHub } from "@/components/collaboration/collaboration-hub";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function CollaborationPage() {
  const user = await requireCurrentUser();

  const [ownedLists, sharedLists, sharedTasks] = await Promise.all([
    prisma.list.findMany({
      where: {
        ownerId: user.id,
      },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        color: true,
        collaborators: {
          orderBy: [{ createdAt: "asc" }],
          select: {
            id: true,
            role: true,
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            collaborators: true,
          },
        },
      },
    }),
    prisma.list.findMany({
      where: {
        collaborators: {
          some: {
            userId: user.id,
          },
        },
      },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        color: true,
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
    prisma.task.findMany({
      where: {
        list: {
          collaborators: {
            some: {
              userId: user.id,
            },
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 60,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        isCompleted: true,
        ownerId: true,
        list: {
          select: {
            id: true,
            name: true,
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
      },
    }),
  ]);

  const normalizedSharedLists = sharedLists.map((list) => ({
    id: list.id,
    name: list.name,
    color: list.color,
    myRole: list.collaborators[0]?.role ?? "VIEWER",
    owner: list.owner,
    _count: list._count,
  }));

  const normalizedSharedTasks = sharedTasks.flatMap((task) => {
    if (!task.list) {
      return [];
    }

    const role: "VIEWER" | "EDITOR" = task.list.collaborators[0]?.role ?? "VIEWER";
    const accessRole: "OWNER" | "VIEWER" | "EDITOR" =
      task.ownerId === user.id || task.list.ownerId === user.id ? "OWNER" : role;

    return [
      {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        isCompleted: task.isCompleted,
        accessRole,
        canEdit: accessRole === "OWNER" || accessRole === "EDITOR",
        list: {
          id: task.list.id,
          name: task.list.name,
          owner: task.list.owner,
        },
      },
    ];
  });

  return (
    <CollaborationHub
      initialOwnedLists={ownedLists}
      initialSharedLists={normalizedSharedLists}
      initialSharedTasks={normalizedSharedTasks}
    />
  );
}
