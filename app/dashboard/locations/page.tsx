"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PageShell from "@/components/dashboard/PageShell";
import Switch from "@/components/dashboard/Switch";
import GoogleConnectCard, { CONNECT_URL, GoogleMark } from "@/components/dashboard/GoogleConnectCard";
import { useDashboard } from "@/components/dashboard/Store";
import { formatDay } from "@/lib/usage";
import { timeAgo } from "@/lib/time";

const field =
  "mt-4 w-full rounded-xl border border-white/15 bg-ink/60 px-4 py-3 text-[15px] text-fog outline-none placeholder:text-ghost focus:border-ice/60";
const primary =
  "inline-block rounded-full bg-fog px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40";
const secondary =
  "inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-[14px] text-fog transition-colors hover:bg-white/5 disabled:opacity-40";

type Notice = { tone: "ok" | "error"; text: string };

/** What the Google callback reports through ?google=... */
function googleMessage(code: string, limit: number): Notice | null {
  if (code.startsWith("connected_limit_")) {
    const n = Number(code.slice("connected_limit_".length)) || 1;
    return {
      tone: "ok",
      text: `Google connected. ${n} more ${n === 1 ? "location was" : "locations were"} not added because your plan allows ${limit}. Growth allows up to 5.`,
    };
  }
  const messages: Record<string, Notice> = {
    connected: { tone: "ok", text: "Google connected." },
    connected_no_access: {
      tone: "error",
      text: "Google connected, but Google has not opened Business Profile API access for NovaAI yet, so your locations could not be loaded. Connect again once access is approved.",
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

type SyncJson = {
  imported?: number;
  generated?: number;
  postedToGoogle?: number;
  savedWithoutDraft?: number;
  errors?: string[];
  more?: boolean;
  error?: string;
  credits?: unknown;
};

function describeSync(json: SyncJson): Notice {
  const parts: string[] = [];
  if (!json.imported) parts.push("You're up to date. No new reviews without a reply.");
  else {
    parts.push(
      `${json.imported} new ${json.imported === 1 ? "review" : "reviews"} imported. ${json.generated ?? 0} with an AI reply, ${json.postedToGoogle ?? 0} posted to Google.`,
    );
  }
  if (json.savedWithoutDraft) {
    parts.push(`${json.savedWithoutDraft} saved without a draft because your trial replies are used up.`);
  }
  if (json.more) parts.push("More reviews are waiting; the rest will sync automatically in a few minutes.");
  if (json.errors?.length) parts.push(`Problem: ${json.errors[0]}`);
  return { tone: json.errors?.length ? "error" : "ok", text: parts.join(" ") };
}

export default function LocationsPage() {
  const {
    settings, updateSettings, google, locations, credits,
    setLocationAutoReply, refresh, setCredits,
  } = useDashboard();
  const [name, setName] = useState(settings.business_name);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState<null | "sync" | "disconnect">(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const firstSync = useRef(false);

  const limit = credits?.locationsLimit ?? 1;
  const healthy = google && google.status !== "needs_reconnect";

  const sync = useCallback(async () => {
    setBusy("sync");
    const res = await fetch("/api/reviews/sync", { method: "POST" });
    const json: SyncJson = await res.json().catch(() => ({}));
    setBusy(null);
    if (json.credits) setCredits(json.credits as Parameters<typeof setCredits>[0]);
    await refresh();
    setNotice(res.ok ? describeSync(json) : { tone: "error", text: json.error ?? "Sync failed. Try again." });
  }, [refresh, setCredits]);

  // The background sync may have changed things since the dashboard loaded.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // After returning from Google: show the result, then import reviews right away.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("google");
    if (!code || firstSync.current) return;
    firstSync.current = true;
    window.history.replaceState(null, "", window.location.pathname);
    const message = googleMessage(code, limit);
    const importNow =
      code.startsWith("connected") && code !== "connected_no_access" && code !== "connected_no_locations";
    // One-time handoff from Google's redirect; deferred so it runs after this render.
    queueMicrotask(() => {
      setNotice(message);
      if (importNow) void sync();
    });
  }, [limit, sync]);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setProblem("Enter the name of your business.");
      return;
    }
    setSaved(await updateSettings({ business_name: name.trim() }));
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
    <PageShell title="Locations" summary="Your Google Business Profile and the locations Nova replies for.">
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
      {busy === "sync" && (
        <p role="status" className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-[15px] text-mist">
          Checking Google for new reviews…
        </p>
      )}

      {!healthy && (
        <div className="mb-6">
          <GoogleConnectCard />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {healthy && (
          <section className="rounded-card border border-ice/25 bg-panel/70 p-6 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-3 text-[17px] font-medium">
                <GoogleMark /> Google Business Profile
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ice/15 px-2.5 py-1 text-[12px] text-ice">
                <span className="h-1.5 w-1.5 rounded-full bg-ice" />
                Auto-sync on
              </span>
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-mist">
              Connected{google.google_email ? ` as ${google.google_email}` : ""} since{" "}
              {formatDay(google.created_at)}. Nova checks for new reviews every 15 minutes;
              you can also sync now.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="button" onClick={sync} disabled={busy !== null || locations.length === 0} className={primary}>
                {busy === "sync" ? "Syncing…" : "Sync now"}
              </button>
              <a href={CONNECT_URL} className={secondary}>
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
          </section>
        )}

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
            Auto-reply posts replies to 4 and 5-star reviews on Google right away. Replies to 1 to
            3-star reviews always wait for your approval on the Reviews page.
          </p>
          <ul className="mt-5 divide-y divide-white/10 border-y border-white/10">
            {locations.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-5 py-5">
                <div className="min-w-0 flex-1">
                  <p className="text-[17px] font-medium">{l.title || "Untitled location"}</p>
                  <p className="mt-1 text-[14px] text-mist">{l.address ?? l.google_location_id}</p>
                  <p className={`mt-1 text-[13px] ${l.last_sync_error ? "text-star" : "text-ghost"}`}>
                    {l.last_sync_error
                      ? `Last sync failed: ${l.last_sync_error}`
                      : l.last_synced_at
                        ? `Synced ${timeAgo(l.last_synced_at)}${l.last_sync_new ? `, ${l.last_sync_new} new` : ""}`
                        : "Not synced yet"}
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
