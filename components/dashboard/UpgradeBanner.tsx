"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "./Store";
import { planNames } from "@/lib/usage";

const POLL_MS = 2500;
const GIVE_UP_MS = 45_000;

/**
 * After Paddle checkout the browser lands on /dashboard?upgraded=true. The
 * plan changes only when Paddle's webhook arrives, usually within seconds,
 * so this waits for it and says what is happening meanwhile.
 */
export default function UpgradeBanner() {
  const { refresh } = useDashboard();
  const [state, setState] = useState<"hidden" | "waiting" | "done" | "slow">("hidden");
  const [planName, setPlanName] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") !== "true") return;

    // Remove the flag so a reload doesn't show the banner again.
    params.delete("upgraded");
    const rest = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${rest ? `?${rest}` : ""}`);

    let stopped = false;
    const started = Date.now();
    // Shown once, after the redirect back from checkout.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState("waiting");

    const tick = async () => {
      if (stopped) return;
      const usage = await refresh().catch(() => null);
      if (stopped) return;
      if (usage?.paidAccess) {
        setPlanName(planNames[usage.plan]);
        setState("done");
        return;
      }
      if (Date.now() - started > GIVE_UP_MS) {
        setState("slow");
        return;
      }
      setTimeout(tick, POLL_MS);
    };
    tick();
    return () => {
      stopped = true;
    };
  }, [refresh]);

  if (state === "hidden") return null;

  const text = {
    waiting: "Payment received. Activating your plan…",
    done: `You're on ${planName}. Replies are now unlimited.`,
    slow: "Payment received, but your plan hasn't updated yet. Refresh in a minute. If it still shows the trial, email support@getnovaai.app.",
  }[state];

  return (
    <p
      role="status"
      className={`rise mt-8 rounded-2xl border px-5 py-4 text-[15px] ${
        state === "slow"
          ? "border-star/30 bg-star/10 text-star"
          : "border-ice/30 bg-ice/10 text-ice"
      }`}
    >
      {text}
    </p>
  );
}
