import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt, encrypt } from "@/lib/crypto";
import { GoogleError, refreshAccessToken } from "./business";

/**
 * Google access tokens live about an hour. We cache the current one,
 * encrypted, in google_connections and only refresh it when it is within a
 * minute of expiring. If Google refuses the refresh token, the connection is
 * marked 'needs_reconnect' and the dashboard asks the owner to reconnect.
 */

export const CONNECTION_COLUMNS =
  "id, user_id, status, refresh_token_encrypted, access_token_encrypted, token_expires_at";

export type ConnectionRow = {
  id: string;
  user_id: string;
  status: string;
  refresh_token_encrypted: string;
  access_token_encrypted: string | null;
  token_expires_at: string | null;
};

const EARLY_REFRESH_MS = 60_000;

export class ReconnectNeeded extends Error {}

export async function accessTokenForConnection(
  db: SupabaseClient,
  conn: ConnectionRow,
  { force = false } = {},
): Promise<string> {
  if (conn.status === "needs_reconnect") {
    throw new ReconnectNeeded("Google access was removed. Reconnect Google on the Locations page.");
  }

  const fresh =
    conn.access_token_encrypted &&
    conn.token_expires_at &&
    Date.parse(conn.token_expires_at) - Date.now() > EARLY_REFRESH_MS;
  if (fresh && !force) {
    try {
      return decrypt(conn.access_token_encrypted!);
    } catch {
      // Unreadable cache (e.g. the encryption key changed): refresh instead.
    }
  }

  let token;
  try {
    token = await refreshAccessToken(conn.refresh_token_encrypted);
  } catch (e) {
    if (e instanceof GoogleError && e.code === "invalid_grant") {
      const message = "Google access was removed or expired. Reconnect Google on the Locations page.";
      await db
        .from("google_connections")
        .update({ status: "needs_reconnect", last_error: message, access_token_encrypted: null })
        .eq("id", conn.id);
      conn.status = "needs_reconnect";
      throw new ReconnectNeeded(message);
    }
    throw e;
  }

  const expiresAt = new Date(Date.now() + token.expiresIn * 1000).toISOString();
  const cached = encrypt(token.accessToken);
  await db
    .from("google_connections")
    .update({
      access_token_encrypted: cached,
      token_expires_at: expiresAt,
      status: "active",
      last_error: null,
    })
    .eq("id", conn.id);
  conn.access_token_encrypted = cached;
  conn.token_expires_at = expiresAt;
  return token.accessToken;
}

/** The connection of one NovaAI user, or null. */
export async function connectionForUser(db: SupabaseClient, userId: string) {
  const { data } = await db
    .from("google_connections")
    .select(CONNECTION_COLUMNS)
    .eq("user_id", userId)
    .limit(1);
  return (data?.[0] as ConnectionRow | undefined) ?? null;
}

/**
 * Runs a Google API call with a valid token. If Google rejects the cached
 * token (401), refreshes once and retries.
 */
export async function withGoogleToken<T>(
  db: SupabaseClient,
  conn: ConnectionRow,
  call: (accessToken: string) => Promise<T>,
): Promise<T> {
  try {
    return await call(await accessTokenForConnection(db, conn));
  } catch (e) {
    if (e instanceof GoogleError && e.status === 401) {
      return call(await accessTokenForConnection(db, conn, { force: true }));
    }
    throw e;
  }
}
