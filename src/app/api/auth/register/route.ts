import { z } from "zod";
import { createSessionForUser } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { handleRouteError, HttpError, jsonData, parseRequestJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIpFromHeaders } from "@/lib/rate-limit";

const registerSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  displayName: z.string().trim().min(2).max(60).optional(),
});

export async function POST(request: Request) {
  try {
    const ip = clientIpFromHeaders(request.headers);
    const rateLimit = checkRateLimit({
      key: `auth:register:${ip}`,
      maxRequests: 20,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.ok) {
      throw new HttpError(429, "Too many registration attempts. Try again later.", {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
    }

    const body = await parseRequestJson(request, registerSchema);
    const email = body.email.toLowerCase();
    const displayName = body.displayName?.trim() || null;

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new HttpError(409, "This email is already registered.");
    }

    const passwordHash = await hashPassword(body.password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        profile: {
          create: {
            isPublic: false,
          },
        },
        lists: {
          create: {
            name: "Inbox",
            color: "#0ea5e9",
          },
        },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
      },
    });

    await createSessionForUser(user.id);

    return jsonData({ user }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
