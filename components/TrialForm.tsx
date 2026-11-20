"use client";

import { useEffect, useState } from "react";
import Reveal from "./Reveal";
import { TRIAL_DAYS, dispatcherPlans } from "@/lib/dispatcher/plans";

type Status = "idle" | "sending" | "sent" | "error";

const field =
  "mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[15px] text-fog placeholder:text-ghost transition-colors focus:border-ice/50 focus:bg-white/[0.07] focus:outline-none";

/** The free-trial request form at the bottom of the landing page (#trial). */
export default function TrialForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [plan, setPlan] = useState("");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("plan") ?? "";
    if (dispatcherPlans.some((x) => x.id === p)) queueMicrotask(() => setPlan(p));
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch("/api/trial-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, plan }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setError({ text: json.error || "Something went wrong. Try again.", field: json.field });
        return;
      }
      setStatus("sent");
    } catch {
      setStatus("error");
      setError({ text: "Couldn't send. Check your connection and try again." });
    }
  }

  const chosen = dispatcherPlans.find((p) => p.id === plan && p.id !== "trial");

  return (
    <section id="trial" className="relative scroll-mt-16 overflow-hidden px-5 py-28 md:px-8 md:py-40">
      <div
        aria-hidden="true"
        className="orb-rim pointer-events-none absolute left-1/2 top-full h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-30"
      />
      <div className="relative mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
        <Reveal>
          <h2 className="text-[clamp(2.2rem,4.6vw,3.75rem)] font-medium leading-[1.03] tracking-[-0.035em]">
            Try Jessica on your real calls.{" "}
            <span className="text-ghost">Free for {TRIAL_DAYS} days.</span>
          </h2>
          <ol className="mt-8 space-y-4 text-[16px] leading-relaxed text-mist">
            <li className="flex gap-4">
              <span className="text-ice">1</span>
              <span>Send this form. We reply within one business day.</span>
            </li>
            <li className="flex gap-4">
              <span className="text-ice">2</span>
              <span>A 15-minute call about your services, prices, area and hours.</span>
            </li>
            <li className="flex gap-4">
              <span className="text-ice">3</span>
              <span>We give you your NovaAI number. Forward your missed calls and you&apos;re live.</span>
            </li>
          </ol>
          <p className="mt-8 text-[14px] text-mist">
            No credit card. The trial never turns into a paid plan on its own.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          {status === "sent" ? (
            <div className="rounded-card border border-ice/30 bg-panel p-8 md:p-10" role="status">
              <p className="text-[24px] font-medium leading-snug">Got it. Talk soon.</p>
              <p className="mt-3 max-w-[44ch] text-[16px] leading-relaxed text-mist">
                We&apos;ll email you within one business day to set up your
                free trial. Questions in the meantime:{" "}
                <a href="mailto:support@getnovaai.app" className="text-fog underline decoration-white/30 underline-offset-4">
                  support@getnovaai.app
                </a>
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="rounded-card border border-white/10 bg-panel/80 p-6 md:p-8" noValidate>
              {chosen && (
                <p className="mb-5 rounded-2xl bg-ice/10 px-4 py-3 text-[14px] text-ice">
                  You picked {chosen.name}. You start on the free trial either way.
                </p>
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Your name" name="name" autoComplete="name" error={error} />
                <Field label="Company" name="business" autoComplete="organization" error={error} />
                <Field label="Email" name="email" type="email" autoComplete="email" error={error} />
                <Field label="Mobile (for job texts)" name="phone" type="tel" autoComplete="tel" placeholder="(512) 555-0100" error={error} />
                <Field label="City and state" name="location" autoComplete="address-level2" placeholder="Austin, TX" error={error} required={false} />
                <label className="block text-[14px] text-mist">
                  What you do
                  <select name="trade" defaultValue="" className={field}>
                    <option value="" disabled>Choose one</option>
                    <option>HVAC</option>
                    <option>Plumbing</option>
                    <option>HVAC and plumbing</option>
                    <option>Other home service</option>
                  </select>
                </label>
              </div>
              <label className="mt-5 block text-[14px] text-mist">
                Anything we should know? <span className="text-ghost">(optional)</span>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="How many calls a week, what you use for scheduling, when you miss the most calls…"
                  className={`${field} resize-y`}
                />
              </label>
              {/* Honeypot: hidden from people, filled by bots. */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

              {error && !error.field && (
                <p className="mt-5 text-[14px] text-[#ffb4a8]" role="alert">{error.text}</p>
              )}

              <button
                type="submit"
                disabled={status === "sending"}
                className="mt-7 w-full rounded-full bg-fog px-6 py-3.5 text-[15px] font-medium text-ink transition-colors hover:bg-white disabled:opacity-60"
              >
                {status === "sending" ? "Sending…" : "Start my free trial"}
              </button>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  placeholder,
  error,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  error: { text: string; field?: string } | null;
  required?: boolean;
}) {
  const bad = error?.field === name;
  return (
    <label className="block text-[14px] text-mist">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={bad || undefined}
        aria-describedby={bad ? `${name}-error` : undefined}
        className={`${field} ${bad ? "border-[#ffb4a8]/60" : ""}`}
      />
      {bad && (
        <span id={`${name}-error`} className="mt-1.5 block text-[13px] text-[#ffb4a8]">
          {error!.text}
        </span>
      )}
    </label>
  );
}
