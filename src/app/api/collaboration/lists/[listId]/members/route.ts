import { CollaboratorRole } from "@prisma/client";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth/session";
import { getListAccess } from "@/lib/collaboration";
import { handleRouteError, HttpError, jsonData, parseRequestJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const createMemberSchema = z.object({
  identifier: z.string().trim().min(1).max(255),
  role: z.nativeEnum(CollaboratorRole).optional(),
});

export async function GET(request: Request, context: { params: Promise<{ listId: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { listId } = await context.params;
    const access = await getListAccess(listId, user.id);
    const url = new URL(request.url);
    const query = url.searchParams.get("query")?.trim().toLowerCase() ?? "";

    if (!access) {
      throw new HttpError(404, "List not found.");
    }

    if (query.length > 0) {
      if (access.role !== "OWNER") {
        throw new HttpError(403, "Only the list owner can invite collaborators.");
      }

      if (query.length < 2) {
        return jsonData({ users: [] });
      }

      const existingMembers = await prisma.listCollaborator.findMany({
        where: { listId },
        select: { userId: true },
      });
      const excludedUserIds = [access.ownerId, ...existingMembers.map((member) => member.userId)];

      const users = await prisma.user.findMany({
        where: {
          id: {
            notIn: excludedUserIds,
          },
          username: {
            startsWith: query,
            mode: "insensitive",
          },
        },
        orderBy: [{ username: "asc" }, { email: "asc" }],
        take: 8,
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
        },
      });

      return jsonData({ users });
    }

    const list = await prisma.list.findUnique({
      where: {
        id: listId,
      },
      select: {
        id: true,
        name: true,
        ownerId: true,
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
            displayName: true,
          },
        },
        collaborators: {
          orderBy: [{ createdAt: "asc" }],
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                displayName: true,
              },
            },
            invitedBy: {
              select: {
                id: true,
                username: true,
                email: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!list) {
      throw new HttpError(404, "List not found.");
    }

    const members = [
      {
        memberType: "OWNER" as const,
        id: list.owner.id,
        user: list.owner,
        role: "OWNER" as const,
        createdAt: null,
      },
      ...list.collaborators.map((member) => ({
        memberType: "COLLABORATOR" as const,
        id: member.id,
        user: member.user,
        role: member.role,
        createdAt: member.createdAt,
        invitedBy: member.invitedBy,
      })),
    ];

    return jsonData({
      list: {
        id: list.id,
        name: list.name,
        ownerId: list.ownerId,
      },
      members,
      accessRole: access.role,
      canManageMembers: access.role === "OWNER",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ listId: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { listId } = await context.params;
    const access = await getListAccess(listId, user.id);

    if (!access) {
      throw new HttpError(404, "List not found.");
    }

    if (access.role !== "OWNER") {
      throw new HttpError(403, "Only the list owner can invite collaborators.");
    }

    const body = await parseRequestJson(request, createMemberSchema);
    const identifier = body.identifier.trim().toLowerCase();
    const role = body.role ?? CollaboratorRole.VIEWER;
    const invitedUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
      },
    });

    if (!invitedUser) {
      throw new HttpError(404, "User not found. Ask them to register first.");
    }

    if (invitedUser.id === access.ownerId) {
      throw new HttpError(409, "The list owner already has full access.");
    }

    const collaborator = await prisma.listCollaborator.upsert({
      where: {
        listId_userId: {
          listId,
          userId: invitedUser.id,
        },
      },
      update: {
        role,
        invitedById: user.id,
      },
      create: {
        listId,
        userId: invitedUser.id,
        role,
        invitedById: user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            displayName: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            username: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    return jsonData({ collaborator }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
