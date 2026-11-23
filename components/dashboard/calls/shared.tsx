import type { CallRow, FollowUpStatus } from "@/lib/types";

export const CALL_LIST_COLUMNS =
  "call_id, created_at, started_at, duration_ms, from_number, outcome, customer_name, summary, analysis, sms_status, email_status, caller_sms_status";

export const CALL_DETAIL_COLUMNS =
  "call_id, created_at, started_at, duration_ms, from_number, to_number, outcome, customer_name, summary, user_sentiment, recording_url, transcript, analysis, sms_status, sms_to, sms_body, sms_error, email_status, email_to, email_subject, email_error, caller_sms_status, caller_sms_to, caller_sms_body, caller_sms_error";

export const BUSINESS_SETTINGS_COLUMNS =
  "id, name, retell_agent_id, owner_phone, sms_enabled, notify_email, email_enabled, caller_sms_enabled, caller_sms_booked_template, caller_sms_followup_template, followup_link";

/** +15125550148 -> (512) 555-0148 */
export function phone(n: string) {
  const d = n.replace(/\D/g, "");
  const us = d.length === 11 && d.startsWith("1") ? d.slice(1) : d.length === 10 ? d : "";
  return us ? `(${us.slice(0, 3)}) ${us.slice(3, 6)}-${us.slice(6)}` : n;
}

export function duration(ms: number | null) {
  if (!ms) return "";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function when(c: Pick<CallRow, "started_at" | "created_at">) {
  const d = new Date(c.started_at || c.created_at);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export const field = (c: Pick<CallRow, "analysis">, k: string) => {
  const v = c.analysis?.custom_analysis_data?.[k];
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
};

export const isEmergency = (c: Pick<CallRow, "analysis">) => field(c, "urgency").toLowerCase() === "emergency";

const OUTCOME: Record<string, { label: string; className: string }> = {
  booked: { label: "Job booked", className: "bg-[#7fe0a8]/15 text-[#9be8bb]" },
  lead: { label: "Lead", className: "bg-ice/15 text-ice" },
  hang_up: { label: "Hang-up", className: "bg-white/5 text-mist" },
  spam: { label: "Spam", className: "bg-white/5 text-mist" },
  voicemail: { label: "Voicemail", className: "bg-white/5 text-mist" },
  "": { label: "Analyzing", className: "bg-white/5 text-mist" },
};

export function OutcomeBadge({ call }: { call: Pick<CallRow, "outcome" | "analysis"> }) {
  const o = OUTCOME[call.outcome] ?? OUTCOME[""];
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${o.className}`}>{o.label}</span>
      {isEmergency(call) && (
        <span className="rounded-full bg-[#ffb4a8]/15 px-2.5 py-1 text-[12px] font-medium text-[#ffc6bd]">
          Emergency
        </span>
      )}
    </span>
  );
}

const STATUS: Record<FollowUpStatus, { label: string; dot: string }> = {
  sent: { label: "Sent", dot: "bg-[#7fe0a8]" },
  failed: { label: "Failed", dot: "bg-[#ffb4a8]" },
  skipped: { label: "Not sent", dot: "bg-white/25" },
  sending: { label: "Sending", dot: "bg-ice" },
  pending: { label: "Waiting", dot: "bg-white/25" },
};

export function StatusDot({ status, label }: { status: FollowUpStatus; label: string }) {
  const s = STATUS[status] ?? STATUS.pending;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-mist" title={`${label}: ${s.label}`}>
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${s.dot}`} />
      <span>
        {label}: <span className="text-fog">{s.label.toLowerCase()}</span>
      </span>
    </span>
  );
}

export const statusLabel = (s: FollowUpStatus) => (STATUS[s] ?? STATUS.pending).label;
export const statusDot = (s: FollowUpStatus) => (STATUS[s] ?? STATUS.pending).dot;
