import { requireCurrentUser } from "@/lib/auth/session";
import { getRequestBaseUrl } from "@/lib/app-url";
import { handleRouteError, jsonData } from "@/lib/http";
import { rotateIcsToken } from "@/lib/integrations/feed-tokens";

export async function POST() {
  try {
    const user = await requireCurrentUser();
    const [updatedToken, baseUrl] = await Promise.all([
      rotateIcsToken(user.id),
      getRequestBaseUrl(),
    ]);

    return jsonData({
      feedUrl: `${baseUrl}/api/feeds/ics/${updatedToken.icsToken}`,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
