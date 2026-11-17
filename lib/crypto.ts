import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM for secrets stored in the database (Google refresh tokens).
 * Key: GOOGLE_TOKEN_ENCRYPTION_KEY, 32 random bytes in base64.
 * Generate one with:  openssl rand -base64 32
 */
function key() {
  const raw = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ?? "";
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error(
      "GOOGLE_TOKEN_ENCRYPTION_KEY must be 32 bytes in base64. Generate one with: openssl rand -base64 32",
    );
  }
  return buf;
}

export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv, tag, body].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

export function decrypt(stored: string) {
  const [version, iv, tag, body] = stored.split(".");
  if (version !== "v1" || !iv || !tag || !body) {
    throw new Error("Stored token has an unknown format.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(body, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
