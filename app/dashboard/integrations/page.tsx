"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/dashboard/PageShell";
import GoogleConnectCard, { GoogleMark } from "@/components/dashboard/GoogleConnectCard";
import { useDashboard } from "@/components/dashboard/Store";
import { createClient } from "@/lib/supabase/client";
import { formatDay } from "@/lib/usage";

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

const field =
  "w-full rounded-xl border border-white/15 bg-ink/60 px-4 py-3 text-[15px] text-fog outline-none placeholder:text-ghost focus:border-ice/60";
const primary =
  "inline-block rounded-full bg-fog px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40";
const secondary =
  "inline-block rounded-full border border-white/15 px-4 py-2 text-[13px] text-fog transition-colors hover:bg-white/5 disabled:opacity-40";
const code =
  "overflow-x-auto rounded-xl border border-white/10 bg-ink/70 p-4 font-mono text-[13px] leading-relaxed text-fog";

const exampleBody = `{
  "review": "{{comment}}",
  "rating": "{{starRating}}",
  "author": "{{reviewer.displayName}}",
  "review_id": "{{reviewId}}"
}`;

const exampleResponse = `{
  "reply": "Thank you, Maria! ...",
  "should_post": true,
  "status": "published",
  "rating": 5,
  "nova_review_id": "…",
  "duplicate": false
}`;

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={secondary}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          setDone(false);
        }
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}

export default function IntegrationsPage() {
  const { user, google, locations, refresh } = useDashboard();
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("Make.com");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState("https://getnovaai.app/api/v1/reviews/reply");

  const load = useCallback(async () => {
    const { data, error } = await createClient()
      .from("api_keys")
      .select("id, name, key_prefix, created_at, last_used_at, revoked_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) setLoadError(`API keys could not load: ${error.message}. Run supabase/migrations/20261118200000_api_keys.sql.`);
    else setKeys(data as ApiKey[]);
  }, [user.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEndpoint(`${window.location.origin}/api/v1/reviews/reply`);
    void load();
    void refresh();
  }, [load, refresh]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("create");
    setError(null);
    setNewKey(null);
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(json.error ?? "The key could not be created.");
      return;
    }
    setNewKey(json.key);
    await load();
  };

  const revoke = async (id: string) => {
    setBusy(id);
    setError(null);
    const res = await fetch(`/api/keys/${encodeURIComponent(id)}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    setConfirming(null);
    if (!res.ok) setError(json.error ?? "The key could not be revoked.");
    await load();
  };

  const active = (keys ?? []).filter((k) => !k.revoked_at);

  return (
    <PageShell
      title="Integrations"
      summary="Connect your Google Business Profile and Nova replies to your reviews automatically. Nothing else to set up."
    >
      {google && google.status !== "needs_reconnect" ? (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-ice/25 bg-panel/70 p-6 md:p-7">
          <div>
            <h2 className="flex items-center gap-3 text-[17px] font-medium">
              <GoogleMark /> Google Business Profile
            </h2>
            <p className="mt-2 text-[14px] text-mist">
              Connected{google.google_email ? ` as ${google.google_email}` : ""}.{" "}
              {locations.length} {locations.length === 1 ? "location" : "locations"}, synced every 15 minutes.
            </p>
          </div>
          <Link href="/dashboard/locations" className={primary}>
            Manage locations
          </Link>
        </section>
      ) : (
        <GoogleConnectCard />
      )}

      <details className="group mt-8 rounded-card border border-white/10 bg-panel/40">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 md:p-7 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-[17px] font-medium">Developer API / Make.com</span>
            <span className="mt-1 block text-[14px] text-mist">
              Optional. For developers who want to generate replies from Make.com, Zapier or
              their own code.
            </span>
          </span>
          <span
            aria-hidden="true"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/15 text-mist transition-transform duration-300 group-open:rotate-180"
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M3 4.5 6 7.5l3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </summary>
      <div className="faq-answer grid gap-6 border-t border-white/10 p-6 md:p-7 lg:grid-cols-[1.1fr_1fr]">
        <section className="rounded-card border border-white/10 bg-panel/70 p-6 md:p-7">
          <h2 className="text-[17px] font-medium">API keys</h2>
          <p className="mt-1 text-[14px] text-mist">
            A key can generate replies for this account. Keep it secret, like a
            password.
          </p>

          <form onSubmit={create} className="mt-5 flex flex-wrap items-end gap-3">
            <div className="min-w-[12rem] flex-1">
              <label htmlFor="key-name" className="text-[14px] font-medium">
                Key name
              </label>
              <input
                id="key-name"
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                className={`${field} mt-2`}
              />
            </div>
            <button type="submit" disabled={busy !== null} className={primary}>
              {busy === "create" ? "Creating…" : "Create API key"}
            </button>
          </form>

          {error && (
            <p role="alert" className="mt-4 text-[14px] text-star">
              {error}
            </p>
          )}

          {newKey && (
            <div role="status" className="rise mt-5 rounded-2xl border border-ice/30 bg-ice/10 p-4">
              <p className="text-[14px] font-medium text-ice">
                Copy your key now. It won&apos;t be shown again.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <code className="min-w-0 flex-1 break-all rounded-lg bg-ink/70 px-3 py-2 font-mono text-[13px] text-fog">
                  {newKey}
                </code>
                <CopyButton text={newKey} />
              </div>
            </div>
          )}

          {loadError && (
            <p role="alert" className="mt-4 text-[14px] text-star">
              {loadError}
            </p>
          )}

          {keys && (
            <ul className="mt-6 divide-y divide-white/10 border-y border-white/10">
              {keys.length === 0 && (
                <li className="py-5 text-[14px] text-mist">No keys yet. Create one to connect Make.com.</li>
              )}
              {keys.map((k) => (
                <li key={k.id} className={`flex flex-wrap items-center gap-4 py-4 ${k.revoked_at ? "opacity-50" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium">{k.name}</p>
                    <p className="mt-1 font-mono text-[12px] text-mist">{k.key_prefix}…</p>
                    <p className="mt-1 text-[12px] text-ghost">
                      {k.revoked_at
                        ? `Revoked ${formatDay(k.revoked_at)}`
                        : `Created ${formatDay(k.created_at)}. ${
                            k.last_used_at ? `Last used ${formatDay(k.last_used_at)}.` : "Never used."
                          }`}
                    </p>
                  </div>
                  {!k.revoked_at &&
                    (confirming === k.id ? (
                      <span className="flex items-center gap-2">
                        <button type="button" onClick={() => revoke(k.id)} disabled={busy !== null} className={secondary}>
                          {busy === k.id ? "Revoking…" : "Yes, revoke"}
                        </button>
                        <button type="button" onClick={() => setConfirming(null)} className="px-2 text-[13px] text-mist hover:text-fog">
                          Keep
                        </button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setConfirming(k.id)} className={secondary}>
                        Revoke
                      </button>
                    ))}
                </li>
              ))}
            </ul>
          )}
          {active.length > 0 && (
            <p className="mt-3 text-[12px] text-ghost">
              Revoking a key stops it immediately. Anything still using it gets an error.
            </p>
          )}
        </section>

        <section className="rounded-card border border-white/10 bg-panel/70 p-6 md:p-7">
          <h2 className="text-[17px] font-medium">Make.com: HTTP &ldquo;Make a request&rdquo;</h2>
          <dl className="mt-4 space-y-4 text-[14px]">
            <div>
              <dt className="text-mist">URL (method POST)</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2">
                <code className="break-all font-mono text-[13px] text-fog">{endpoint}</code>
                <CopyButton text={endpoint} />
              </dd>
            </div>
            <div>
              <dt className="text-mist">Header</dt>
              <dd className="mt-1 font-mono text-[13px] text-fog">Authorization: Bearer nova_sk_…</dd>
            </div>
            <div>
              <dt className="text-mist">Body type: Raw, content type JSON (application/json)</dt>
              <dd className="mt-2">
                <pre className={code}>{exampleBody}</pre>
              </dd>
            </div>
            <div>
              <dt className="text-mist">Parse response: Yes. You get back:</dt>
              <dd className="mt-2">
                <pre className={code}>{exampleResponse}</pre>
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-[13px] leading-relaxed text-mist">
            Post <code className="font-mono text-fog">reply</code> to Google only when{" "}
            <code className="font-mono text-fog">should_post</code> is true. Replies to 1 to
            3-star reviews always come back with <code className="font-mono text-fog">should_post: false</code>{" "}
            and wait on the Reviews page for your approval.
          </p>
        </section>
      </div>
      </details>
    </PageShell>
  );
}
