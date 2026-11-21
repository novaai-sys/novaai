/**
 * Plans for the NovaAI dispatcher (AI phone answering for HVAC and plumbing),
 * shown on the landing page and /pricing.
 *
 * Paid plans start with the free trial: setup is done for each shop, so
 * every button leads to the trial request form. Billing for these plans is
 * connected once their Paddle prices exist (see README). The dashboard's
 * older review-reply plans live in lib/plans.ts and are not changed here.
 */

export type DispatcherBilling = "monthly" | "annual";

export type DispatcherPlan = {
  id: "trial" | "starter" | "pro";
  name: string;
  tagline: string;
  /** Price per month in US dollars. */
  price: { monthly: number; annual: number };
  features: string[];
  cta: string;
  popular?: boolean;
};

export const TRIAL_DAYS = 14;

export const dispatcherPlans: DispatcherPlan[] = [
  {
    id: "trial",
    name: "Free trial",
    tagline: "Jessica on your real calls for two weeks",
    price: { monthly: 0, annual: 0 },
    features: [
      `${TRIAL_DAYS} days, no credit card`,
      "We set Jessica up with your services, area and hours",
      "Answers the calls you miss and after-hours calls",
      "Job details after every call",
    ],
    cta: "Start free trial",
  },
  {
    id: "starter",
    name: "Starter",
    tagline: "For owner-operators and small crews",
    price: { monthly: 199, annual: 159 },
    features: [
      "Up to 150 answered calls a month",
      "24/7 answering, nights and weekends included",
      "Books jobs and urgent visits",
      "Safety steps for gas, CO and flooding calls",
      "Job details texted to you after every call",
      "Call recordings and transcripts",
    ],
    cta: "Start with Starter",
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For busy shops with a dispatcher or on-call tech",
    price: { monthly: 299, annual: 239 },
    features: [
      "Up to 400 answered calls a month",
      "Everything in Starter",
      "Transfers emergencies to your on-call phone",
      "Separate scripts for each service you offer",
      "Priority support",
    ],
    cta: "Start with Pro",
  },
];

/** Every plan button opens the trial form, remembering the plan chosen. */
export const trialHref = (id: DispatcherPlan["id"]) =>
  id === "trial" ? "/#trial" : `/?plan=${id}#trial`;
