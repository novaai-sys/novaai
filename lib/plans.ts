/**
 * NovaAI plans. One place for names, prices, features and where each
 * button goes, used by the landing page section and /pricing.
 */

import type { Billing } from "./billing";
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

export const plans: Plan[] = [
  {
    id: "free",
    name: "Free Trial",
    tagline: "Test Nova AI on your business profile",
    price: { monthly: 0, annual: 0 },
    features: [
      "7-day free trial (up to 10 AI-generated review replies)",
      "Connect 1 Google Business Profile location",
      "Basic brand voice customization",
      "Standard email support",
    ],
    cta: "Start Free Trial",
  },
  {
    id: "starter",
    name: "Starter",
    tagline: "Everything a local business needs to grow its reputation",
    price: { monthly: 19, annual: 15 },
    features: [
      "1 Google Business Profile location",
      "Unlimited AI-powered review responses",
      "Custom brand tone & language matching",
      "Real-time new review email alerts",
      "Priority support (support@getnovaai.app)",
    ],
    cta: "Get Started",
    popular: true,
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "Built for multi-location businesses & agencies",
    price: { monthly: 49, annual: 39 },
    features: [
      "Up to 5 Google Business Profile locations",
      "Unlimited AI review responses",
      "Smart Auto-Reply rules for 4 & 5-star reviews",
      "Sentiment & customer feedback insights",
      "Dedicated priority support",
    ],
    cta: "Upgrade to Growth",
  },
];

/**
 * Where a plan's button goes. The free trial opens sign-up. Paid plans open
 * sign-up too, then continue to the Paddle checkout on the Billing page; a
 * visitor who is already signed in skips straight to checkout.
 */
export function planHref(plan: Plan, billing: Billing) {
  if (plan.id === "free") return "/signup?plan=free";
  const next = `/dashboard/billing?checkout=${plan.id}-${billing}`;
  return `/signup?plan=${plan.id}&billing=${billing}&next=${encodeURIComponent(next)}`;
}

export const findPlan = (id: string | null) =>
  plans.find((p) => p.id === id) ?? null;
