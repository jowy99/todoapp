import { IntegrationProvider } from "@prisma/client";
import { requireCurrentUser } from "@/lib/auth/session";
import { taskAccessWhere } from "@/lib/collaboration";
import { handleRouteError, HttpError, jsonData } from "@/lib/http";
import { ensureGoogleAccessToken, googleApiFetch } from "@/lib/integrations/google";
import { prisma } from "@/lib/prisma";

type GoogleCalendarListResponse = {
  items?: Array<{
    id: string;
    summary?: string;
  }>;
};

type GoogleCalendarResponse = {
  id: string;
};

type GoogleEventResponse = {
  id: string;
};

const TODO_CALENDAR_NAME = "Todo Studio Tasks";

function buildGoogleEventPayload(task: {
  id: string;
  title: string;
  description: string;
  dueDate: Date | null;
  priority: string;
  status: string;
}) {
  const appBaseUrl =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000";
  const dueDate = task.dueDate ?? new Date();
  const endDate = new Date(dueDate.getTime() + 30 * 60 * 1000);

  return {
    summary: task.title,
    description: `${task.description || "Sin descripción"}\nPrioridad: ${task.priority}\nEstado: ${task.status}`,
    start: {
      dateTime: dueDate.toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: "UTC",
    },
    source: {
      title: "Todo Studio",
      url: `${appBaseUrl.replace(/\/$/, "")}/tasks`,
    },
  };
}

async function ensureCalendarId(params: {
  userId: string;
  accessToken: string;
  existingCalendarId: string | null;
}) {
  if (params.existingCalendarId) {
    return params.existingCalendarId;
  }

  const calendarList = await googleApiFetch<GoogleCalendarListResponse>({
    accessToken: params.accessToken,
    path: "/users/me/calendarList",
  });
  const existing = calendarList.items?.find((item) => item.summary === TODO_CALENDAR_NAME);

  if (existing?.id) {
    await prisma.integrationConnection.update({
      where: {
        userId_provider: {
          userId: params.userId,
          provider: IntegrationProvider.GOOGLE_CALENDAR,
        },
      },
      data: {
        calendarId: existing.id,
      },
    });

    return existing.id;
  }

  const created = await googleApiFetch<GoogleCalendarResponse>({
    accessToken: params.accessToken,
    path: "/calendars",
    method: "POST",
    body: {
      summary: TODO_CALENDAR_NAME,
      description: "Synced from Todo Studio local app",
    },
  });

  await prisma.integrationConnection.update({
    where: {
      userId_provider: {
        userId: params.userId,
        provider: IntegrationProvider.GOOGLE_CALENDAR,
      },
    },
    data: {
      calendarId: created.id,
    },
  });

  return created.id;
}

export async function POST() {
  try {
    const user = await requireCurrentUser();
    const { accessToken, connection } = await ensureGoogleAccessToken(user.id);

    if (!connection) {
      throw new HttpError(404, "Google Calendar is not connected.");
    }

    const calendarId = await ensureCalendarId({
      userId: user.id,
      accessToken,
      existingCalendarId: connection.calendarId ?? null,
    });

    const [tasks, mappings] = await Promise.all([
      prisma.task.findMany({
        where: {
          AND: [
            taskAccessWhere(user.id),
            {
              dueDate: {
                not: null,
              },
              isCompleted: false,
            },
          ],
        },
        orderBy: [{ dueDate: "asc" }],
        select: {
          id: true,
          title: true,
          description: true,
          dueDate: true,
          priority: true,
          status: true,
        },
      }),
      prisma.externalCalendarEvent.findMany({
        where: {
          integrationId: connection.id,
        },
      }),
    ]);

    const mappingByTaskId = new Map(mappings.map((mapping) => [mapping.taskId, mapping]));
    const syncTaskIds = new Set(tasks.map((task) => task.id));
    let createdCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;

    for (const mapping of mappings) {
      if (syncTaskIds.has(mapping.taskId)) {
        continue;
      }

      try {
        await googleApiFetch<null>({
          accessToken,
          path: `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(mapping.externalEventId)}`,
          method: "DELETE",
        });
      } catch (error) {
        console.warn("Unable to delete stale Google event:", error);
      }

      await prisma.externalCalendarEvent.delete({
        where: {
          id: mapping.id,
        },
      });
      deletedCount += 1;
    }

    for (const task of tasks) {
      const payload = buildGoogleEventPayload(task);
      const mapping = mappingByTaskId.get(task.id);

      if (mapping) {
        try {
          await googleApiFetch<GoogleEventResponse>({
            accessToken,
            path: `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(mapping.externalEventId)}`,
            method: "PATCH",
            body: payload,
          });
          updatedCount += 1;
          continue;
        } catch (error) {
          console.warn("Unable to update Google event. Recreating event...", error);
          await prisma.externalCalendarEvent.delete({
            where: {
              id: mapping.id,
            },
          });
        }
      }

      const createdEvent = await googleApiFetch<GoogleEventResponse>({
        accessToken,
        path: `/calendars/${encodeURIComponent(calendarId)}/events`,
        method: "POST",
        body: payload,
      });

      await prisma.externalCalendarEvent.create({
        data: {
          integrationId: connection.id,
          taskId: task.id,
          externalEventId: createdEvent.id,
        },
      });
      createdCount += 1;
    }

    return jsonData({
      synced: {
        createdCount,
        updatedCount,
        deletedCount,
        totalActiveTasks: tasks.length,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
