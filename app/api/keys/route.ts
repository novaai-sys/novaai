import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateKey } from "@/lib/api-keys";

const MAX_ACTIVE_KEYS = 5;

/**
 * POST /api/keys  { name? }
 * Creates an API key for the signed-in user. The full key is returned once,
 * in this response, and never again.
 */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Log in first." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name =
    typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 60) : "API key";

  const db = createAdminClient();
  const { count } = await db
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("revoked_at", null);
  if ((count ?? 0) >= MAX_ACTIVE_KEYS) {
    return NextResponse.json(
      { error: `You can have up to ${MAX_ACTIVE_KEYS} active keys. Revoke one first.` },
      { status: 409 },
    );
  }

  const { key, hash, prefix } = generateKey();
  const { data, error } = await db
    .from("api_keys")
    .insert({ user_id: user.id, name, key_hash: hash, key_prefix: prefix })
    .select("id, name, key_prefix, created_at, last_used_at, revoked_at")
    .limit(1);
  if (error || !data?.[0]) {
    return NextResponse.json(
      { error: `Could not create the key: ${error?.message ?? "no row"}. Has supabase/migrations/20261118200000_api_keys.sql been run?` },
      { status: 500 },
    );
  }
  return NextResponse.json({ key, apiKey: data[0] }, { status: 201 });
}
