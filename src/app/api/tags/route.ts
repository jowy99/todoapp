import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth/session";
import { handleRouteError, HttpError, jsonData, parseRequestJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const createTagSchema = z.object({
  name: z.string().trim().min(1).max(40),
  color: z
    .string()
    .trim()
    .regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, "color must be a HEX value")
    .optional(),
});

export async function GET() {
  try {
    const user = await requireCurrentUser();

    const tags = await prisma.tag.findMany({
      where: { ownerId: user.id },
      orderBy: [{ createdAt: "asc" }],
      include: {
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    return jsonData({ tags });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = await parseRequestJson(request, createTagSchema);
    const name = body.name.trim();
    const color = body.color?.trim() || null;

    const existing = await prisma.tag.findUnique({
      where: {
        ownerId_name: {
          ownerId: user.id,
          name,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new HttpError(409, "A tag with this name already exists.");
    }

    const tag = await prisma.tag.create({
      data: {
        ownerId: user.id,
        name,
        color,
      },
    });

    return jsonData({ tag }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
