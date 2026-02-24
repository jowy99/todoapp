import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const PLAIN_PREFIX = "plain:";
const ENCRYPTED_PREFIX = "enc:";

function getEncryptionKey() {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY?.trim();

  if (!raw) {
    return null;
  }

  const fromHex = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : null;
  const key = fromHex ?? Buffer.from(raw, "base64");

  if (key.length !== 32) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY must be 32 bytes (64 hex chars or base64 encoded).",
    );
  }

  return key;
}

export function sealSecret(value: string) {
  const key = getEncryptionKey();

  if (!key) {
    return `${PLAIN_PREFIX}${value}`;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;

  return `${ENCRYPTED_PREFIX}${payload}`;
}

export function openSecret(value: string) {
  if (value.startsWith(PLAIN_PREFIX)) {
    return value.slice(PLAIN_PREFIX.length);
  }

  if (!value.startsWith(ENCRYPTED_PREFIX)) {
    return value;
  }

  const key = getEncryptionKey();

  if (!key) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY is required to decrypt integration secrets in this database.",
    );
  }

  const payload = value.slice(ENCRYPTED_PREFIX.length);
  const [ivB64, tagB64, encryptedB64] = payload.split(".");

  if (!ivB64 || !tagB64 || !encryptedB64) {
    throw new Error("Invalid encrypted payload format.");
  }

  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const encrypted = Buffer.from(encryptedB64, "base64url");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
