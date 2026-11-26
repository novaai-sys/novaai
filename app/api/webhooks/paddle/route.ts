import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paddleApi, verifyPaddleSignature } from "@/lib/paddle-server";
import { LOCATION_LIMITS, planForPriceId, type Billing } from "@/lib/billing";

/**
 * POST /api/webhooks/paddle
 *
 * Paddle notification destination. Set it in Paddle > Developer tools >
 * Notifications to https://getnovaai.app/api/webhooks/paddle with the
 * subscription events below and transaction.completed, and put that
 * destination's secret key in PADDLE_WEBHOOK_SECRET.
 *
 * Every event ends in the same update: the account's profile (the source of
 * truth for plan and access) and, mirrored, the account's businesses get the
 * subscription status, plan, Paddle customer ID and subscription ID. A paid
 * checkout therefore replaces any free-trial state as soon as Paddle reports
 * it: subscription.created arrives with status "active", and
 * transaction.completed (fetched back from Paddle for the current status)
 * covers the case where it arrives first.
 *
 * Responses: 401 bad signature, 500 database error (Paddle retries),
 * 200 everything else, including events we ignore.
 */

const SUBSCRIPTION_EVENTS = new Set([
  "subscription.created",
  "subscription.activated",
  "subscription.updated",
  "subscription.canceled",
  "subscription.past_due",
  "subscription.paused",
  "subscription.resumed",
  "subscription.trialing",
]);

type CustomData = { user_id?: string; userId?: string; business_id?: string } | null;

type Subscription = {
  id: string;
  status: string;
  customer_id: string;
  custom_data?: CustomData;
  items?: { price?: { id?: string } }[];
  billing_cycle?: { interval?: string } | null;
  current_billing_period?: { ends_at?: string } | null;
};

type Transaction = {
  id: string;
  status: string;
  subscription_id?: string | null;
  customer_id?: string | null;
  custom_data?: CustomData;
};

type PaddleEvent = {
  event_id: string;
  event_type: string;
  occurred_at: string;
  data: Subscription | Transaction;
};

const ok = (message: string) => NextResponse.json({ ok: true, message });

export async function POST(request: Request) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "PADDLE_WEBHOOK_SECRET is not set." },
      { status: 500 },
    );
  }

  // The signature covers the exact bytes Paddle sent, so read raw text first.
  const raw = await request.text();
  if (!verifyPaddleSignature(raw, request.headers.get("paddle-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: PaddleEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Body is not JSON." }, { status: 400 });
  }

  let sub: Subscription;
  if (SUBSCRIPTION_EVENTS.has(event.event_type)) {
    sub = event.data as Subscription;
  } else if (event.event_type === "transaction.completed") {
    const txn = event.data as Transaction;
    if (!txn.subscription_id) return ok("One-time transaction; nothing to apply.");
    // The transaction says a payment went through; the subscription says what
    // it bought and its current status. Ask Paddle for the latter.
    try {
      const res = await paddleApi<{ data: Subscription }>(
        `/subscriptions/${encodeURIComponent(txn.subscription_id)}`,
        { method: "GET" },
      );
      sub = { ...res.data, custom_data: res.data.custom_data ?? txn.custom_data ?? null };
    } catch (e) {
      console.error(`[paddle] transaction.completed ${txn.id}: could not load subscription`, e);
      // 500 so Paddle retries; subscription.created will usually arrive too.
      return NextResponse.json({ error: "Could not load the subscription." }, { status: 500 });
    }
  } else {
    return ok(`Ignored ${event.event_type}.`);
  }

  return apply(event.event_type, sub, new Date(event.occurred_at).toISOString());
}

async function apply(eventType: string, sub: Subscription, occurredAt: string) {
  const db = createAdminClient();

  // Find the NovaAI user: custom data from checkout first, then stored IDs.
  const userId = sub.custom_data?.user_id || sub.custom_data?.userId;
  const lookup = db.from("profiles").select("id, paddle_event_at").limit(1);
  const { data: found, error: findError } = userId
    ? await lookup.eq("id", userId)
    : await lookup.eq("paddle_subscription_id", sub.id);
  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 });
  }
  const profile = found?.[0];
  if (!profile) {
    console.warn(`[paddle] ${eventType} ${sub.id}: no matching user.`);
    return ok("No matching user.");
  }

  // Paddle can deliver events out of order. Never let an older one win.
  if (profile.paddle_event_at && new Date(profile.paddle_event_at) > new Date(occurredAt)) {
    return ok("Older than the last applied event; skipped.");
  }

  const mapped = planForPriceId(sub.items?.[0]?.price?.id);
  const interval = sub.billing_cycle?.interval;
  const billing: Billing | null =
    mapped?.billing ?? (interval === "year" ? "annual" : interval === "month" ? "monthly" : null);

  const update: Record<string, unknown> = {
    subscription_status: sub.status,
    paddle_subscription_id: sub.id,
    paddle_customer_id: sub.customer_id,
    current_period_end: sub.current_billing_period?.ends_at ?? null,
    paddle_event_at: occurredAt,
  };
  if (billing) update.billing_cycle = billing;
  if (mapped) {
    update.plan = mapped.plan;
    update.locations_limit = LOCATION_LIMITS[mapped.plan];
  } else {
    console.warn(
      `[paddle] ${eventType} ${sub.id}: price ${sub.items?.[0]?.price?.id} is not one of the four NovaAI prices; plan unchanged.`,
    );
  }

  const { error } = await db.from("profiles").update(update).eq("id", profile.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Mirror onto the account's businesses (phone lines), so anything reading
  // a business sees the same subscription.
  const mirror: Record<string, unknown> = {
    subscription_status: sub.status,
    paddle_subscription_id: sub.id,
    paddle_customer_id: sub.customer_id,
  };
  if (mapped) mirror.plan = mapped.plan;
  const { error: mirrorError } = await db.from("businesses").update(mirror).eq("user_id", profile.id);
  if (mirrorError) {
    return NextResponse.json({ error: mirrorError.message }, { status: 500 });
  }

  return ok(`Applied ${eventType} to ${profile.id}.`);
}
