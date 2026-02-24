import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/session";
import { buildGoogleAuthUrl } from "@/lib/integrations/google";

const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";

export async function GET() {
  const user = await requireCurrentUser();
  const state = randomBytes(24).toString("hex");
  const cookieStore = await cookies();

  cookieStore.set(GOOGLE_OAUTH_STATE_COOKIE, `${user.id}:${state}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  const redirectUrl = buildGoogleAuthUrl(state);
  return NextResponse.redirect(redirectUrl);
}
