"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CallRow, FollowUpStatus } from "@/lib/types";
import {
  CALL_DETAIL_COLUMNS,
  OutcomeBadge,
  duration,
  field,
  phone,
  statusDot,
  statusLabel,
  when,
} from "@/components/dashboard/calls/shared";

type State = { kind: "loading" } | { kind: "missing" } | { kind: "error"; message: string } | { kind: "ready"; call: CallRow };

export default function CallPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let live = true;
    createClient()
      .from("calls")
      .select(CALL_DETAIL_COLUMNS)
      .eq("call_id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!live) return;
        if (error) setState({ kind: "error", message: error.message });
        else if (!data) setState({ kind: "missing" });
        else setState({ kind: "ready", call: data as CallRow });
      });
    return () => {
      live = false;
    };
  }, [id]);

  return (
    <div className="mx-auto max-w-[1000px] px-5 py-8 md:px-10 md:py-12">
      <Link href="/dashboard/calls" className="text-[14px] text-mist transition-colors hover:text-fog">
        ← All calls
      </Link>

      {state.kind === "loading" && (
        <p role="status" className="mt-8 text-[15px] text-mist">
          Loading the call…
        </p>
      )}
      {state.kind === "missing" && (
        <p className="mt-8 text-[15px] text-mist">
          This call isn&apos;t in your account. It may still be processing; try again in a minute.
        </p>
      )}
      {state.kind === "error" && (
        <p role="alert" className="mt-8 text-[15px] text-[#ffc6bd]">
          Couldn&apos;t load the call: {state.message}
        </p>
      )}
      {state.kind === "ready" && <CallDetail call={state.call} />}
    </div>
  );
}

function CallDetail({ call }: { call: CallRow }) {
  const details: [string, string][] = [
    ["Callback number", phone(field(call, "callback_number") || call.from_number)],
    ["Address", field(call, "service_address")],
    ["Problem", field(call, "issue")],
    ["Time window", field(call, "time_window")],
    ["Urgency", field(call, "urgency").replace(/_/g, " ")],
    ["Caller's mood", call.user_sentiment],
  ];

  return (
    <article className="mt-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.75rem,3.2vw,2.5rem)] font-medium leading-tight tracking-[-0.03em]">
            {call.customer_name || phone(call.from_number) || "Unknown caller"}
          </h1>
          <p className="mt-2 text-[15px] text-mist">
            {when(call)}
            {call.duration_ms ? ` · ${duration(call.duration_ms)} long` : ""}
            {call.from_number ? ` · from ${phone(call.from_number)}` : ""}
          </p>
        </div>
        <OutcomeBadge call={call} />
      </header>

      <section aria-label="Recording" className="mt-8 rounded-card border border-white/10 bg-panel/60 p-5">
        {call.recording_url ? (
          <audio controls preload="none" src={call.recording_url} className="w-full">
            <a href={call.recording_url}>Download the recording</a>
          </audio>
        ) : (
          <p className="text-[14px] text-mist">No recording for this call.</p>
        )}
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section aria-labelledby="summary-title">
          <h2 id="summary-title" className="text-[17px] font-medium">Summary</h2>
          <p className="mt-3 text-[16px] leading-relaxed text-fog">
            {call.summary || "Retell hasn't sent a summary for this call."}
          </p>
          <dl className="mt-6 divide-y divide-white/10 border-y border-white/10 text-[15px]">
            {details
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="grid grid-cols-[9rem_1fr] gap-4 py-3">
                  <dt className="text-mist">{k}</dt>
                  <dd className="first-letter:uppercase">{v}</dd>
                </div>
              ))}
          </dl>
        </section>

        <section aria-labelledby="followups-title">
          <h2 id="followups-title" className="text-[17px] font-medium">Follow-ups</h2>
          <ul className="mt-3 space-y-3">
            <FollowUp title="Text to you" status={call.sms_status} to={phone(call.sms_to)} body={call.sms_body} error={call.sms_error} />
            <FollowUp title="Email to you" status={call.email_status} to={call.email_to} body={call.email_subject} error={call.email_error} />
            <FollowUp
              title="Text to the caller"
              status={call.caller_sms_status}
              to={phone(call.caller_sms_to)}
              body={call.caller_sms_body}
              error={call.caller_sms_error}
              hint={
                call.caller_sms_status === "skipped" && /turned off/.test(call.caller_sms_error) ? (
                  <Link href="/dashboard/call-settings" className="underline decoration-white/30 underline-offset-4 hover:decoration-white">
                    Turn on caller texts
                  </Link>
                ) : null
              }
            />
          </ul>
        </section>
      </div>

      <section aria-labelledby="transcript-title" className="mt-10">
        <h2 id="transcript-title" className="text-[17px] font-medium">Transcript</h2>
        <Transcript text={call.transcript} />
      </section>
    </article>
  );
}

function FollowUp({
  title,
  status,
  to,
  body,
  error,
  hint,
}: {
  title: string;
  status: FollowUpStatus;
  to: string;
  body: string;
  error: string;
  hint?: React.ReactNode;
}) {
  return (
    <li className="rounded-2xl border border-white/10 bg-panel/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] font-medium">{title}</p>
        <span className="inline-flex items-center gap-1.5 text-[13px] text-mist">
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${statusDot(status)}`} />
          {statusLabel(status)}
        </span>
      </div>
      {to && status !== "skipped" && <p className="mt-1 text-[13px] text-mist">To {to}</p>}
      {body && status !== "skipped" && (
        <p className="mt-3 whitespace-pre-line rounded-xl bg-ink/60 p-3 text-[14px] leading-relaxed text-fog">{body}</p>
      )}
      {error && (
        <p className={`mt-2 text-[13px] ${status === "failed" ? "text-[#ffc6bd]" : "text-mist"}`}>
          {status === "failed" ? "Error: " : "Not sent: "}
          {error}
          {hint ? <> · {hint}</> : null}
        </p>
      )}
    </li>
  );
}

function Transcript({ text }: { text: string }) {
  if (!text.trim()) return <p className="mt-3 text-[15px] text-mist">No transcript for this call.</p>;
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(Agent|User|Caller)\s*:\s*(.*)$/i);
      return m ? { who: /agent/i.test(m[1]) ? "Jessica" : "Caller", said: m[2] } : { who: "", said: l };
    });
  return (
    <ol className="mt-4 space-y-3">
      {lines.map((l, i) => (
        <li key={i} className={`flex ${l.who === "Caller" ? "justify-end" : ""}`}>
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
              l.who === "Caller" ? "bg-ice/10 text-fog" : "bg-white/5 text-fog"
            }`}
          >
            {l.who && <p className="mb-0.5 text-[12px] text-mist">{l.who}</p>}
            {l.said}
          </div>
        </li>
      ))}
    </ol>
  );
}
