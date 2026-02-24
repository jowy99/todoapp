import { afterEach, describe, expect, it } from "vitest";
import { openSecret, sealSecret } from "./secrets";

const ORIGINAL_KEY = process.env.INTEGRATION_ENCRYPTION_KEY;

afterEach(() => {
  process.env.INTEGRATION_ENCRYPTION_KEY = ORIGINAL_KEY;
});

describe("integration secrets", () => {
  it("stores as plain prefix when key is absent", () => {
    delete process.env.INTEGRATION_ENCRYPTION_KEY;

    const sealed = sealSecret("abc123");
    expect(sealed).toBe("plain:abc123");
    expect(openSecret(sealed)).toBe("abc123");
  });

  it("encrypts and decrypts with valid 32-byte hex key", () => {
    process.env.INTEGRATION_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    const sealed = sealSecret("super-secret-token");
    expect(sealed.startsWith("enc:")).toBe(true);
    expect(openSecret(sealed)).toBe("super-secret-token");
  });

  it("throws when trying to decrypt encrypted payload without key", () => {
    process.env.INTEGRATION_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const sealed = sealSecret("token");

    delete process.env.INTEGRATION_ENCRYPTION_KEY;

    expect(() => openSecret(sealed)).toThrow(
      "INTEGRATION_ENCRYPTION_KEY is required to decrypt integration secrets in this database.",
    );
  });
});
