export type ApiErrorPayload = {
  error?: {
    message?: string;
    details?: unknown;
  };
};

export class ApiRequestError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError;
}

export async function fetchApi<TData>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });

  const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload & {
    data?: TData;
  };

  if (!response.ok) {
    throw new ApiRequestError(
      response.status,
      payload.error?.message ?? "Request failed.",
      payload.error?.details,
    );
  }

  return payload.data as TData;
}
