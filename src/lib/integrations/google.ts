import { IntegrationConnection, IntegrationProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { openSecret, sealSecret } from "@/lib/integrations/secrets";

const GOOGLE_OAUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";
const GOOGLE_SCOPE =
  "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email";

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
};

function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    "http://localhost:3000/api/integrations/google/callback";

  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.");
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

export function buildGoogleAuthUrl(state: string) {
  const config = getGoogleOAuthConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    scope: GOOGLE_SCOPE,
    state,
  });

  return `${GOOGLE_OAUTH_ENDPOINT}?${params.toString()}`;
}

async function readGoogleErrorMessage(response: Response) {
  const text = await response.text();

  try {
    const parsed = JSON.parse(text) as { error_description?: string; error?: string };
    return parsed.error_description || parsed.error || text;
  } catch {
    return text;
  }
}

export async function exchangeGoogleCodeForTokens(code: string) {
  const config = getGoogleOAuthConfig();
  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await readGoogleErrorMessage(response);
    throw new Error(`Google token exchange failed: ${details}`);
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const config = getGoogleOAuthConfig();
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await readGoogleErrorMessage(response);
    throw new Error(`Google token refresh failed: ${details}`);
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function getGoogleAccountEmail(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await readGoogleErrorMessage(response);
    throw new Error(`Google user info request failed: ${details}`);
  }

  const payload = (await response.json()) as { email?: string };

  return payload.email ?? null;
}

function isAccessTokenExpired(connection: IntegrationConnection) {
  if (!connection.accessTokenExpiresAt) {
    return true;
  }

  return connection.accessTokenExpiresAt.getTime() <= Date.now() + 60_000;
}

export async function ensureGoogleAccessToken(userId: string) {
  const connection = await prisma.integrationConnection.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: IntegrationProvider.GOOGLE_CALENDAR,
      },
    },
  });

  if (!connection) {
    throw new Error("Google Calendar is not connected.");
  }

  if (connection.accessToken && !isAccessTokenExpired(connection)) {
    return {
      accessToken: openSecret(connection.accessToken),
      connection,
    };
  }

  if (!connection.refreshToken) {
    throw new Error("Google refresh token is missing. Reconnect your account.");
  }

  const refreshed = await refreshGoogleAccessToken(openSecret(connection.refreshToken));
  const accessTokenExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
  const updatedConnection = await prisma.integrationConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: sealSecret(refreshed.access_token),
      accessTokenExpiresAt,
      refreshToken: refreshed.refresh_token
        ? sealSecret(refreshed.refresh_token)
        : connection.refreshToken,
    },
  });

  return {
    accessToken: refreshed.access_token,
    connection: updatedConnection,
  };
}

export async function upsertGoogleConnection(params: {
  userId: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  externalAccountEmail: string | null;
}) {
  const existing = await prisma.integrationConnection.findUnique({
    where: {
      userId_provider: {
        userId: params.userId,
        provider: IntegrationProvider.GOOGLE_CALENDAR,
      },
    },
  });

  const expiresAt = new Date(Date.now() + params.expiresIn * 1000);

  return prisma.integrationConnection.upsert({
    where: {
      userId_provider: {
        userId: params.userId,
        provider: IntegrationProvider.GOOGLE_CALENDAR,
      },
    },
    create: {
      userId: params.userId,
      provider: IntegrationProvider.GOOGLE_CALENDAR,
      externalAccountEmail: params.externalAccountEmail,
      accessToken: sealSecret(params.accessToken),
      refreshToken: params.refreshToken ? sealSecret(params.refreshToken) : undefined,
      accessTokenExpiresAt: expiresAt,
    },
    update: {
      externalAccountEmail: params.externalAccountEmail,
      accessToken: sealSecret(params.accessToken),
      refreshToken:
        params.refreshToken != null
          ? sealSecret(params.refreshToken)
          : (existing?.refreshToken ?? undefined),
      accessTokenExpiresAt: expiresAt,
    },
  });
}

export async function googleApiFetch<T>(params: {
  accessToken: string;
  path: string;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
}) {
  const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}${params.path}`, {
    method: params.method ?? "GET",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      ...(params.body ? { "Content-Type": "application/json" } : {}),
    },
    body: params.body ? JSON.stringify(params.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await readGoogleErrorMessage(response);
    throw new Error(`Google Calendar API error: ${details}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}
