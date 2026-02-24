import { ListsManager } from "@/components/lists/lists-manager";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function ListsPage() {
  const user = await requireCurrentUser();

  const lists = await prisma.list.findMany({
    where: {
      ownerId: user.id,
    },
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
  });

  return <ListsManager initialLists={lists} />;
}
