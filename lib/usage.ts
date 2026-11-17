/**
 * AI-reply usage for one account, shared by the API and the dashboard.
 * Free trial: up to `limit` replies until `trialEndsAt`.
 * Starter and Growth: unlimited.
 */

export type PlanId = "free" | "starter" | "growth";

export type Usage = {
  plan: PlanId;
  used: number;
  /** null on paid plans: no limit. */
  limit: number | null;
  /** null on paid plans. */
  remaining: number | null;
  /** ISO date; null on paid plans. */
  trialEndsAt: string | null;
  trialEnded: boolean;
  /** Whether the account may generate another reply right now. */
  canGenerate: boolean;
};

export type ProfileRow = {
  plan?: string | null;
  credits_used: number;
  credits_limit: number;
  trial_ends_at?: string | null;
};

export const planNames: Record<PlanId, string> = {
  free: "Free Trial",
  starter: "Starter",
  growth: "Growth",
};

export function toUsage(row: ProfileRow, now = Date.now()): Usage {
  const plan: PlanId =
    row.plan === "starter" || row.plan === "growth" ? row.plan : "free";

  if (plan !== "free") {
    return {
      plan,
      used: row.credits_used,
      limit: null,
      remaining: null,
      trialEndsAt: null,
      trialEnded: false,
      canGenerate: true,
    };
  }

  const remaining = Math.max(row.credits_limit - row.credits_used, 0);
  const trialEndsAt = row.trial_ends_at ?? null;
  const trialEnded = trialEndsAt ? new Date(trialEndsAt).getTime() <= now : false;

  return {
    plan,
    used: row.credits_used,
    limit: row.credits_limit,
    remaining,
    trialEndsAt,
    trialEnded,
    canGenerate: remaining > 0 && !trialEnded,
  };
}

export const formatDay = (iso: string) =>
  new Intl.DateTimeFormat("en", { month: "long", day: "numeric" }).format(
    new Date(iso),
  );
