export type ApiErrorPayload = {
  error?: {
    message?: string;
  };
};

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
    throw new Error(payload.error?.message ?? "Request failed.");
  }

  return payload.data as TData;
}
