import { CollaboratorRole } from "@prisma/client";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth/session";
import { getListAccess } from "@/lib/collaboration";
import { handleRouteError, HttpError, jsonData, parseRequestJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const updateMemberSchema = z.object({
  role: z.nativeEnum(CollaboratorRole),
});

async function assertOwner(listId: string, userId: string) {
  const access = await getListAccess(listId, userId);

  if (!access) {
    throw new HttpError(404, "List not found.");
  }

  if (access.role !== "OWNER") {
    throw new HttpError(403, "Only the list owner can manage collaborators.");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ listId: string; memberId: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { listId, memberId } = await context.params;
    await assertOwner(listId, user.id);
    const body = await parseRequestJson(request, updateMemberSchema);

    const existing = await prisma.listCollaborator.findFirst({
      where: {
        id: memberId,
        listId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new HttpError(404, "Collaborator not found.");
    }

    const collaborator = await prisma.listCollaborator.update({
      where: {
        id: memberId,
      },
      data: {
        role: body.role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    return jsonData({ collaborator });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ listId: string; memberId: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { listId, memberId } = await context.params;
    await assertOwner(listId, user.id);

    const existing = await prisma.listCollaborator.findFirst({
      where: {
        id: memberId,
        listId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new HttpError(404, "Collaborator not found.");
    }

    await prisma.listCollaborator.delete({
      where: {
        id: memberId,
      },
    });

    return jsonData({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
