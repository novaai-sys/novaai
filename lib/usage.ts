/**
 * Plan and AI-reply usage for one account, shared by the API and dashboard.
 * Free trial: up to `limit` replies until `trialEndsAt`.
 * Starter and Growth with an active subscription: unlimited.
 * A canceled or paused subscription falls back to the trial rules.
 */

import { LOCATION_LIMITS, PAID_ACCESS_STATUSES, type Billing } from "./billing";

export type PlanId = "free" | "starter" | "growth";

export type Usage = {
  /** The plan the account is billed for, as stored. */
  plan: PlanId;
  /** Whether a paid plan currently gives unlimited replies. */
  paidAccess: boolean;
  used: number;
  /** null with paid access: no limit. */
  limit: number | null;
  /** null with paid access. */
  remaining: number | null;
  trialEndsAt: string | null;
  trialEnded: boolean;
  /** Whether the account may generate another reply right now. */
  canGenerate: boolean;
  subscriptionStatus: string | null;
  billingCycle: Billing | null;
  currentPeriodEnd: string | null;
  /** A live Paddle subscription exists (change plan instead of a new checkout). */
  hasSubscription: boolean;
  locationsLimit: number;
};

export type ProfileRow = {
  plan?: string | null;
  credits_used: number;
  credits_limit: number;
  trial_ends_at?: string | null;
  subscription_status?: string | null;
  billing_cycle?: string | null;
  current_period_end?: string | null;
  paddle_subscription_id?: string | null;
  locations_limit?: number | null;
};

export const PROFILE_COLUMNS =
  "plan, credits_used, credits_limit, trial_ends_at, subscription_status, billing_cycle, current_period_end, paddle_subscription_id, locations_limit";

export const planNames: Record<PlanId, string> = {
  free: "Free Trial",
  starter: "Starter",
  growth: "Growth",
};

export function toUsage(row: ProfileRow, now = Date.now()): Usage {
  const plan: PlanId =
    row.plan === "starter" || row.plan === "growth" ? row.plan : "free";
  const status = row.subscription_status ?? null;
  const paidAccess =
    plan !== "free" && PAID_ACCESS_STATUSES.includes(status ?? "");

  const trialEndsAt = row.trial_ends_at ?? null;
  const trialEnded = trialEndsAt ? new Date(trialEndsAt).getTime() <= now : false;
  const remaining = Math.max(row.credits_limit - row.credits_used, 0);

  const common = {
    plan,
    paidAccess,
    used: row.credits_used,
    trialEndsAt,
    trialEnded,
    subscriptionStatus: status,
    billingCycle: (row.billing_cycle === "monthly" || row.billing_cycle === "annual"
      ? row.billing_cycle
      : null) as Billing | null,
    currentPeriodEnd: row.current_period_end ?? null,
    hasSubscription:
      Boolean(row.paddle_subscription_id) && paidAccess,
    locationsLimit:
      row.locations_limit ?? LOCATION_LIMITS[paidAccess ? plan : "free"],
  };

  if (paidAccess) {
    return { ...common, limit: null, remaining: null, canGenerate: true };
  }
  return {
    ...common,
    limit: row.credits_limit,
    remaining,
    canGenerate: remaining > 0 && !trialEnded,
  };
}

export const formatDay = (iso: string) =>
  new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(
    new Date(iso),
  );
