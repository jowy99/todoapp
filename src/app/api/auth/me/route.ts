import { getCurrentUser } from "@/lib/auth/session";
import { handleRouteError, jsonData } from "@/lib/http";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return jsonData({ user: null });
    }

    return jsonData({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
