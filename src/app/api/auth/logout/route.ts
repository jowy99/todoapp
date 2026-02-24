import { clearCurrentSession } from "@/lib/auth/session";
import { handleRouteError, jsonData } from "@/lib/http";

export async function POST() {
  try {
    await clearCurrentSession();
    return jsonData({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
