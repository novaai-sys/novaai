"use client";

import { useEffect, useRef, useState } from "react";
import type { WebCallSession } from "retell-client-js-sdk";

type State = "idle" | "connecting" | "live" | "ended" | "error";

/**
 * Live demo: a web call with Jessica from the browser. The Retell SDK sends
 * its create-web-call request to our own route (/api/demo/retell/...), which
 * adds the secret key, picks the demo agent and applies the demo limits.
 */
export default function TalkToJessica() {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");
  const [seconds, setSeconds] = useState(0);
  const call = useRef<WebCallSession | null>(null);

  useEffect(() => () => void call.current?.end().catch(() => {}), []);

  useEffect(() => {
    if (state !== "live") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  async function start() {
    setState("connecting");
    setMessage("");
    setSeconds(0);
    try {
      const { RetellClient } = await import("retell-client-js-sdk");
      const client = new RetellClient({
        key: "server-side",
        baseURL: `${window.location.origin}/api/demo/retell`,
      });
      const session = client.createWebCall({
        agent_id: "demo",
        hooks: {
          onStatus: (s) => {
            if (s === "live") setState("live");
            if (s === "ended") setState((p) => (p === "error" ? p : "ended"));
          },
        },
      });
      call.current = session;
      await session.ready;
    } catch (e) {
      call.current = null;
      setState("error");
      setMessage(describe(e));
    }
  }

  async function stop() {
    await call.current?.end().catch(() => {});
    call.current = null;
    setState("ended");
  }

  const live = state === "live";
  const busy = state === "connecting";
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={live ? stop : start}
        disabled={busy}
        aria-live="polite"
        className={`group inline-flex items-center gap-3 rounded-full px-6 py-3 text-[15px] font-medium transition-colors disabled:cursor-wait ${
          live
            ? "bg-white/10 text-fog ring-1 ring-ice/50 hover:bg-white/15"
            : "bg-fog text-ink hover:bg-white"
        }`}
      >
        <span
          aria-hidden="true"
          className={`relative grid h-6 w-6 place-items-center rounded-full ${
            live ? "bg-ice/25" : "bg-ink/10"
          }`}
        >
          {live && <span className="absolute inset-0 animate-ping rounded-full bg-ice/40" />}
          {live ? (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect width="10" height="10" rx="2" fill="currentColor" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
              <path d="M19 11a7 7 0 0 1-14 0M12 18v3" />
            </svg>
          )}
        </span>
        {busy
          ? "Calling Jessica…"
          : live
            ? `End call · ${time}`
            : state === "ended"
              ? "Talk to Jessica again"
              : "Talk to Jessica now"}
      </button>

      <p className="mt-3 min-h-[1.5em] max-w-[44ch] text-center text-[13px] text-mist" aria-live="polite">
        {state === "error"
          ? message
          : live
            ? "Try: “My AC quit and it’s 98 degrees in here.”"
            : state === "ended"
              ? "That’s what your customers hear when you can’t pick up."
              : "Live demo in your browser. Allow the microphone and call her like a customer would."}
      </p>
    </div>
  );
}

function describe(e: unknown) {
  if (e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError")) {
    return "Allow microphone access in your browser to talk to Jessica.";
  }
  if (e && typeof e === "object" && "body" in e) {
    const body = (e as { body?: { error?: unknown } }).body;
    if (body && typeof body.error === "string") return body.error;
  }
  if (e instanceof Error && /microphone|permission|NotAllowed/i.test(e.message)) {
    return "Allow microphone access in your browser to talk to Jessica.";
  }
  return "The demo couldn't connect. Check your connection and try again.";
}
