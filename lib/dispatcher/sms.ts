import "server-only";
import type { RetellCall } from "./retell-webhook";

/**
 * Builds the job text for the business owner from Retell's post-call
 * analysis. The fields come from the agent's Post-Call Analysis settings:
 * customer_name, callback_number, service_address, issue, urgency,
 * time_window, job_booked. Missing ones are left out.
 */

const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

/** Plain GSM characters, so a text isn't split into many short segments. */
function gsm(s: string) {
  return s
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”‟]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/[   ]/g, " ")
    .replace(/[^\x0A\x0D\x20-\x7E£¥èéùìòÇØøÅåÄÖÑÜ§¿äöñüà]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 3).trimEnd()}...` : s);

/** +15125550148 -> (512) 555-0148; other numbers unchanged. */
export function prettyPhone(n: string) {
  const d = n.replace(/\D/g, "");
  const us = d.length === 11 && d.startsWith("1") ? d.slice(1) : d.length === 10 ? d : "";
  return us ? `(${us.slice(0, 3)}) ${us.slice(3, 6)}-${us.slice(6)}` : n;
}

/** True for answers like "true", "yes", "booked". */
function yes(v: unknown) {
  if (typeof v === "boolean") return v;
  return /^(true|yes|y|booked|confirmed)$/i.test(str(v));
}

const URGENCY: Record<string, string> = {
  emergency: "EMERGENCY",
  today: "Today",
  this_week: "This week",
  not_urgent: "Not urgent",
};

export type JobText = { body: string; hasInfo: boolean };

export function buildJobText(call: RetellCall, businessName: string): JobText {
  const a = call.call_analysis?.custom_analysis_data ?? {};
  const name = gsm(str(a.customer_name));
  const callback = str(a.callback_number) || str(call.from_number);
  const address = gsm(str(a.service_address));
  const issue = gsm(str(a.issue));
  const when = gsm(str(a.time_window));
  const urgencyKey = str(a.urgency).toLowerCase().replace(/\s+/g, "_");
  const urgency = URGENCY[urgencyKey] ?? gsm(str(a.urgency));
  const booked = yes(a.job_booked);
  const summary = gsm(str(call.call_analysis?.call_summary));

  const hasInfo = Boolean(name || address || issue || str(a.callback_number));

  const head = booked ? "New job booked" : "New lead (not booked)";
  const flag = urgency === "EMERGENCY" ? " - EMERGENCY" : "";
  const lines = [`NovaAI: ${head}${flag} - ${clip(gsm(businessName), 40)}`];
  if (name) lines.push(clip(name, 60));
  if (callback) lines.push(prettyPhone(callback));
  if (address) lines.push(clip(address, 90));
  if (issue) lines.push(`Issue: ${clip(issue, 110)}`);
  if (urgency && urgency !== "EMERGENCY") lines.push(`Urgency: ${clip(urgency, 30)}`);
  if (when) lines.push(`When: ${clip(when, 50)}`);
  // No structured details: fall back to Retell's summary of the call.
  if (!issue && summary) lines.push(clip(summary, 220));

  return { body: lines.join("\n"), hasInfo: hasInfo || Boolean(summary) };
}

export class TelnyxError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
  /** 5xx and network errors are worth retrying; 4xx (bad number, unregistered) are not. */
  get retryable() {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }
}

/** Sends one SMS with Telnyx's Messaging API (POST /v2/messages). */
export async function sendTelnyxSms(opts: { from: string; to: string; text: string }) {
  const key = process.env.TELNYX_API_KEY;
  if (!key) throw new TelnyxError("TELNYX_API_KEY is not set", 400);
  const base = (process.env.TELNYX_API_BASE_URL || "https://api.telnyx.com").replace(/\/$/, "");
  const body: Record<string, string> = { from: opts.from, to: opts.to, text: opts.text };
  if (process.env.TELNYX_MESSAGING_PROFILE_ID) {
    body.messaging_profile_id = process.env.TELNYX_MESSAGING_PROFILE_ID;
  }

  let res: Response;
  try {
    res = await fetch(`${base}/v2/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(6000),
    });
  } catch (e) {
    throw new TelnyxError(`Telnyx unreachable: ${(e as Error).message}`, 0);
  }
  const json = (await res.json().catch(() => ({}))) as {
    data?: { id?: string };
    errors?: { code?: string; title?: string; detail?: string }[];
  };
  if (!res.ok) {
    const e = json.errors?.[0];
    const msg = [e?.code, e?.title, e?.detail].filter(Boolean).join(" - ") || `HTTP ${res.status}`;
    throw new TelnyxError(msg, res.status);
  }
  return json.data?.id ?? "";
}
