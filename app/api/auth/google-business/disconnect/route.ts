import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { revokeToken } from "@/lib/google/business";

/**
 * POST /api/auth/google-business/disconnect
 * Revokes NovaAI's Google access and deletes the stored token and its
 * locations. Reviews stay, unlinked from Google.
 */
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Log in first." }, { status: 401 });

  const db = createAdminClient();
  const { data } = await db
    .from("google_connections")
    .select("refresh_token_encrypted")
    .eq("user_id", user.id)
    .limit(1);
  const stored = data?.[0]?.refresh_token_encrypted;
  if (stored) {
    try {
      await revokeToken(decrypt(stored));
    } catch {
      // Revoking is best effort; the token is deleted below either way.
    }
  }

  const { error } = await db.from("google_connections").delete().eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
