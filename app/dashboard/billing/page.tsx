"use client";

import PageShell from "@/components/dashboard/PageShell";
import { isPublished, useDashboard } from "@/components/dashboard/Store";

export default function BillingPage() {
  const { reviews, credits } = useDashboard();
  const published = reviews.filter(isPublished).length;

  return (
    <PageShell
      title="Billing"
      summary="You are on the Free plan, which includes 10 AI replies. There is nothing to pay and no card on file."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="rounded-card border border-ice/25 bg-panel/70 p-7 md:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[17px] font-medium">Free plan</h2>
            <span className="rounded-full bg-ice/15 px-3 py-1 text-[13px] text-ice">
              No credit card required
            </span>
          </div>
          <p className="mt-6 flex items-baseline gap-3">
            <span className="text-[clamp(4rem,8vw,6rem)] font-medium leading-none tracking-[-0.05em]">
              $0
            </span>
            <span className="text-[15px] text-mist">per month</span>
          </p>
          <p className="mt-6 max-w-[48ch] text-[15px] leading-relaxed text-mist">
            Paid plans with more AI replies are not available yet. When they
            launch, you will be able to upgrade on this page.
          </p>
        </section>

        <section className="rounded-card border border-white/10 bg-panel/70 p-7 md:p-9">
          <h2 className="text-[17px] font-medium">Your usage</h2>
          <dl className="mt-5 divide-y divide-white/10 text-[15px]">
            <div className="flex justify-between py-3.5">
              <dt className="text-mist">Locations</dt>
              <dd className="tabular-nums">1 of 1</dd>
            </div>
            <div className="flex justify-between py-3.5">
              <dt className="text-mist">Replies published</dt>
              <dd className="tabular-nums">{published}</dd>
            </div>
            {credits && (
              <div className="flex justify-between py-3.5">
                <dt className="text-mist">Free AI replies used</dt>
                <dd className="tabular-nums">
                  {credits.used} of {credits.limit}
                </dd>
              </div>
            )}
            <div className="flex justify-between py-3.5">
              <dt className="text-mist">Card on file</dt>
              <dd>None</dd>
            </div>
          </dl>
        </section>
      </div>
    </PageShell>
  );
}
