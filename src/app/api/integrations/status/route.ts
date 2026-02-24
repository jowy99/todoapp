import { IntegrationProvider } from "@prisma/client";
import { requireCurrentUser } from "@/lib/auth/session";
import { getRequestBaseUrl } from "@/lib/app-url";
import { handleRouteError, jsonData } from "@/lib/http";
import { ensureUserFeedToken } from "@/lib/integrations/feed-tokens";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const [connection, feedToken, baseUrl] = await Promise.all([
      prisma.integrationConnection.findUnique({
        where: {
          userId_provider: {
            userId: user.id,
            provider: IntegrationProvider.GOOGLE_CALENDAR,
          },
        },
        select: {
          id: true,
          externalAccountEmail: true,
          accessTokenExpiresAt: true,
          calendarId: true,
          updatedAt: true,
        },
      }),
      ensureUserFeedToken(user.id),
      getRequestBaseUrl(),
    ]);

    return jsonData({
      google: {
        connected: Boolean(connection),
        externalAccountEmail: connection?.externalAccountEmail ?? null,
        accessTokenExpiresAt: connection?.accessTokenExpiresAt ?? null,
        calendarId: connection?.calendarId ?? null,
        lastUpdatedAt: connection?.updatedAt ?? null,
      },
      ics: {
        feedUrl: `${baseUrl}/api/feeds/ics/${feedToken.icsToken}`,
      },
      webhook: {
        ingestUrl: `${baseUrl}/api/integrations/webhook/${feedToken.webhookToken}/tasks`,
      },
      export: {
        jsonUrl: `${baseUrl}/api/export/tasks.json`,
        csvUrl: `${baseUrl}/api/export/tasks.csv`,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
