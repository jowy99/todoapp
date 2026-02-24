import { requireCurrentUser } from "@/lib/auth/session";
import { getRequestBaseUrl } from "@/lib/app-url";
import { handleRouteError, jsonData } from "@/lib/http";
import { rotateWebhookToken } from "@/lib/integrations/feed-tokens";

export async function POST() {
  try {
    const user = await requireCurrentUser();
    const [updatedToken, baseUrl] = await Promise.all([
      rotateWebhookToken(user.id),
      getRequestBaseUrl(),
    ]);

    return jsonData({
      ingestUrl: `${baseUrl}/api/integrations/webhook/${updatedToken.webhookToken}/tasks`,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
