"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/dashboard/PageShell";
import Switch from "@/components/dashboard/Switch";
import { useDashboard } from "@/components/dashboard/Store";
import { formatDay } from "@/lib/usage";

const field =
  "mt-4 w-full rounded-xl border border-white/15 bg-ink/60 px-4 py-3 text-[15px] text-fog outline-none placeholder:text-ghost focus:border-ice/60";
const primary =
  "inline-block rounded-full bg-fog px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40";
const secondary =
  "inline-block rounded-full border border-white/15 px-5 py-2.5 text-[14px] text-fog transition-colors hover:bg-white/5 disabled:opacity-40";

/** What the Google callback reports through ?google=... */
function googleMessage(code: string, limit: number): { tone: "ok" | "error"; text: string } | null {
  if (code.startsWith("connected_limit_")) {
    const n = Number(code.slice("connected_limit_".length)) || 1;
    return {
      tone: "ok",
      text: `Google connected. ${n} more ${n === 1 ? "location was" : "locations were"} not added because your plan allows ${limit}. Growth allows up to 5.`,
    };
  }
  const messages: Record<string, { tone: "ok" | "error"; text: string }> = {
    connected: { tone: "ok", text: "Google connected. Your locations are below." },
    connected_no_access: {
      tone: "error",
      text: "Google connected, but Google has not opened Business Profile API access for NovaAI yet, so locations could not be loaded. Connect again once access is approved.",
    },
    connected_no_locations: {
      tone: "error",
      text: "Google connected, but this Google account does not manage any Business Profile locations. Connect the account that owns your profile.",
    },
    denied: { tone: "error", text: "Google sign-in was cancelled. Nothing was connected." },
    missing_scope: {
      tone: "error",
      text: "Google was connected without permission to manage your Business Profile. Connect again and allow that permission.",
    },
    no_refresh_token: {
      tone: "error",
      text: "Google did not grant long-term access. Remove NovaAI from your Google Account permissions, then connect again.",
    },
    state_mismatch: { tone: "error", text: "That sign-in link expired. Connect again." },
    not_configured: {
      tone: "error",
      text: "Google sign-in is not set up on this server yet. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_TOKEN_ENCRYPTION_KEY.",
    },
    error: { tone: "error", text: "Something went wrong while connecting Google. Try again." },
  };
  return messages[code] ?? null;
}

export default function LocationsPage() {
  const { settings, updateSettings, google, locations, credits, setLocationAutoReply, refresh, setCredits } =
    useDashboard();
  const [name, setName] = useState(settings.business_name);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<null | "sync" | "disconnect">(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const limit = credits?.locationsLimit ?? 1;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("google");
    if (!code) return;
    window.history.replaceState(null, "", window.location.pathname);
    // Shown once, after the redirect back from Google.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotice(googleMessage(code, limit));
  }, [limit]);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setProblem("Enter the name of your business.");
      return;
    }
    setSaved(await updateSettings({ business_name: name.trim() }));
  };

  const sync = async () => {
    setBusy("sync");
    setNotice(null);
    const res = await fetch("/api/reviews/sync", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (json.credits) setCredits(json.credits);
    if (!res.ok) {
      setNotice({ tone: "error", text: json.error ?? "Checking for reviews failed." });
      return;
    }
    await refresh();
    const parts = [
      json.imported === 0
        ? "No new reviews without a reply."
        : `${json.imported} new ${json.imported === 1 ? "review" : "reviews"} imported, ${json.generated} with an AI reply.`,
      json.skippedForLimit
        ? `${json.skippedForLimit} saved without a draft because your trial replies are used up.`
        : "",
      json.errors?.length ? `Some locations failed: ${json.errors[0]}` : "",
    ];
    setNotice({ tone: json.errors?.length ? "error" : "ok", text: parts.filter(Boolean).join(" ") });
  };

  const disconnect = async () => {
    setBusy("disconnect");
    const res = await fetch("/api/auth/google-business/disconnect", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    setConfirmDisconnect(false);
    if (!res.ok) {
      setNotice({ tone: "error", text: json.error ?? "Disconnecting failed." });
      return;
    }
    await refresh();
    setNotice({ tone: "ok", text: "Google disconnected. NovaAI no longer has access to your Business Profile." });
  };

  return (
    <PageShell title="Locations" summary="Your business and the Google Business Profile locations Nova replies for.">
      {notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={`mb-6 rounded-2xl border px-5 py-4 text-[15px] ${
            notice.tone === "error" ? "border-star/30 bg-star/10 text-star" : "border-ice/30 bg-ice/10 text-ice"
          }`}
        >
          {notice.text}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="rounded-card border border-white/10 bg-panel/70 p-6 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[17px] font-medium">Google Business Profile</h2>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] ${
                google ? "bg-ice/15 text-ice" : "bg-white/5 text-mist"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${google ? "bg-ice" : "bg-mist"}`} />
              {google ? "Connected" : "Not connected"}
            </span>
          </div>

          {google ? (
            <>
              <p className="mt-3 text-[14px] leading-relaxed text-mist">
                Connected{google.google_email ? ` as ${google.google_email}` : ""} on{" "}
                {formatDay(google.created_at)}. Your plan allows {limit}{" "}
                {limit === 1 ? "location" : "locations"}.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={sync} disabled={busy !== null || locations.length === 0} className={primary}>
                  {busy === "sync" ? "Checking…" : "Check for new reviews"}
                </button>
                <a href="/api/auth/google-business/connect" className={secondary}>
                  Reconnect
                </a>
                {confirmDisconnect ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={disconnect} disabled={busy !== null} className={secondary}>
                      {busy === "disconnect" ? "Disconnecting…" : "Yes, disconnect"}
                    </button>
                    <button type="button" onClick={() => setConfirmDisconnect(false)} className="px-3 text-[14px] text-mist hover:text-fog">
                      Keep connected
                    </button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfirmDisconnect(true)} className="px-3 text-[14px] text-mist hover:text-fog">
                    Disconnect
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-[14px] leading-relaxed text-mist">
                Sign in with the Google account that manages your Business
                Profile. You approve access on Google&apos;s own screen, NovaAI
                never sees your password, and you can disconnect at any time.
              </p>
              <a href="/api/auth/google-business/connect" className={`${primary} mt-5`}>
                Connect Google Business Profile
              </a>
            </>
          )}
        </section>

        <form onSubmit={saveName} className="rounded-card border border-white/10 bg-panel/70 p-6 md:p-7">
          <label htmlFor="business-name" className="text-[17px] font-medium">
            Business name
          </label>
          <p className="mt-1 text-[14px] text-mist">Nova uses this name when it writes on your behalf.</p>
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
            className={field}
          />
          {problem && (
            <p role="alert" className="mt-3 text-[14px] text-star">
              {problem}
            </p>
          )}
          <div className="mt-4 flex items-center gap-4">
            <button type="submit" className={primary}>
              Save name
            </button>
            <p role="status" className="text-[14px] text-mist">
              {saved ? "Saved." : ""}
            </p>
          </div>
        </form>
      </div>

      {locations.length > 0 && (
        <section aria-labelledby="locations-title" className="mt-10">
          <h2 id="locations-title" className="text-[17px] font-medium">
            Connected locations ({locations.length} of {limit})
          </h2>
          <p className="mt-1 text-[14px] text-mist">
            Auto-reply publishes replies to 4 and 5-star reviews right away.
            Replies to 1 to 3-star reviews always wait for your approval.
          </p>
          <ul className="mt-5 divide-y divide-white/10 border-y border-white/10">
            {locations.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-5 py-5">
                <div className="min-w-0 flex-1">
                  <p className="text-[17px] font-medium">{l.title || "Untitled location"}</p>
                  <p className="mt-1 text-[14px] text-mist">
                    {l.address ?? l.google_location_id}
                    {l.last_synced_at ? `. Checked ${formatDay(l.last_synced_at)}` : ""}
                  </p>
                </div>
                <span className="text-[13px] text-mist" aria-live="polite">
                  {l.auto_reply_enabled ? "Auto-reply on" : "Auto-reply off"}
                </span>
                <Switch
                  checked={l.auto_reply_enabled}
                  onChange={() => void setLocationAutoReply(l.id, !l.auto_reply_enabled)}
                  label={`Auto-reply to 4 and 5-star reviews for ${l.title || "this location"}`}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageShell>
  );
}
