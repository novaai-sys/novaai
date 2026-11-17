"use client";

import Link from "next/link";
import { useDashboard } from "./Store";
import { formatDay, planNames } from "@/lib/usage";

/**
 * Plan and usage beside the "Add test review" button.
 * Free trial: "7 of 10 trial replies left" with a meter and the end date.
 * Paid plans: "Unlimited replies on Starter".
 * Renders nothing until the plan has loaded.
 */
export default function CreditsBadge() {
  const { credits } = useDashboard();
  if (!credits) return null;

  if (credits.plan !== "free") {
    return (
      <div className="rounded-2xl border border-ice/25 bg-ice/10 px-4 py-2.5">
        <p role="status" className="text-[13px] text-ice">
          Unlimited replies on {planNames[credits.plan]}
        </p>
      </div>
    );
  }

  const blocked = !credits.canGenerate;
  const limit = credits.limit ?? 0;
  const remaining = credits.remaining ?? 0;
  const share = limit ? remaining / limit : 0;

  return (
    <div
      className={`rounded-2xl border px-4 py-2.5 ${
        blocked ? "border-star/30 bg-star/10" : "border-white/10 bg-white/5"
      }`}
    >
      <p
        role="status"
        className={`text-[13px] tabular-nums ${blocked ? "text-star" : "text-fog"}`}
      >
        {credits.trialEnded
          ? "Free trial ended"
          : `${remaining} of ${limit} trial replies left`}
      </p>
      <div aria-hidden="true" className="mt-2 h-1 w-44 rounded-full bg-white/10">
        <div
          className={`h-1 rounded-full transition-all duration-500 ${blocked ? "bg-star" : "bg-ice"}`}
          style={{ width: `${credits.trialEnded ? 0 : share * 100}%` }}
        />
      </div>
      {credits.trialEndsAt && !credits.trialEnded && (
        <p className="mt-1.5 text-[12px] text-mist">
          Trial ends {formatDay(credits.trialEndsAt)}
        </p>
      )}
    </div>
  );
}

/** Shown in place of the generate button when the free trial is used up. */
export function UpgradeNotice() {
  const { credits } = useDashboard();
  if (!credits || credits.canGenerate) return null;

  return (
    <div
      role="status"
      className="rise mt-8 flex flex-wrap items-center justify-between gap-4 rounded-card border border-star/30 bg-star/10 p-6 md:p-7"
    >
      <div>
        <h2 className="text-[17px] font-medium text-fog">
          {credits.trialEnded
            ? "Your 7-day free trial has ended"
            : `You have used all ${credits.limit} trial replies`}
        </h2>
        <p className="mt-1 max-w-[56ch] text-[14px] leading-relaxed text-mist">
          Choose Starter or Growth for unlimited replies. Your reviews and
          saved replies stay here, and you can still edit and publish them.
        </p>
      </div>
      <Link
        href="/dashboard/billing"
        className="rounded-full bg-fog px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-white"
      >
        Choose a plan
      </Link>
    </div>
  );
}
