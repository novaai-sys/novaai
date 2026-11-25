/**
 * Plans as the billing dashboard and Paddle checkout see them. Prices, call
 * limits and copy come from lib/dispatcher/plans.ts, so every page shows the
 * same numbers. "free" is the account's state before it subscribes.
 */

import type { Billing } from "./billing";
import { dispatcherPlan } from "./dispatcher/plans";
export type { Billing };

export type Plan = {
  id: "free" | "starter" | "growth";
  name: string;
  tagline: string;
  /** Price per month, in US dollars. */
  price: { monthly: number; annual: number };
  features: string[];
  cta: string;
  popular?: boolean;
};

const from = (id: "trial" | "starter" | "growth", planId: Plan["id"]): Plan => {
  const d = dispatcherPlan(id);
  return {
    id: planId,
    name: d.name,
    tagline: d.tagline,
    price: d.price,
    features: d.features,
    cta: d.cta,
    popular: d.popular,
  };
};

export const plans: Plan[] = [from("trial", "free"), from("starter", "starter"), from("growth", "growth")];

/**
 * Where a plan's button goes. The free trial opens sign-up. Paid plans open
 * sign-up too, then continue to the Paddle checkout on the Billing page; a
 * visitor who is already signed in skips straight to checkout.
 */
export function planHref(plan: Pick<Plan, "id">, billing: Billing) {
  if (plan.id === "free") return "/signup?plan=free";
  const next = `/dashboard/billing?checkout=${plan.id}-${billing}`;
  return `/signup?plan=${plan.id}&billing=${billing}&next=${encodeURIComponent(next)}`;
}

export const findPlan = (id: string | null) =>
  plans.find((p) => p.id === id) ?? null;
