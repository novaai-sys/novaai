import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Account API keys for server-to-server calls (Make.com, Zapier, scripts).
 * Format: nova_sk_<43 url-safe characters>. Only a SHA-256 hash is stored,
 * so a leaked database does not leak working keys.
 */

const PREFIX = "nova_sk_";

export const hashKey = (key: string) =>
  createHash("sha256").update(key, "utf8").digest("hex");

export function generateKey() {
  const key = PREFIX + randomBytes(32).toString("base64url");
  return { key, hash: hashKey(key), prefix: key.slice(0, PREFIX.length + 4) };
}

/** Reads the key from "Authorization: Bearer ..." or "X-API-Key: ...". */
export function keyFromRequest(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const key = bearer || request.headers.get("x-api-key")?.trim() || "";
  return key.startsWith(PREFIX) ? key : null;
}

/** The account a key belongs to, or null if it is unknown or revoked. */
export async function accountForKey(key: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("api_keys")
    .select("id, user_id, revoked_at")
    .eq("key_hash", hashKey(key))
    .limit(1);
  const row = data?.[0];
  if (!row || row.revoked_at) return null;

  // Best effort: shown as "Last used" in the dashboard.
  void db
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id)
    .then(() => undefined);

  return { keyId: row.id as string, userId: row.user_id as string };
}
