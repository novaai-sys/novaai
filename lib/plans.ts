/**
 * NovaAI plans. One place for names, prices, features and where each
 * button goes, used by the landing page section and /pricing.
 */

export type Billing = "monthly" | "annual";

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
 * Lemon Squeezy checkout links, set in .env.local once the products exist.
 * Each variable is read by its full name so Next.js can inline it.
 */
const checkoutUrls: Record<"starter" | "growth", Record<Billing, string | undefined>> = {
  starter: {
    monthly: process.env.NEXT_PUBLIC_LEMONSQUEEZY_STARTER_MONTHLY_URL,
    annual: process.env.NEXT_PUBLIC_LEMONSQUEEZY_STARTER_ANNUAL_URL,
  },
  growth: {
    monthly: process.env.NEXT_PUBLIC_LEMONSQUEEZY_GROWTH_MONTHLY_URL,
    annual: process.env.NEXT_PUBLIC_LEMONSQUEEZY_GROWTH_ANNUAL_URL,
  },
};

/**
 * Where a plan's button goes. Paid plans open the Lemon Squeezy checkout
 * when its link is configured; otherwise, and for the free trial, the
 * button opens sign-up with the chosen plan in the address.
 */
export function planHref(plan: Plan, billing: Billing) {
  if (plan.id !== "free") {
    const url = checkoutUrls[plan.id][billing];
    if (url) return { href: url, external: true };
    return { href: `/signup?plan=${plan.id}&billing=${billing}`, external: false };
  }
  return { href: "/signup?plan=free", external: false };
}

export const findPlan = (id: string | null) =>
  plans.find((p) => p.id === id) ?? null;
