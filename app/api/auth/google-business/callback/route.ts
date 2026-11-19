import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/crypto";
import {
  GBP_SCOPE,
  emailFromIdToken,
  exchangeCode,
  googleConfigured,
  listLocations,
} from "@/lib/google/business";
import { LOCATION_LIMITS } from "@/lib/billing";
import { PROFILE_COLUMNS, toUsage } from "@/lib/usage";

const STATE_COOKIE = "gbp_oauth_state";

/**
 * GET /api/auth/google-business/callback?code=...&state=...
 *
 * 1. Checks the state against the cookie set by /connect.
 * 2. Exchanges the code for tokens and requires a refresh token and the
 *    business.manage scope.
 * 3. Stores the refresh token, encrypted, in google_connections.
 * 4. Imports the user's Business Profile locations, up to their plan limit.
 *    If Google refuses (API access not approved yet), the connection is kept
 *    and locations can be imported later by reconnecting.
 */
export async function GET(request: NextRequest) {
  const done = (q: string) => {
    const res = NextResponse.redirect(
      new URL(`/dashboard/locations?google=${q}`, request.url),
    );
    res.cookies.set(STATE_COOKIE, "", { path: "/api/auth/google-business", maxAge: 0 });
    return res;
  };

  const params = request.nextUrl.searchParams;
  if (params.get("error")) return done("denied");

  const state = params.get("state") ?? "";
  const cookie = request.cookies.get(STATE_COOKIE)?.value ?? "";
  const stateOk =
    state.length > 0 &&
    state.length === cookie.length &&
    timingSafeEqual(Buffer.from(state), Buffer.from(cookie));
  if (!stateOk) return done("state_mismatch");

  const user = await getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/dashboard/locations", request.url));
  }
  if (!googleConfigured()) return done("not_configured");

  const code = params.get("code");
  if (!code) return done("error");

  let tokens;
  try {
    tokens = await exchangeCode(code, request.nextUrl.origin);
  } catch (e) {
    console.error("[google] code exchange failed:", e);
    return done("error");
  }
  if (!tokens.scope?.split(" ").includes(GBP_SCOPE)) return done("missing_scope");
  if (!tokens.refresh_token) return done("no_refresh_token");

  const db = createAdminClient();

  const { data: conn, error: connError } = await db
    .from("google_connections")
    .upsert(
      {
        user_id: user.id,
        google_email: emailFromIdToken(tokens.id_token),
        refresh_token_encrypted: encrypt(tokens.refresh_token),
        access_token_encrypted: encrypt(tokens.access_token),
        token_expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
        status: "active",
        last_error: null,
        scope: tokens.scope,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("id")
    .limit(1);
  if (connError || !conn?.[0]) {
    console.error("[google] could not save connection:", connError);
    return done("error");
  }

  // Import locations, within the plan's limit.
  let found;
  try {
    found = await listLocations(tokens.access_token);
  } catch (e) {
    console.warn("[google] connected, but locations could not be listed:", e);
    return done("connected_no_access");
  }
  // Remember which Google accounts this connection covers.
  await db
    .from("google_connections")
    .update({ account_ids: [...new Set(found.map((l) => l.accountId))] })
    .eq("id", conn[0].id);

  if (found.length === 0) return done("connected_no_locations");

  const [{ data: profileRows }, { data: existing }, { data: settingsRows }] =
    await Promise.all([
      db.from("profiles").select(PROFILE_COLUMNS).eq("id", user.id).limit(1),
      db.from("locations").select("google_location_id").eq("user_id", user.id),
      db
        .from("business_settings")
        .select("autopilot_enabled")
        .eq("user_id", user.id)
        .limit(1),
    ]);
  const usage = profileRows?.[0] ? toUsage(profileRows[0]) : null;
  const limit = usage?.locationsLimit ?? LOCATION_LIMITS.free;
  const have = new Set((existing ?? []).map((l) => l.google_location_id));
  const room = Math.max(limit - have.size, 0);

  const toAdd = found.filter((l) => !have.has(l.locationId)).slice(0, room);
  if (toAdd.length > 0) {
    const { error } = await db.from("locations").insert(
      toAdd.map((l) => ({
        user_id: user.id,
        connection_id: conn[0].id,
        google_account_id: l.accountId,
        google_location_id: l.locationId,
        title: l.title,
        address: l.address,
        // New locations start with the user's Autopilot default.
        auto_reply_enabled: settingsRows?.[0]?.autopilot_enabled ?? false,
      })),
    );
    if (error) {
      console.error("[google] could not save locations:", error);
      return done("error");
    }
  }

  const skipped = found.filter((l) => !have.has(l.locationId)).length - toAdd.length;
  return done(skipped > 0 ? `connected_limit_${skipped}` : "connected");
}
