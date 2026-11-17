import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { paddleApi } from "@/lib/paddle-server";
import { isBilling, isPaidPlan, priceIdFor } from "@/lib/billing";
import { PROFILE_COLUMNS, toUsage } from "@/lib/usage";

/**
 * POST /api/billing/change-plan  { plan: "starter"|"growth", billing: "monthly"|"annual" }
 *
 * For customers who already have an active subscription: swaps the price on
 * that subscription in Paddle (prorated) instead of opening a second
 * checkout, which would bill them twice. The subscription.updated webhook
 * then updates the plan in Supabase.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Log in first." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (!isPaidPlan(body.plan) || !isBilling(body.billing)) {
    return NextResponse.json({ error: "Choose a plan and a billing period." }, { status: 400 });
  }
  const priceId = priceIdFor(body.plan, body.billing);
  if (!priceId) {
    return NextResponse.json({ error: "That price is not configured." }, { status: 500 });
  }

  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", auth.user.id)
    .limit(1);
  const row = data?.[0];
  const usage = row ? toUsage(row) : null;
  if (!row?.paddle_subscription_id || !usage?.hasSubscription) {
    return NextResponse.json(
      { error: "You don't have an active subscription to change. Choose a plan to start one." },
      { status: 409 },
    );
  }
  if (usage.plan === body.plan && usage.billingCycle === body.billing) {
    return NextResponse.json({ error: "You are already on this plan." }, { status: 409 });
  }

  try {
    await paddleApi(`/subscriptions/${row.paddle_subscription_id}`, {
      method: "PATCH",
      body: {
        items: [{ price_id: priceId, quantity: 1 }],
        proration_billing_mode: "prorated_immediately",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Paddle refused the change." },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
