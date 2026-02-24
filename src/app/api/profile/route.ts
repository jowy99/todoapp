import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth/session";
import { handleRouteError, jsonData, parseRequestJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const profileUpdateSchema = z
  .object({
    displayName: z.string().trim().min(2).max(60).optional(),
    bio: z.string().trim().max(280).optional(),
    avatarUrl: z.string().trim().url().max(2048).optional().nullable(),
    bannerUrl: z.string().trim().url().max(2048).optional().nullable(),
    isPublic: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((fieldValue) => fieldValue !== undefined), {
    message: "At least one field is required.",
  });

function normalizeOptionalUrl(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  return value?.trim() || null;
}

export async function GET() {
  try {
    const user = await requireCurrentUser();

    const profile = await prisma.profile.findUnique({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        bio: true,
        avatarUrl: true,
        bannerUrl: true,
        isPublic: true,
      },
    });

    return jsonData({
      profile: {
        displayName: user.displayName ?? "",
        bio: profile?.bio ?? "",
        avatarUrl: profile?.avatarUrl ?? "",
        bannerUrl: profile?.bannerUrl ?? "",
        isPublic: profile?.isPublic ?? false,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = await parseRequestJson(request, profileUpdateSchema);

    const displayName = body.displayName?.trim();

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          displayName: displayName ?? undefined,
        },
      }),
      prisma.profile.upsert({
        where: {
          userId: user.id,
        },
        create: {
          userId: user.id,
          bio: body.bio?.trim() ?? "",
          avatarUrl: normalizeOptionalUrl(body.avatarUrl) ?? null,
          bannerUrl: normalizeOptionalUrl(body.bannerUrl) ?? null,
          isPublic: body.isPublic ?? false,
        },
        update: {
          bio: body.bio === undefined ? undefined : body.bio.trim(),
          avatarUrl: normalizeOptionalUrl(body.avatarUrl),
          bannerUrl: normalizeOptionalUrl(body.bannerUrl),
          isPublic: body.isPublic,
        },
      }),
    ]);

    const updatedProfile = await prisma.profile.findUnique({
      where: {
        userId: user.id,
      },
      select: {
        bio: true,
        avatarUrl: true,
        bannerUrl: true,
        isPublic: true,
      },
    });

    const refreshedUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        displayName: true,
      },
    });

    return jsonData({
      profile: {
        displayName: refreshedUser?.displayName ?? "",
        bio: updatedProfile?.bio ?? "",
        avatarUrl: updatedProfile?.avatarUrl ?? "",
        bannerUrl: updatedProfile?.bannerUrl ?? "",
        isPublic: updatedProfile?.isPublic ?? false,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
