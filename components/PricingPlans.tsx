"use client";

import { useState } from "react";
import {
  dispatcherPlans,
  trialHref,
  type DispatcherBilling,
  type DispatcherPlan,
} from "@/lib/dispatcher/plans";

const d = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

/**
 * Monthly / annual switch and the three plan cards. Used on the landing
 * page and on /pricing.
 */
export default function PricingPlans() {
  const [billing, setBilling] = useState<DispatcherBilling>("monthly");

  return (
    <div>
      <div className="flex justify-center">
        <div
          role="radiogroup"
          aria-label="Billing period"
          className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1"
        >
          <PeriodButton active={billing === "monthly"} onClick={() => setBilling("monthly")}>
            Monthly
          </PeriodButton>
          <PeriodButton active={billing === "annual"} onClick={() => setBilling("annual")}>
            Annual
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                billing === "annual" ? "bg-ice/25 text-ink" : "bg-ice/15 text-ice"
              }`}
            >
              Save 20%
            </span>
          </PeriodButton>
        </div>
      </div>

      <ul className="mt-12 grid gap-5 lg:grid-cols-3 lg:items-stretch lg:gap-6">
        {dispatcherPlans.map((plan, i) => (
          <PlanCard key={plan.id} plan={plan} billing={billing} delay={i * 0.1} />
        ))}
      </ul>
    </div>
  );
}

function PeriodButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-[14px] transition-colors ${
        active ? "bg-fog text-ink" : "text-mist hover:bg-white/10 hover:text-fog"
      }`}
    >
      {children}
    </button>
  );
}

function PlanCard({
  plan,
  billing,
  delay,
}: {
  plan: DispatcherPlan;
  billing: DispatcherBilling;
  delay: number;
}) {
  const price = plan.price[billing];
  const paid = plan.price.monthly > 0;

  const note = !paid
    ? "Then choose a plan, or walk away"
    : billing === "annual"
      ? `Billed $${(price * 12).toLocaleString("en-US")} yearly, after your free trial`
      : "Billed monthly, after your free trial";

  const button = `mt-auto block rounded-full px-6 py-3 text-center text-[15px] font-medium transition-colors ${
    plan.popular
      ? "bg-fog text-ink hover:bg-white"
      : "border border-white/15 text-fog hover:bg-white/5"
  }`;

  return (
    <li
      style={d(delay)}
      className={`rise relative flex flex-col overflow-hidden rounded-card border p-7 md:p-8 ${
        plan.popular ? "border-ice/40 bg-panel lg:-my-3 lg:py-11" : "border-white/10 bg-panel/70"
      }`}
    >
      {plan.popular && (
        <div
          aria-hidden="true"
          className="orb-rim pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-30"
        />
      )}

      <div className="relative flex flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[19px] font-medium">{plan.name}</h3>
          {plan.popular && (
            <span className="rounded-full bg-ice/15 px-3 py-1 text-[13px] text-ice">
              Most shops pick this
            </span>
          )}
        </div>
        <p className="mt-2 min-h-[3em] text-[15px] leading-relaxed text-mist">{plan.tagline}</p>

        <p className="mt-6 flex items-baseline gap-2">
          <span
            key={`${plan.id}-${billing}`}
            className="rise text-[clamp(3.25rem,5vw,4.25rem)] font-medium leading-none tracking-[-0.05em] tabular-nums"
          >
            ${price}
          </span>
          <span className="text-[15px] text-mist">{paid ? "/month" : ""}</span>
        </p>
        <p className="mt-2 text-[13px] text-ghost" aria-live="polite">
          {note}
        </p>

        <ul className="mb-9 mt-7 space-y-3 border-t border-white/10 pt-6 text-[15px]">
          {plan.features.map((f) => (
            <li key={f} className="flex gap-3">
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="mt-0.5 shrink-0 text-ice">
                <path d="m4 9.5 3.2 3.2L14 5.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <a href={trialHref(plan.id)} className={button}>
          {plan.cta}
        </a>
      </div>
    </li>
  );
}
