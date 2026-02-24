import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

function generateToken() {
  return randomBytes(24).toString("hex");
}

export async function ensureUserFeedToken(userId: string) {
  return prisma.userFeedToken.upsert({
    where: {
      userId,
    },
    update: {},
    create: {
      userId,
      icsToken: generateToken(),
      webhookToken: generateToken(),
    },
  });
}

export async function rotateIcsToken(userId: string) {
  return prisma.userFeedToken.upsert({
    where: { userId },
    update: {
      icsToken: generateToken(),
    },
    create: {
      userId,
      icsToken: generateToken(),
      webhookToken: generateToken(),
    },
  });
}

export async function rotateWebhookToken(userId: string) {
  return prisma.userFeedToken.upsert({
    where: { userId },
    update: {
      webhookToken: generateToken(),
    },
    create: {
      userId,
      icsToken: generateToken(),
      webhookToken: generateToken(),
    },
  });
}
