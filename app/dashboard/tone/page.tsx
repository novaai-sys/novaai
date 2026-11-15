"use client";

import { useState } from "react";
import PageShell from "@/components/dashboard/PageShell";
import { useDashboard } from "@/components/dashboard/Store";
import { isPreset, tonePresets, type TonePreset } from "@/lib/tones";

const field =
  "mt-2 w-full rounded-xl border border-white/15 bg-ink/60 p-3 text-[15px] leading-relaxed text-fog outline-none placeholder:text-ghost focus:border-ice/60";

export default function TonePage() {
  const { settings, updateSettings } = useDashboard();
  const stored = settings.tone_of_voice || "Warm";

  const [preset, setPreset] = useState<TonePreset | "Custom">(
    isPreset(stored) ? stored : "Custom",
  );
  const [custom, setCustom] = useState(isPreset(stored) ? "" : stored);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const touch = () => {
    setSaved(false);
    setProblem(null);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = preset === "Custom" ? custom.trim() : preset;
    if (!value) {
      setProblem("Describe your tone, or choose one of the presets.");
      return;
    }
    setSaved(await updateSettings({ tone_of_voice: value }));
  };

  return (
    <PageShell
      title="Tone of voice"
      summary="Tell Nova how your business speaks. Every new reply follows this setting."
    >
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <form onSubmit={save} className="space-y-7">
          <fieldset>
            <legend className="text-[15px] font-medium">Tone</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {([...Object.keys(tonePresets), "Custom"] as (TonePreset | "Custom")[]).map(
                (t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={preset === t}
                    onClick={() => {
                      setPreset(t);
                      touch();
                    }}
                    className={`rounded-full px-5 py-2 text-[14px] transition-colors ${
                      preset === t
                        ? "bg-fog text-ink"
                        : "border border-white/15 text-fog hover:bg-white/5"
                    }`}
                  >
                    {t}
                  </button>
                ),
              )}
            </div>
          </fieldset>

          {preset === "Custom" && (
            <div className="rise">
              <label htmlFor="custom-tone" className="text-[15px] font-medium">
                Describe your tone
              </label>
              <textarea
                id="custom-tone"
                rows={3}
                maxLength={400}
                value={custom}
                onChange={(e) => {
                  setCustom(e.target.value);
                  touch();
                }}
                placeholder="For example: calm and precise, like a family pharmacy. Always thank the customer by name."
                className={field}
              />
            </div>
          )}

          {problem && (
            <p role="alert" className="text-[14px] text-star">
              {problem}
            </p>
          )}

          <div className="flex items-center gap-4">
            <button
              type="submit"
              className="rounded-full bg-fog px-6 py-3 text-[15px] font-medium text-ink transition-colors hover:bg-white"
            >
              Save changes
            </button>
            <p role="status" className="text-[14px] text-mist">
              {saved ? "Saved." : ""}
            </p>
          </div>
        </form>

        <section
          aria-labelledby="preview-title"
          className="h-fit rounded-card border border-ice/25 bg-panel/70 p-6 md:p-7"
        >
          <h2 id="preview-title" className="text-[13px] text-mist">
            {preset === "Custom"
              ? "Hear your own tone"
              : "An example reply in this tone"}
          </h2>
          <p key={preset} className="rise mt-4 text-[16px] leading-relaxed text-fog">
            {preset === "Custom"
              ? "Save your description, then add a test review on the Reviews page. Nova will write the reply in your tone."
              : tonePresets[preset].sample}
          </p>
        </section>
      </div>
    </PageShell>
  );
}
