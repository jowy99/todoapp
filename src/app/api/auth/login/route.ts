import { z } from "zod";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionForUser } from "@/lib/auth/session";
import { handleRouteError, HttpError, jsonData, parseRequestJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIpFromHeaders } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
});

export async function POST(request: Request) {
  try {
    const ip = clientIpFromHeaders(request.headers);
    const rateLimit = checkRateLimit({
      key: `auth:login:${ip}`,
      maxRequests: 30,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.ok) {
      throw new HttpError(429, "Too many login attempts. Try again later.", {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
    }

    const body = await parseRequestJson(request, loginSchema);
    const email = body.email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        displayName: true,
        createdAt: true,
      },
    });

    if (!user?.passwordHash) {
      throw new HttpError(401, "Invalid email or password.");
    }

    const isValidPassword = await verifyPassword(body.password, user.passwordHash);

    if (!isValidPassword) {
      throw new HttpError(401, "Invalid email or password.");
    }

    await createSessionForUser(user.id);

    return jsonData({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
