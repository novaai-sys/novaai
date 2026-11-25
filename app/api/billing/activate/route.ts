import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { paddleApi } from "@/lib/paddle-server";

/**
 * POST /api/billing/activate
 *
 * For a Paddle subscription that is still in its trial (status "trialing"):
 * ends the trial now and charges the first payment, instead of opening a
 * second checkout that would bill the customer twice. Paddle then sends
 * subscription.activated / subscription.updated, and the webhook marks the
 * account active. (Paddle uses the card saved at checkout.)
 */
export async function POST() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Log in first." }, { status: 401 });

  const { data } = await supabase
    .from("profiles")
    .select("paddle_subscription_id, subscription_status")
    .eq("id", auth.user.id)
    .limit(1);
  const row = data?.[0];
  if (!row?.paddle_subscription_id || row.subscription_status !== "trialing") {
    return NextResponse.json(
      { error: "There's no trial subscription to start. Choose a plan to subscribe." },
      { status: 409 },
    );
  }

  try {
    await paddleApi(`/subscriptions/${encodeURIComponent(row.paddle_subscription_id)}/activate`, {
      method: "POST",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Paddle could not start the subscription." },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
