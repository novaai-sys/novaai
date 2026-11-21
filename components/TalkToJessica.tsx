"use client";

import { useEffect, useRef, useState } from "react";
import type { RetellWebClient } from "retell-client-js-sdk";

type State = "idle" | "connecting" | "live" | "ended" | "error";

type CallDetails = {
  accessToken: string;
  callId?: string;
  transport?: "gateway" | "livekit";
  url?: string;
  iceServers?: RTCIceServer[];
};

/**
 * Live demo: a web call with Jessica from the browser.
 *
 * Our server creates the call (/api/demo/web-call keeps the Retell key secret
 * and applies the demo limits). The browser then connects its audio straight
 * to Retell with RetellWebClient.startCall().
 */
export default function TalkToJessica() {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");
  const [seconds, setSeconds] = useState(0);
  const client = useRef<RetellWebClient | null>(null);

  useEffect(() => () => client.current?.stopCall(), []);

  useEffect(() => {
    if (state !== "live") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  async function start() {
    setState("connecting");
    setMessage("");
    setSeconds(0);

    // Ask for the microphone first, so a "Block" never uses up a demo call.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setState("error");
      setMessage("Allow microphone access in your browser to talk to Jessica.");
      return;
    }

    let details: CallDetails;
    try {
      const res = await fetch("/api/demo/web-call", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.accessToken) {
        setState("error");
        setMessage(json.error || "The demo couldn't connect. Please try again.");
        return;
      }
      details = json;
    } catch {
      setState("error");
      setMessage("The demo couldn't connect. Check your connection and try again.");
      return;
    }

    try {
      const { RetellWebClient } = await import("retell-client-js-sdk");
      const c = new RetellWebClient();
      client.current = c;
      c.on("call_started", () => setState("live"));
      c.on("call_ended", () => {
        client.current = null;
        setState((p) => (p === "error" ? p : "ended"));
      });
      c.on("error", (e: unknown) => {
        console.error("[demo] call error", e);
        c.stopCall();
        client.current = null;
        setState("error");
        setMessage("The call dropped. Please try again.");
      });
      await c.startCall({
        accessToken: details.accessToken,
        callId: details.callId,
        transport: details.transport,
        url: details.url,
        iceServers: details.iceServers,
      });
      setState((p) => (p === "connecting" ? "live" : p));
    } catch (e) {
      console.error("[demo] could not connect", e);
      client.current?.stopCall();
      client.current = null;
      setState("error");
      setMessage("The call couldn't connect. Check your connection and try again.");
    }
  }

  function stop() {
    client.current?.stopCall();
    client.current = null;
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
