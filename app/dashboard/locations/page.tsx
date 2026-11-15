"use client";

import { useState } from "react";
import PageShell from "@/components/dashboard/PageShell";
import { useDashboard } from "@/components/dashboard/Store";

export default function LocationsPage() {
  const { settings, updateSettings } = useDashboard();
  const [name, setName] = useState(settings.business_name);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setProblem("Enter the name of your business.");
      return;
    }
    setSaved(await updateSettings({ business_name: name.trim() }));
  };

  return (
    <PageShell
      title="Locations"
      summary="The business Nova writes replies for."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <form
          onSubmit={save}
          className="rounded-card border border-white/10 bg-panel/70 p-6 md:p-7"
        >
          <label htmlFor="business-name" className="text-[17px] font-medium">
            Business name
          </label>
          <p className="mt-1 text-[14px] text-mist">
            Nova uses this name when it writes on your behalf.
          </p>
          <input
            id="business-name"
            type="text"
            value={name}
            maxLength={120}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
              setProblem(null);
            }}
            className="mt-4 w-full rounded-xl border border-white/15 bg-ink/60 px-4 py-3 text-[15px] text-fog outline-none placeholder:text-ghost focus:border-ice/60"
          />
          {problem && (
            <p role="alert" className="mt-3 text-[14px] text-star">
              {problem}
            </p>
          )}
          <div className="mt-4 flex items-center gap-4">
            <button
              type="submit"
              className="rounded-full bg-fog px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-white"
            >
              Save name
            </button>
            <p role="status" className="text-[14px] text-mist">
              {saved ? "Saved." : ""}
            </p>
          </div>
        </form>

        <section className="rounded-card border border-white/10 bg-panel/70 p-6 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[17px] font-medium">Google Business Profile</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[12px] text-mist">
              <span className="h-1.5 w-1.5 rounded-full bg-mist" />
              Not connected
            </span>
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-mist">
            NovaAI does not read from or post to Google yet. Until the
            connection is built, add test reviews on the Reviews page to try
            Nova&apos;s replies.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
