import { describe, expect, it } from "vitest";
import { checkRateLimit, clientIpFromHeaders } from "./rate-limit";

describe("checkRateLimit", () => {
  it("allows requests under the limit", () => {
    const key = `rate-limit-test-${Date.now()}-allow`;

    const first = checkRateLimit({
      key,
      maxRequests: 2,
      windowMs: 60_000,
    });
    const second = checkRateLimit({
      key,
      maxRequests: 2,
      windowMs: 60_000,
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
  });

  it("blocks when max requests is exceeded", () => {
    const key = `rate-limit-test-${Date.now()}-block`;

    checkRateLimit({
      key,
      maxRequests: 1,
      windowMs: 60_000,
    });

    const blocked = checkRateLimit({
      key,
      maxRequests: 1,
      windowMs: 60_000,
    });

    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("clientIpFromHeaders", () => {
  it("extracts first IP from x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 70.41.3.18",
    });

    expect(clientIpFromHeaders(headers)).toBe("203.0.113.10");
  });

  it("falls back to x-real-ip", () => {
    const headers = new Headers({
      "x-real-ip": "198.51.100.5",
    });

    expect(clientIpFromHeaders(headers)).toBe("198.51.100.5");
  });
});
