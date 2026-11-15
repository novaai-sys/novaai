"use client";

import { useState } from "react";
import PageShell from "@/components/dashboard/PageShell";
import Switch from "@/components/dashboard/Switch";
import { ruleRows } from "@/components/dashboard/rules";
import { useDashboard } from "@/components/dashboard/Store";

export default function AutopilotPage() {
  const { settings, updateSettings } = useDashboard();
  const [email, setEmail] = useState(settings.alert_email ?? "");
  const [saved, setSaved] = useState(false);

  const on = settings.autopilot_enabled;

  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await updateSettings({ alert_email: email.trim() || null });
    setSaved(ok);
  };

  return (
    <PageShell
      title="Autopilot"
      summary="Choose whether Nova publishes replies to good reviews without asking. Lower ratings are always drafted and sent to you."
    >
      <ul className="divide-y divide-white/10 border-y border-white/10">
        {ruleRows.map((row) => {
          const auto = row.switchable && on;
          return (
            <li key={row.id} className="flex items-center gap-5 py-7">
              <p className="flex w-28 items-baseline gap-2 text-[clamp(2.25rem,4vw,3.25rem)] font-medium leading-none tracking-[-0.04em] md:w-40">
                {row.stars}
                <svg viewBox="0 0 20 20" aria-hidden="true" className="h-[0.42em] w-[0.42em] text-star">
                  <path fill="currentColor" d="m10 1.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8L10 1.5Z" />
                </svg>
              </p>
              <div className="min-w-0 flex-1">
                <p className="text-[17px] font-medium">{row.who}</p>
                <p className="mt-1 text-[15px] text-mist" aria-live="polite">
                  {auto
                    ? "Nova publishes the reply right away."
                    : "Nova drafts the reply and sends it to you for approval."}
                </p>
              </div>
              {row.switchable ? (
                <Switch
                  checked={on}
                  onChange={() => void updateSettings({ autopilot_enabled: !on })}
                  label="Publish replies to 4 and 5 star reviews without asking"
                />
              ) : (
                <span className="text-[13px] text-ghost">Always asks you</span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <form
          onSubmit={saveEmail}
          className="rounded-card border border-white/10 bg-panel/70 p-6 md:p-7"
        >
          <label htmlFor="alert-email" className="text-[17px] font-medium">
            Alert email
          </label>
          <p className="mt-1 text-[14px] text-mist">
            Where Nova should write when a reply is waiting for you. Leave it
            empty for no alerts.
          </p>
          <input
            id="alert-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSaved(false);
            }}
            placeholder="you@yourshop.com"
            className="mt-4 w-full rounded-xl border border-white/15 bg-ink/60 px-4 py-3 text-[15px] text-fog outline-none placeholder:text-ghost focus:border-ice/60"
          />
          <div className="mt-4 flex items-center gap-4">
            <button
              type="submit"
              className="rounded-full bg-fog px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-white"
            >
              Save email
            </button>
            <p role="status" className="text-[14px] text-mist">
              {saved ? "Saved." : ""}
            </p>
          </div>
          <p className="mt-4 text-[13px] text-ghost">
            The address is saved, but NovaAI does not send emails yet.
          </p>
        </form>

        <section className="rounded-card border border-white/10 bg-panel/70 p-6 md:p-7">
          <h2 className="text-[17px] font-medium">
            Autopilot is {on ? "on" : "off"}
          </h2>
          <p className="mt-1 text-[14px] leading-relaxed text-mist" aria-live="polite">
            {on
              ? "New 4 and 5 star reviews are saved as published. Reviews with 1 to 3 stars wait on the Reviews page until you approve them."
              : "Every new reply waits on the Reviews page until you approve it."}
          </p>
        </section>
      </div>
    </PageShell>
  );
}
