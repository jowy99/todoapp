import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth/session";
import { handleRouteError, HttpError, jsonData, parseRequestJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const updateListSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    color: z
      .string()
      .trim()
      .regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, "color must be a HEX value")
      .optional()
      .nullable(),
  })
  .refine((value) => Object.values(value).some((fieldValue) => fieldValue !== undefined), {
    message: "At least one field is required.",
  });

async function findOwnedList(listId: string, userId: string) {
  const list = await prisma.list.findFirst({
    where: {
      id: listId,
      ownerId: userId,
    },
    select: {
      id: true,
    },
  });

  if (!list) {
    throw new HttpError(404, "List not found.");
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ listId: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { listId } = await context.params;
    const body = await parseRequestJson(request, updateListSchema);
    await findOwnedList(listId, user.id);

    const name = body.name?.trim();

    if (name) {
      const existing = await prisma.list.findFirst({
        where: {
          ownerId: user.id,
          name,
          id: {
            not: listId,
          },
        },
        select: {
          id: true,
        },
      });

      if (existing) {
        throw new HttpError(409, "A list with this name already exists.");
      }
    }

    const list = await prisma.list.update({
      where: {
        id: listId,
      },
      data: {
        name: name ?? undefined,
        color: body.color === undefined ? undefined : body.color || null,
      },
      include: {
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    return jsonData({ list });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ listId: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { listId } = await context.params;
    await findOwnedList(listId, user.id);

    await prisma.list.delete({
      where: {
        id: listId,
      },
    });

    return jsonData({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
