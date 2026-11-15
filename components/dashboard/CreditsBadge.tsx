"use client";

import Link from "next/link";
import { useDashboard } from "./Store";

/**
 * "7 of 10 free replies left", with a thin meter. Turns gold at zero.
 * Renders nothing until the counter has loaded.
 */
export default function CreditsBadge() {
  const { credits } = useDashboard();
  if (!credits) return null;

  const empty = credits.remaining === 0;
  const share = credits.limit ? credits.remaining / credits.limit : 0;

  return (
    <div
      className={`rounded-2xl border px-4 py-2.5 ${
        empty ? "border-star/30 bg-star/10" : "border-white/10 bg-white/5"
      }`}
    >
      <p
        role="status"
        className={`text-[13px] tabular-nums ${empty ? "text-star" : "text-fog"}`}
      >
        {credits.remaining} of {credits.limit} free replies left
      </p>
      <div
        aria-hidden="true"
        className="mt-2 h-1 w-40 rounded-full bg-white/10"
      >
        <div
          className={`h-1 rounded-full transition-all duration-500 ${empty ? "bg-star" : "bg-ice"}`}
          style={{ width: `${share * 100}%` }}
        />
      </div>
    </div>
  );
}

/** Shown in place of the generate button when no free replies are left. */
export function UpgradeNotice() {
  const { credits } = useDashboard();
  if (!credits || credits.remaining > 0) return null;

  return (
    <div
      role="status"
      className="rise mt-8 flex flex-wrap items-center justify-between gap-4 rounded-card border border-star/30 bg-star/10 p-6 md:p-7"
    >
      <div>
        <h2 className="text-[17px] font-medium text-fog">
          You have used all {credits.limit} free replies
        </h2>
        <p className="mt-1 max-w-[56ch] text-[14px] leading-relaxed text-mist">
          Upgrade to keep generating replies. Your reviews and saved replies
          stay here, and you can still edit and publish them.
        </p>
      </div>
      <Link
        href="/dashboard/billing"
        className="rounded-full bg-fog px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-white"
      >
        Go to Billing
      </Link>
    </div>
  );
}
