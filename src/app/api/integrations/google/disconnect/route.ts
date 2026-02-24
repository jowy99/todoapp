import { IntegrationProvider } from "@prisma/client";
import { requireCurrentUser } from "@/lib/auth/session";
import { handleRouteError, jsonData } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  try {
    const user = await requireCurrentUser();

    await prisma.integrationConnection.deleteMany({
      where: {
        userId: user.id,
        provider: IntegrationProvider.GOOGLE_CALENDAR,
      },
    });

    return jsonData({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
