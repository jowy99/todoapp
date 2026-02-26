import { CollaborationHub } from "@/components/collaboration/collaboration-hub";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function CollaborationPage() {
  const user = await requireCurrentUser();

  const [ownedLists, sharedLists] = await Promise.all([
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
                username: true,
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
            username: true,
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
  ]);

  const normalizedSharedLists = sharedLists.map((list) => ({
    id: list.id,
    name: list.name,
    color: list.color,
    myRole: list.collaborators[0]?.role ?? "VIEWER",
    owner: list.owner,
    _count: list._count,
  }));

  return (
    <CollaborationHub
      initialOwnedLists={ownedLists}
      initialSharedLists={normalizedSharedLists}
    />
  );
}
