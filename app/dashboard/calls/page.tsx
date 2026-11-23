"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PageShell from "@/components/dashboard/PageShell";
import { createClient } from "@/lib/supabase/client";
import type { CallRow } from "@/lib/types";
import {
  CALL_LIST_COLUMNS,
  OutcomeBadge,
  StatusDot,
  duration,
  field,
  phone,
  when,
} from "@/components/dashboard/calls/shared";

type ListCall = Pick<
  CallRow,
  | "call_id"
  | "created_at"
  | "started_at"
  | "duration_ms"
  | "from_number"
  | "outcome"
  | "customer_name"
  | "summary"
  | "analysis"
  | "sms_status"
  | "email_status"
  | "caller_sms_status"
>;

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; calls: ListCall[]; hasLine: boolean };

export default function CallsPage() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let live = true;
    (async () => {
      const db = createClient();
      const [calls, lines] = await Promise.all([
        db.from("calls").select(CALL_LIST_COLUMNS).order("created_at", { ascending: false }).limit(200),
        db.from("businesses").select("id").limit(1),
      ]);
      if (!live) return;
      if (calls.error) {
        setState({ kind: "error", message: calls.error.message });
        return;
      }
      setState({
        kind: "ready",
        calls: (calls.data ?? []) as ListCall[],
        hasLine: Boolean(lines.data?.length),
      });
    })();
    return () => {
      live = false;
    };
  }, []);

  const booked = state.kind === "ready" ? state.calls.filter((c) => c.outcome === "booked").length : 0;

  return (
    <PageShell
      title="Calls"
      summary={
        state.kind === "ready" && state.calls.length
          ? `${state.calls.length} ${state.calls.length === 1 ? "call" : "calls"} answered by Jessica, ${booked} booked.`
          : "Every call Jessica answers for you, with the summary, recording and the texts that went out."
      }
      action={
        <Link
          href="/dashboard/call-settings"
          className="rounded-full border border-white/15 px-4 py-2 text-[14px] text-fog transition-colors hover:bg-white/5"
        >
          Call settings
        </Link>
      }
    >
      {state.kind === "loading" && (
        <p role="status" className="text-[15px] text-mist">
          Loading calls…
        </p>
      )}

      {state.kind === "error" && (
        <p role="alert" className="rounded-2xl border border-[#ffb4a8]/30 bg-[#ffb4a8]/5 p-5 text-[15px] text-[#ffc6bd]">
          Couldn&apos;t load your calls: {state.message}
        </p>
      )}

      {state.kind === "ready" && state.calls.length === 0 && (
        <div className="rounded-card border border-white/10 bg-panel/60 p-8">
          <p className="text-[19px] font-medium">
            {state.hasLine ? "No calls yet" : "Your line isn't connected yet"}
          </p>
          <p className="mt-2 max-w-[56ch] text-[15px] leading-relaxed text-mist">
            {state.hasLine
              ? "When Jessica answers a call, it shows up here a minute after it ends, with the summary, recording and transcript."
              : "Once we set Jessica up for your shop, every call she answers shows up here. Questions: support@getnovaai.app"}
          </p>
        </div>
      )}

      {state.kind === "ready" && state.calls.length > 0 && (
        <ul className="divide-y divide-white/10 overflow-hidden rounded-card border border-white/10 bg-panel/60">
          {state.calls.map((c) => {
            const issue = field(c, "issue");
            return (
              <li key={c.call_id}>
                <Link
                  href={`/dashboard/calls/${encodeURIComponent(c.call_id)}`}
                  className="grid gap-x-6 gap-y-2 px-5 py-4 transition-colors hover:bg-white/[0.04] md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.6fr)_auto] md:items-center md:px-6"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-medium">
                      {c.customer_name || phone(c.from_number) || "Unknown caller"}
                    </p>
                    <p className="mt-0.5 text-[13px] text-mist">
                      {when(c)}
                      {c.duration_ms ? ` · ${duration(c.duration_ms)}` : ""}
                      {c.customer_name && c.from_number ? ` · ${phone(c.from_number)}` : ""}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <OutcomeBadge call={c} />
                    <p className="mt-1.5 line-clamp-1 text-[14px] text-mist">{issue || c.summary}</p>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 md:justify-end">
                    <StatusDot status={c.sms_status} label="Your text" />
                    <StatusDot status={c.email_status} label="Your email" />
                    <StatusDot status={c.caller_sms_status} label="Caller text" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
