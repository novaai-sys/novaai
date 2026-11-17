"use client";

import Link from "next/link";
import PageShell from "@/components/dashboard/PageShell";
import { isPublished, useDashboard } from "@/components/dashboard/Store";
import { planHref, plans } from "@/lib/plans";
import { formatDay, planNames } from "@/lib/usage";

const SUPPORT = "support@getnovaai.app";

const mailto = (subject: string) =>
  `mailto:${SUPPORT}?subject=${encodeURIComponent(subject)}`;

const link =
  "text-fog underline decoration-white/30 underline-offset-4 hover:decoration-white";

export default function BillingPage() {
  const { reviews, credits } = useDashboard();
  const published = reviews.filter(isPublished).length;

  const plan = credits?.plan ?? "free";
  const onTrial = plan === "free";
  const current = plans.find((p) => p.id === plan)!;
  // Only plans that cost more than the current one: a downgrade is not an upgrade.
  const upgrades = plans.filter(
    (p) => p.id !== "free" && p.price.monthly > current.price.monthly,
  );

  const summary = onTrial
    ? credits?.trialEnded
      ? "Your 7-day free trial has ended. Choose a plan to keep generating replies."
      : "You are on the 7-day free trial. There is nothing to pay and no card on file."
    : `You are on the ${planNames[plan]} plan, with unlimited AI replies.`;

  return (
    <PageShell title="Billing" summary={summary}>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="rounded-card border border-ice/25 bg-panel/70 p-7 md:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[17px] font-medium">{current.name}</h2>
            <span className="rounded-full bg-ice/15 px-3 py-1 text-[13px] text-ice">
              {onTrial ? "No credit card required" : "Unlimited AI replies"}
            </span>
          </div>

          {onTrial ? (
            <>
              <p className="mt-6 flex items-baseline gap-3">
                <span className="text-[clamp(4rem,8vw,6rem)] font-medium leading-none tracking-[-0.05em]">
                  $0
                </span>
                <span className="text-[15px] text-mist">7-day free trial</span>
              </p>
              <p className="mt-6 max-w-[48ch] text-[15px] leading-relaxed text-mist">
                The trial includes up to {credits?.limit ?? 10} AI replies
                {credits?.trialEndsAt
                  ? credits.trialEnded
                    ? ` and ended on ${formatDay(credits.trialEndsAt)}.`
                    : ` and ends on ${formatDay(credits.trialEndsAt)}.`
                  : "."}{" "}
                Starter and Growth include unlimited replies.
              </p>
            </>
          ) : (
            <>
              <p className="mt-6 flex items-baseline gap-3">
                <span className="text-[clamp(4rem,8vw,6rem)] font-medium leading-none tracking-[-0.05em]">
                  ${current.price.monthly}
                </span>
                <span className="text-[15px] text-mist">
                  /month, or ${current.price.annual}/month billed annually
                </span>
              </p>
              <p className="mt-6 max-w-[48ch] text-[15px] leading-relaxed text-mist">
                To change or cancel your plan, email{" "}
                <a href={mailto(`Cancel or change my ${current.name} plan`)} className={link}>
                  {SUPPORT}
                </a>{" "}
                from your account email. Cancellation takes effect at the end
                of the period you have paid for, with no cancellation fee.
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
            {credits && (
              <div className="flex justify-between gap-4 py-3.5">
                <dt className="text-mist">AI replies generated</dt>
                <dd className="tabular-nums">
                  {credits.limit === null
                    ? credits.used
                    : `${credits.used} of ${credits.limit}`}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4 py-3.5">
              <dt className="text-mist">Replies published</dt>
              <dd className="tabular-nums">{published}</dd>
            </div>
          </dl>
        </section>
      </div>

      {upgrades.length > 0 && (
        <section aria-labelledby="upgrade-title" className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="upgrade-title" className="text-[17px] font-medium">
              {onTrial ? "Choose a plan" : "Upgrade"}
            </h2>
            <Link href="/pricing" className={`text-[14px] ${link}`}>
              Compare all plans
            </Link>
          </div>
          <ul className="mt-5 grid gap-6 md:grid-cols-2">
            {upgrades.map((p) => {
              const checkout = planHref(p, "monthly");
              return (
                <li
                  key={p.id}
                  className="flex flex-col rounded-card border border-white/10 bg-panel/70 p-6 md:p-7"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h3 className="text-[17px] font-medium">{p.name}</h3>
                    <p className="text-[15px] text-mist">
                      <span className="text-[22px] font-medium text-fog">
                        ${p.price.monthly}
                      </span>
                      /month, or ${p.price.annual}/month billed annually
                    </p>
                  </div>
                  <p className="mt-2 text-[14px] text-mist">{p.tagline}</p>
                  <div className="mt-6">
                    {checkout.external ? (
                      <a
                        href={checkout.href}
                        className="inline-block rounded-full bg-fog px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-white"
                      >
                        {p.cta}
                      </a>
                    ) : (
                      <>
                        <a
                          href={mailto(`Upgrade to ${p.name}`)}
                          className="inline-block rounded-full bg-fog px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-white"
                        >
                          {p.cta}
                        </a>
                        <p className="mt-3 text-[13px] text-ghost">
                          Opens an email to {SUPPORT}. We switch your plan
                          and send you a payment link.
                        </p>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </PageShell>
  );
}
