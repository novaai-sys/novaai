/**
 * NovaAI plans: the single source for prices, call limits and plan copy.
 * Used by the landing page, /pricing, Terms, and (through lib/plans.ts) the
 * billing dashboard and Paddle checkout.
 *
 * Paddle prices (2026-11), set in the NEXT_PUBLIC_PADDLE_PRICE_* variables:
 *   Starter  $249/month, or $2,388/year ($199/mo)  up to 150 calls a month
 *   Growth   $449/month, or $4,308/year ($359/mo)  up to 300 calls a month
 *
 * Cost per answered call is roughly $0.50 (about 3 minutes of Retell voice,
 * Telnyx telephony and the job text), so a fully used plan keeps about 65%
 * (Starter) and 61% (Growth) after Paddle's fee.
 *
 * Paid plans start with the free trial: setup is done for each shop, so
 * every button on the public pages leads to the trial request form.
 */

export type DispatcherBilling = "monthly" | "annual";

export type DispatcherPlan = {
  id: "trial" | "starter" | "growth";
  name: string;
  tagline: string;
  /** Price per month in US dollars. */
  price: { monthly: number; annual: number };
  /** Answered calls included per month (for the trial: in total). */
  calls: number;
  features: string[];
  cta: string;
  popular?: boolean;
};

export const TRIAL_DAYS = 14;
export const TRIAL_CALLS = 50;
/** Calls shorter than this don't count towards a plan (hang-ups, wrong numbers, spam). */
export const MIN_BILLABLE_CALL_SECONDS = 20;

export const dispatcherPlans: DispatcherPlan[] = [
  {
    id: "trial",
    name: "Free trial",
    tagline: "Jessica on your real calls for two weeks",
    price: { monthly: 0, annual: 0 },
    calls: TRIAL_CALLS,
    features: [
      `${TRIAL_DAYS} days or ${TRIAL_CALLS} calls, no credit card`,
      "We set Jessica up with your services, area and hours",
      "Answers the calls you miss and after-hours calls",
      "Job details texted to you after every call",
    ],
    cta: "Start free trial",
  },
  {
    id: "starter",
    name: "Starter",
    tagline: "For owner-operators and small crews",
    price: { monthly: 249, annual: 199 },
    calls: 150,
    features: [
      "Up to 150 answered calls a month",
      "24/7 answering, nights and weekends included",
      "Books jobs, urgent visits and free estimates",
      "Safety steps for gas, CO and flooding calls",
      "Job details texted to you after every call",
      "Call recordings and transcripts",
      "1 business line",
    ],
    cta: "Start with Starter",
    popular: true,
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "For busy shops with an on-call tech",
    price: { monthly: 449, annual: 359 },
    calls: 300,
    features: [
      "Up to 300 answered calls a month",
      "Everything in Starter",
      "Transfers emergencies to your on-call phone",
      "Separate scripts for each service you offer",
      "2 business lines",
      "Priority support",
    ],
    cta: "Start with Growth",
  },
];

export const dispatcherPlan = (id: DispatcherPlan["id"]) =>
  dispatcherPlans.find((p) => p.id === id)!;

/** Every plan button opens the trial form, remembering the plan chosen. */
export const trialHref = (id: DispatcherPlan["id"]) =>
  id === "trial" ? "/#trial" : `/?plan=${id}#trial`;
