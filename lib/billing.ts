/**
 * Plans, billing cycles and Paddle price IDs, shared by browser and server.
 * Price IDs are public values; each env var is read by its full name so
 * Next.js can inline it into the browser bundle.
 */

export type PaidPlan = "starter" | "growth";
export type Billing = "monthly" | "annual";

export const PRICE_IDS: Record<PaidPlan, Record<Billing, string | undefined>> = {
  starter: {
    monthly: process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER_MONTHLY,
    annual: process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER_ANNUAL,
  },
  growth: {
    monthly: process.env.NEXT_PUBLIC_PADDLE_PRICE_GROWTH_MONTHLY,
    annual: process.env.NEXT_PUBLIC_PADDLE_PRICE_GROWTH_ANNUAL,
  },
};

/** How many Google Business Profile locations each plan may connect. */
export const LOCATION_LIMITS: Record<"free" | PaidPlan, number> = {
  free: 1,
  starter: 1,
  growth: 5,
};

export const priceIdFor = (plan: PaidPlan, billing: Billing) =>
  PRICE_IDS[plan][billing];

/** Which plan and cycle a Paddle price ID stands for, or null if unknown. */
export function planForPriceId(
  priceId: string | null | undefined,
): { plan: PaidPlan; billing: Billing } | null {
  if (!priceId) return null;
  for (const plan of ["starter", "growth"] as const) {
    for (const billing of ["monthly", "annual"] as const) {
      if (PRICE_IDS[plan][billing] === priceId) return { plan, billing };
    }
  }
  return null;
}

export const isPaidPlan = (v: unknown): v is PaidPlan =>
  v === "starter" || v === "growth";
export const isBilling = (v: unknown): v is Billing =>
  v === "monthly" || v === "annual";

/** "starter-annual" -> { plan, billing } */
export function parseCheckoutParam(v: string | null) {
  const [plan, billing] = (v ?? "").split("-");
  return isPaidPlan(plan) && isBilling(billing) ? { plan, billing } : null;
}

/** Subscription statuses that give paid access. Mirrors has_paid_access() in SQL. */
export const PAID_ACCESS_STATUSES = ["active", "trialing", "past_due"];

/** Only same-site dashboard paths are allowed as a post-login destination. */
export function safeNext(next: string | null | undefined) {
  if (!next) return null;
  return next.startsWith("/dashboard") && !next.startsWith("//") ? next : null;
}
