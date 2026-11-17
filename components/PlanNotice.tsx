"use client";

import { useSearchParams } from "next/navigation";
import { findPlan } from "@/lib/plans";

/**
 * On /signup, names the paid plan picked on the pricing page. Every account
 * starts on the free trial and upgrades from Billing.
 */
export default function PlanNotice() {
  const params = useSearchParams();
  const plan = findPlan(params.get("plan"));
  if (!plan || plan.id === "free") return null;

  const billing = params.get("billing") === "annual" ? "annual" : "monthly";
  const price = plan.price[billing];

  return (
    <p
      role="status"
      className="mt-5 rounded-2xl border border-ice/25 bg-ice/10 px-4 py-3 text-[14px] leading-relaxed text-fog"
    >
      You chose {plan.name}, ${price}/month billed {billing}. Create your
      account to start with the 7-day free trial, then upgrade to{" "}
      {plan.name} from the Billing page in your dashboard.
    </p>
  );
}
