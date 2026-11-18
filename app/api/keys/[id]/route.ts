import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** DELETE /api/keys/:id  Revokes one of the signed-in user's keys at once. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Log in first." }, { status: 401 });
  const { id } = await params;

  const { data, error } = await createAdminClient()
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .select("id, name, key_prefix, created_at, last_used_at, revoked_at")
    .limit(1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.[0]) return NextResponse.json({ error: "Key not found." }, { status: 404 });
  return NextResponse.json({ apiKey: data[0] });
}
