"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/dashboard/PageShell";
import { useDashboard } from "@/components/dashboard/Store";
import { plans } from "@/lib/plans";
import {
  parseCheckoutParam,
  priceIdFor,
  type Billing,
  type PaidPlan,
} from "@/lib/billing";
import { openCheckout, paddleConfigured } from "@/lib/paddle";
import { formatDay, planNames } from "@/lib/usage";
import { createClient } from "@/lib/supabase/client";
import { MIN_BILLABLE_CALL_SECONDS, TRIAL_DAYS, dispatcherPlan } from "@/lib/dispatcher/plans";

const SUPPORT = "support@getnovaai.app";
const link =
  "text-fog underline decoration-white/30 underline-offset-4 hover:decoration-white";
const primary =
  "inline-block rounded-full bg-fog px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40";
const secondary =
  "inline-block rounded-full border border-white/15 px-5 py-2.5 text-[14px] text-fog transition-colors hover:bg-white/5 disabled:opacity-40";

const statusText: Record<string, string> = {
  active: "Active",
  trialing: "Trialing",
  past_due: "Payment failed, retrying",
  paused: "Paused",
  canceled: "Canceled",
};

export default function BillingPage() {
  const { user, credits, refresh } = useDashboard();
  const router = useRouter();
  const [billing, setBilling] = useState<Billing>(credits?.billingCycle ?? "monthly");
  const [confirming, setConfirming] = useState<PaidPlan | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const autoOpened = useRef(false);
  // The account's first phone line (business) and its calls this month.
  const [line, setLine] = useState<{ businessId: string | null; calls: number | null }>({
    businessId: null,
    calls: null,
  });

  useEffect(() => {
    let live = true;
    const db = createClient();
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    Promise.all([
      db.from("businesses").select("id").order("created_at").limit(1),
      db
        .from("calls")
        .select("call_id", { count: "exact", head: true })
        .gte("created_at", monthStart.toISOString())
        .gt("duration_ms", MIN_BILLABLE_CALL_SECONDS * 1000),
    ]).then(([biz, calls]) => {
      if (!live) return;
      setLine({ businessId: biz.data?.[0]?.id ?? null, calls: calls.error ? null : calls.count ?? 0 });
    });
    return () => {
      live = false;
    };
  }, []);

  const paid = credits?.paidAccess ?? false;
  const subscribed = credits?.hasSubscription ?? false;
  const shownPlan = paid ? credits!.plan : "free";
  const current = plans.find((p) => p.id === shownPlan)!;
  const lapsed = credits && credits.plan !== "free" && !paid;
  // A Paddle subscription still in its trial: pay now by ending the trial,
  // not by opening a second checkout.
  const paddleTrial = subscribed && credits?.subscriptionStatus === "trialing";
  const included = paid && credits!.plan !== "free" ? dispatcherPlan(credits!.plan).calls : null;

  const startCheckout = async (plan: PaidPlan, cycle: Billing) => {
    const priceId = priceIdFor(plan, cycle);
    if (!priceId || !paddleConfigured()) {
      setMessage({ tone: "error", text: `Payments are not set up yet. Email ${SUPPORT} to upgrade.` });
      return;
    }
    setBusy(`${plan}-${cycle}`);
    setMessage(null);
    try {
      await openCheckout({
        priceId,
        userId: user.id,
        email: user.email,
        businessId: line.businessId,
        onComplete: () => {
          // Let Paddle show its confirmation for a moment, then go to the dashboard.
          setTimeout(() => router.push("/dashboard?upgraded=true"), 1500);
        },
      });
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof Error ? e.message : "Checkout could not open." });
    } finally {
      setBusy(null);
    }
  };

  // Arriving from the pricing page: /dashboard/billing?checkout=starter-annual
  useEffect(() => {
    if (autoOpened.current || !credits) return;
    const params = new URLSearchParams(window.location.search);
    const wanted = parseCheckoutParam(params.get("checkout"));
    if (!wanted) return;
    autoOpened.current = true;
    window.history.replaceState(null, "", window.location.pathname);
    // One-time handoff from the pricing page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBilling(wanted.billing);
    if (credits.hasSubscription) {
      setConfirming(wanted.plan);
      return;
    }
    void startCheckout(wanted.plan, wanted.billing);
    // startCheckout only reads stable values from the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credits]);

  const changePlan = async (plan: PaidPlan) => {
    setBusy(`${plan}-${billing}`);
    setMessage(null);
    const res = await fetch("/api/billing/change-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, billing }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    setConfirming(null);
    if (!res.ok) {
      setMessage({ tone: "error", text: json.error ?? "The change did not go through." });
      return;
    }
    setMessage({
      tone: "ok",
      text: `Done. Paddle is switching you to ${planNames[plan]}; this page updates within a minute.`,
    });
    setTimeout(() => void refresh(), 4000);
  };

  const openPortal = async () => {
    setBusy("portal");
    setMessage(null);
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (res.ok && json.url) window.location.assign(json.url);
    else setMessage({ tone: "error", text: json.error ?? "The billing portal could not open." });
  };

  const activateNow = async () => {
    setBusy("activate");
    setMessage(null);
    const res = await fetch("/api/billing/activate", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setMessage({ tone: "error", text: json.error ?? "The subscription could not start." });
      return;
    }
    setMessage({ tone: "ok", text: "Done. Paddle is starting your paid plan; this page updates within a minute." });
    setTimeout(() => void refresh(), 4000);
  };

  const summary = paddleTrial
    ? `You are trying the ${planNames[credits!.plan]} plan. Start paying now or let the trial run.`
    : paid
      ? `You are on the ${planNames[credits!.plan]} plan.`
      : "You don't have a paid plan yet. Subscribe now to keep Jessica answering your calls, even during your free trial.";

  const options = plans.filter(
    (p): p is (typeof plans)[number] & { id: PaidPlan } =>
      p.id !== "free" && !(paid && p.id === credits!.plan && credits!.billingCycle === billing),
  );

  return (
    <PageShell title="Billing" summary={summary}>
      {message && (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`mb-6 rounded-2xl border px-5 py-4 text-[15px] ${
            message.tone === "error"
              ? "border-star/30 bg-star/10 text-star"
              : "border-ice/30 bg-ice/10 text-ice"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="rounded-card border border-ice/25 bg-panel/70 p-7 md:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[17px] font-medium">{current.name}</h2>
            <span
              className={`rounded-full px-3 py-1 text-[13px] ${
                credits?.subscriptionStatus === "past_due"
                  ? "bg-star/15 text-star"
                  : "bg-ice/15 text-ice"
              }`}
            >
              {paid
                ? statusText[credits!.subscriptionStatus ?? ""] ?? "Active"
                : "No credit card required"}
            </span>
          </div>

          {paid ? (
            <>
              <p className="mt-6 flex items-baseline gap-3">
                <span className="text-[clamp(4rem,8vw,6rem)] font-medium leading-none tracking-[-0.05em]">
                  ${credits!.billingCycle === "annual" ? current.price.annual : current.price.monthly}
                </span>
                <span className="text-[15px] text-mist">
                  /month{credits!.billingCycle === "annual" ? ", billed annually" : ", billed monthly"}
                </span>
              </p>
              <p className="mt-6 max-w-[48ch] text-[15px] leading-relaxed text-mist">
                {credits!.subscriptionStatus === "past_due"
                  ? "Your last payment failed. Paddle will retry it; update your card in the billing portal to keep your plan."
                  : credits!.currentPeriodEnd
                    ? `Renews on ${formatDay(credits!.currentPeriodEnd)}.`
                    : null}{" "}
                Update your card, download invoices or cancel in the billing
                portal. Cancelling keeps your plan until the end of the paid
                period.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {paddleTrial && (
                  <button type="button" onClick={activateNow} disabled={busy !== null} className={primary}>
                    {busy === "activate" ? "Starting…" : "Pay now and end the trial"}
                  </button>
                )}
                {subscribed ? (
                  <button type="button" onClick={openPortal} disabled={busy !== null} className={paddleTrial ? secondary : primary}>
                    {busy === "portal" ? "Opening…" : "Manage subscription"}
                  </button>
                ) : (
                  <p className="text-[14px] text-mist">
                    To change or cancel, email{" "}
                    <a href={`mailto:${SUPPORT}`} className={link}>{SUPPORT}</a>.
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="mt-6 flex items-baseline gap-3">
                <span className="text-[clamp(4rem,8vw,6rem)] font-medium leading-none tracking-[-0.05em]">
                  $0
                </span>
                <span className="text-[15px] text-mist">no paid plan yet</span>
              </p>
              <p className="mt-6 max-w-[48ch] text-[15px] leading-relaxed text-mist">
                {lapsed
                  ? `Your ${planNames[credits!.plan]} subscription is ${credits!.subscriptionStatus ?? "inactive"}. Choose a plan below to start again. `
                  : null}
                You can subscribe at any time, including during your{" "}
                {TRIAL_DAYS}-day free trial: payment starts your plan right away.
                Starter includes {dispatcherPlan("starter").calls} calls a month,
                Growth {dispatcherPlan("growth").calls}.
              </p>
            </>
          )}
        </section>

        <section className="rounded-card border border-white/10 bg-panel/70 p-7 md:p-9">
          <h2 className="text-[17px] font-medium">Your usage</h2>
          <dl className="mt-5 divide-y divide-white/10 text-[15px]">
            <div className="flex justify-between gap-4 py-3.5">
              <dt className="text-mist">Plan</dt>
              <dd>{current.name}</dd>
            </div>
            <div className="flex justify-between gap-4 py-3.5">
              <dt className="text-mist">Calls answered this month</dt>
              <dd className="tabular-nums">
                {line.calls === null ? "–" : included ? `${line.calls} of ${included}` : line.calls}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-3.5">
              <dt className="text-mist">Calls included each month</dt>
              <dd className="tabular-nums">{included ?? "Choose a plan"}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section aria-labelledby="plans-title" className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="plans-title" className="text-[17px] font-medium">
            {paid ? "Change plan" : "Choose a plan"}
          </h2>
          <div className="flex items-center gap-4">
            <div
              role="radiogroup"
              aria-label="Billing period"
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1"
            >
              {(["monthly", "annual"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  role="radio"
                  aria-checked={billing === b}
                  onClick={() => {
                    setBilling(b);
                    setConfirming(null);
                  }}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] transition-colors ${
                    billing === b ? "bg-fog text-ink" : "text-mist hover:bg-white/10 hover:text-fog"
                  }`}
                >
                  {b === "monthly" ? "Monthly" : "Annual"}
                  {b === "annual" && (
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${billing === b ? "bg-ice/25" : "bg-ice/15 text-ice"}`}>
                      Save 20%
                    </span>
                  )}
                </button>
              ))}
            </div>
            <Link href="/pricing" className={`text-[14px] ${link}`}>
              Compare plans
            </Link>
          </div>
        </div>

        <ul className="mt-5 grid gap-6 md:grid-cols-2">
          {options.map((p) => {
            const price = p.price[billing];
            const key = `${p.id}-${billing}`;
            return (
              <li key={p.id} className="flex flex-col rounded-card border border-white/10 bg-panel/70 p-6 md:p-7">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="text-[17px] font-medium">{p.name}</h3>
                  <p className="text-[15px] text-mist">
                    <span className="text-[22px] font-medium text-fog">${price}</span>
                    /month{billing === "annual" ? `, billed $${price * 12} yearly` : ""}
                  </p>
                </div>
                <p className="mt-2 text-[14px] text-mist">{p.tagline}</p>

                <div className="mt-6">
                  {subscribed && confirming === p.id ? (
                    <div className="rise space-y-3">
                      <p className="text-[14px] leading-relaxed text-fog">
                        Switch to {p.name}, billed {billing}? Paddle charges or
                        credits the difference for the rest of this period right away.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => changePlan(p.id)} disabled={busy !== null} className={primary}>
                          {busy === key ? "Switching…" : `Switch to ${p.name}`}
                        </button>
                        <button type="button" onClick={() => setConfirming(null)} className={secondary}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => (subscribed ? setConfirming(p.id) : startCheckout(p.id, billing))}
                      disabled={busy !== null}
                      className={primary}
                    >
                      {busy === key
                        ? "Opening checkout…"
                        : subscribed
                          ? `Switch to ${p.name}`
                          : `Subscribe to ${p.name} now`}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-[13px] text-ghost">
          Payments are processed by Paddle, our merchant of record. Prices are in
          US dollars; tax may be added at checkout.
        </p>
      </section>
    </PageShell>
  );
}
