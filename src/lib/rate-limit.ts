type RateLimitState = {
  count: number;
  resetAt: number;
};

type CheckRateLimitInput = {
  key: string;
  maxRequests: number;
  windowMs: number;
};

type CheckRateLimitResult = {
  ok: boolean;
  retryAfterSeconds: number;
};

const store = new Map<string, RateLimitState>();

function pruneExpiredEntries(now: number) {
  for (const [key, state] of store.entries()) {
    if (state.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(input: CheckRateLimitInput): CheckRateLimitResult {
  const now = Date.now();
  pruneExpiredEntries(now);

  const state = store.get(input.key);

  if (!state || state.resetAt <= now) {
    store.set(input.key, {
      count: 1,
      resetAt: now + input.windowMs,
    });

    return {
      ok: true,
      retryAfterSeconds: Math.ceil(input.windowMs / 1000),
    };
  }

  if (state.count >= input.maxRequests) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((state.resetAt - now) / 1000)),
    };
  }

  state.count += 1;
  store.set(input.key, state);

  return {
    ok: true,
    retryAfterSeconds: Math.max(1, Math.ceil((state.resetAt - now) / 1000)),
  };
}

export function clientIpFromHeaders(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for");

  if (forwardedFor) {
    const [first] = forwardedFor.split(",");
    return first?.trim() || "unknown";
  }

  const realIp = headers.get("x-real-ip");
  return realIp?.trim() || "unknown";
}
