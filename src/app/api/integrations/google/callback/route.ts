import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/session";
import {
  exchangeGoogleCodeForTokens,
  getGoogleAccountEmail,
  upsertGoogleConnection,
} from "@/lib/integrations/google";

const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";

function redirectToIntegrations(requestUrl: string, status: string) {
  return NextResponse.redirect(new URL(`/integrations?google=${status}`, requestUrl));
}

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser();
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const cookieStore = await cookies();
    const cookieState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;

    if (!code || !state || !cookieState) {
      return redirectToIntegrations(request.url, "invalid-state");
    }

    const [cookieUserId, nonce] = cookieState.split(":");

    if (!cookieUserId || !nonce || cookieUserId !== user.id || nonce !== state) {
      return redirectToIntegrations(request.url, "invalid-state");
    }

    const tokenResponse = await exchangeGoogleCodeForTokens(code);
    const email = await getGoogleAccountEmail(tokenResponse.access_token);

    await upsertGoogleConnection({
      userId: user.id,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresIn: tokenResponse.expires_in,
      externalAccountEmail: email,
    });

    cookieStore.delete(GOOGLE_OAUTH_STATE_COOKIE);
    return redirectToIntegrations(request.url, "connected");
  } catch (error) {
    console.error("Google callback error:", error);
    return redirectToIntegrations(request.url, "error");
  }
}
