import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { paddleApi } from "@/lib/paddle-server";

/**
 * POST /api/billing/portal
 * Returns a one-time link to the Paddle customer portal, where the customer
 * can update their card, download invoices and cancel their subscription.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Log in first." }, { status: 401 });

  const { data } = await supabase
    .from("profiles")
    .select("paddle_customer_id, paddle_subscription_id")
    .eq("id", auth.user.id)
    .limit(1);
  const row = data?.[0];
  if (!row?.paddle_customer_id) {
    return NextResponse.json({ error: "No Paddle customer for this account yet." }, { status: 409 });
  }

  try {
    const res = await paddleApi<{
      data: { urls: { general: { overview: string } } };
    }>(`/customers/${row.paddle_customer_id}/portal-sessions`, {
      method: "POST",
      body: row.paddle_subscription_id
        ? { subscription_ids: [row.paddle_subscription_id] }
        : {},
    });
    return NextResponse.json({ url: res.data.urls.general.overview });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Paddle refused the request." },
      { status: 502 },
    );
  }
}
