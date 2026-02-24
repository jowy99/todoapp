import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

type ErrorPayload = {
  message: string;
  details?: unknown;
};

export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function jsonError(status: number, payload: ErrorPayload) {
  return NextResponse.json({ error: payload }, { status });
}

export function jsonData<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export async function parseRequestJson<TSchema>(request: Request, schema: z.ZodType<TSchema>) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }

  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    throw new HttpError(400, "Validation failed.", parsed.error.flatten());
  }

  return parsed.data;
}

export function handleRouteError(error: unknown) {
  if (error instanceof HttpError) {
    return jsonError(error.status, {
      message: error.message,
      details: error.details,
    });
  }

  if (error instanceof ZodError) {
    return jsonError(400, {
      message: "Validation failed.",
      details: error.flatten(),
    });
  }

  console.error("Unhandled route error:", error);
  return jsonError(500, {
    message: "Unexpected server error.",
  });
}
