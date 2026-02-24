import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth/session";
import { listAccessWhere } from "@/lib/collaboration";
import { handleRouteError, HttpError, jsonData, parseRequestJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const listCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: z
    .string()
    .trim()
    .regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, "color must be a HEX value")
    .optional(),
});

export async function GET() {
  try {
    const user = await requireCurrentUser();

    const lists = await prisma.list.findMany({
      where: listAccessWhere(user.id),
      orderBy: [{ createdAt: "asc" }],
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
        _count: {
          select: {
            tasks: true,
            collaborators: true,
          },
        },
      },
    });

    const listsWithAccess = lists.map((list) => {
      const accessRole = list.ownerId === user.id ? "OWNER" : list.collaborators[0]?.role;

      return {
        ...list,
        accessRole: accessRole ?? "VIEWER",
      };
    });

    return jsonData({ lists: listsWithAccess });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = await parseRequestJson(request, listCreateSchema);
    const name = body.name.trim();
    const color = body.color?.trim() || null;

    const existing = await prisma.list.findUnique({
      where: {
        ownerId_name: {
          ownerId: user.id,
          name,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new HttpError(409, "A list with this name already exists.");
    }

    const list = await prisma.list.create({
      data: {
        ownerId: user.id,
        name,
        color,
      },
    });

    return jsonData({ list }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
