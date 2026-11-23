import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { RetellCall } from "./retell-webhook";
import { buildJobText, prettyPhone, sendTelnyxSms, str, TelnyxError, yes } from "./sms";
import { EmailError, emailConfigured, ownerEmail, sendEmail } from "./email";
import {
  DEFAULT_BOOKED_TEMPLATE,
  DEFAULT_FOLLOWUP_TEMPLATE,
  gsm,
  renderTemplate,
  toE164,
} from "./templates";

/**
 * What happens after Retell has analyzed a call: three follow-ups, each
 * recorded on the `calls` row with its own status column.
 *
 *   owner text   sms_*         job details + link to the call page
 *   owner email  email_*       the same, with the AI summary
 *   caller text  caller_sms_*  booking confirmation or follow-up, from the
 *                              business's template (only if turned on)
 *
 * Each one is claimed (pending/failed -> sending) before sending, so a
 * repeated webhook never sends twice. A failure that could succeed later
 * (network, 5xx, 429) is reported as retryable, so the webhook can ask Retell
 * to try again; the ones already sent are not repeated.
 */

type Db = ReturnType<typeof createAdminClient>;

export type Business = {
  id: string;
  user_id: string | null;
  name: string;
  owner_phone: string | null;
  sms_enabled: boolean;
  notify_email: string | null;
  email_enabled: boolean;
  caller_sms_enabled: boolean;
  caller_sms_booked_template: string | null;
  caller_sms_followup_template: string | null;
  followup_link: string;
};

export const BUSINESS_COLUMNS =
  "id, user_id, name, owner_phone, sms_enabled, notify_email, email_enabled, caller_sms_enabled, caller_sms_booked_template, caller_sms_followup_template, followup_link";

export type Outcome = "booked" | "lead" | "hang_up" | "spam" | "voicemail";

/** The facts NovaAI keeps about a call, from Retell's post-call analysis. */
export function describeCall(call: RetellCall) {
  const a = call.call_analysis?.custom_analysis_data ?? {};
  const name = gsm(str(a.customer_name));
  const hasInfo = Boolean(
    name || str(a.service_address) || str(a.issue) || str(a.callback_number) || call.call_analysis?.call_summary,
  );
  const short = (call.duration_ms ?? 0) < 15000;
  const outcome: Outcome = call.call_analysis?.in_voicemail
    ? "voicemail"
    : yes(a.is_spam)
      ? "spam"
      : yes(a.job_booked)
        ? "booked"
        : !hasInfo && short
          ? "hang_up"
          : "lead";
  return {
    outcome,
    customerName: name,
    emergency: str(a.urgency).toLowerCase() === "emergency",
    // A number the caller gave beats caller ID (it may be their mobile).
    callerNumber: toE164(str(a.callback_number)) || toE164(call.from_number ?? ""),
    // Retell field "text_ok": false when the caller said not to text them.
    // Missing or blank means they didn't object.
    textOk:
      typeof a.text_ok === "boolean"
        ? a.text_ok
        : str(a.text_ok) === ""
          ? true
          : !/^(false|no|n|0)$/i.test(str(a.text_ok)),
    values: {
      name,
      when: str(a.time_window),
      issue: str(a.issue),
      address: str(a.service_address),
      phone: call.to_number ? prettyPhone(call.to_number) : "",
    },
  };
}

export const callUrl = (callId: string) =>
  `${(process.env.NEXT_PUBLIC_SITE_URL || "https://getnovaai.app").replace(/\/$/, "")}/dashboard/calls/${encodeURIComponent(callId)}`;

type Columns = { status: string; to: string; body: string; id: string; error: string };
const OWNER_SMS: Columns = { status: "sms_status", to: "sms_to", body: "sms_body", id: "sms_message_id", error: "sms_error" };
const CALLER_SMS: Columns = {
  status: "caller_sms_status",
  to: "caller_sms_to",
  body: "caller_sms_body",
  id: "caller_sms_message_id",
  error: "caller_sms_error",
};
const OWNER_EMAIL: Columns = {
  status: "email_status",
  to: "email_to",
  body: "email_subject",
  id: "email_message_id",
  error: "email_error",
};

export type Result =
  | { state: "sent"; id: string }
  | { state: "skipped"; reason: string }
  | { state: "already" }
  | { state: "failed"; error: string; retryable: boolean };

async function skip(db: Db, callId: string, c: Columns, reason: string): Promise<Result> {
  await db
    .from("calls")
    .update({ [c.status]: "skipped", [c.error]: reason })
    .eq("call_id", callId)
    .eq(c.status, "pending");
  return { state: "skipped", reason };
}

async function deliver(
  db: Db,
  callId: string,
  c: Columns,
  to: string,
  body: string,
  send: () => Promise<string>,
): Promise<Result> {
  const { data, error } = await db
    .from("calls")
    .update({ [c.status]: "sending", [c.to]: to, [c.body]: body, [c.error]: "" })
    .eq("call_id", callId)
    .in(c.status, ["pending", "failed"])
    .select("call_id");
  if (error) return { state: "failed", error: `claim: ${error.message}`, retryable: true };
  if (!data?.length) return { state: "already" };

  try {
    const id = await send();
    await db.from("calls").update({ [c.status]: "sent", [c.id]: id }).eq("call_id", callId);
    return { state: "sent", id };
  } catch (e) {
    const err = e as TelnyxError | EmailError;
    const message = (err?.message || String(e)).slice(0, 500);
    const retryable = typeof err?.retryable === "boolean" ? err.retryable : true;
    await db.from("calls").update({ [c.status]: "failed", [c.error]: message }).eq("call_id", callId);
    return { state: "failed", error: message, retryable };
  }
}

/** Runs the three follow-ups for an analyzed call. */
export async function runPostCall(db: Db, call: RetellCall, business: Business | null) {
  const id = call.call_id;
  const info = describeCall(call);
  const businessName = business?.name || process.env.OWNER_BUSINESS_NAME || "your line";
  const url = callUrl(id);
  const results: Record<"ownerSms" | "ownerEmail" | "callerSms", Result> = {} as never;

  // Nothing to follow up on.
  const demoAgent = process.env.RETELL_DEMO_AGENT_ID;
  const noFollowUp =
    call.call_type === "web_call" || (demoAgent && call.agent_id === demoAgent)
      ? "demo call"
      : info.outcome === "hang_up"
        ? "hang-up with no details"
        : info.outcome === "spam"
          ? "spam or sales call"
          : info.outcome === "voicemail"
            ? "reached voicemail"
            : "";
  if (noFollowUp) {
    results.ownerSms = await skip(db, id, OWNER_SMS, noFollowUp);
    results.ownerEmail = await skip(db, id, OWNER_EMAIL, noFollowUp);
    results.callerSms = await skip(db, id, CALLER_SMS, noFollowUp);
    return results;
  }

  const from = process.env.TELNYX_FROM_NUMBER || call.to_number || "";

  // 1. Text the owner.
  const ownerPhone = business ? business.owner_phone : process.env.OWNER_SMS_TO || null;
  if (business && !business.sms_enabled) results.ownerSms = await skip(db, id, OWNER_SMS, "owner texts turned off");
  else if (!ownerPhone) results.ownerSms = await skip(db, id, OWNER_SMS, "no owner phone set");
  else if (!from) results.ownerSms = await skip(db, id, OWNER_SMS, "no number to send from: set TELNYX_FROM_NUMBER");
  else {
    const text = buildJobText(call, businessName, url);
    results.ownerSms = await deliver(db, id, OWNER_SMS, ownerPhone, text.body, () =>
      sendTelnyxSms({ from, to: ownerPhone, text: text.body }),
    );
  }

  // 2. Email the owner.
  const ownerEmailTo = business ? business.notify_email : process.env.OWNER_EMAIL_TO || null;
  if (business && !business.email_enabled) results.ownerEmail = await skip(db, id, OWNER_EMAIL, "owner emails turned off");
  else if (!ownerEmailTo) results.ownerEmail = await skip(db, id, OWNER_EMAIL, "no notification email set");
  else if (!emailConfigured()) results.ownerEmail = await skip(db, id, OWNER_EMAIL, "email not set up (RESEND_API_KEY / NOTIFY_EMAIL_FROM)");
  else {
    const who = info.customerName || (info.callerNumber ? prettyPhone(info.callerNumber) : "a caller");
    const head = info.outcome === "booked" ? "New job booked" : "New lead";
    const subject = `${info.emergency ? "EMERGENCY - " : ""}${head}: ${who}`;
    const mail = ownerEmail({
      business: businessName,
      headline: `${head}${info.emergency ? " (emergency)" : ""} - ${businessName}`,
      rows: [
        ["Caller", [info.customerName, info.callerNumber && prettyPhone(info.callerNumber)].filter(Boolean).join(", ")],
        ["Address", info.values.address],
        ["Issue", info.values.issue],
        ["When", info.values.when],
      ],
      summary: gsm(call.call_analysis?.call_summary ?? ""),
      url,
    });
    results.ownerEmail = await deliver(db, id, OWNER_EMAIL, ownerEmailTo, subject, () =>
      sendEmail({ to: ownerEmailTo, subject, html: mail.html, text: mail.text }),
    );
  }

  // 3. Text the caller (only when the business turned it on).
  const callerTemplate =
    info.outcome === "booked"
      ? business?.caller_sms_booked_template || DEFAULT_BOOKED_TEMPLATE
      : business?.caller_sms_followup_template || DEFAULT_FOLLOWUP_TEMPLATE;
  const callerText = renderTemplate(callerTemplate, {
    ...info.values,
    business: businessName,
    link: business?.followup_link ?? "",
  });
  if (!business?.caller_sms_enabled) results.callerSms = await skip(db, id, CALLER_SMS, "caller texts turned off");
  else if (!info.textOk) results.callerSms = await skip(db, id, CALLER_SMS, "caller asked not to be texted");
  else if (!info.callerNumber) results.callerSms = await skip(db, id, CALLER_SMS, "no caller number");
  else if (info.callerNumber === toE164(from) || info.callerNumber === toE164(ownerPhone ?? ""))
    results.callerSms = await skip(db, id, CALLER_SMS, "caller is the business itself");
  else if (!from) results.callerSms = await skip(db, id, CALLER_SMS, "no number to send from: set TELNYX_FROM_NUMBER");
  else if (!callerText) results.callerSms = await skip(db, id, CALLER_SMS, "template is empty");
  else {
    const to = info.callerNumber;
    results.callerSms = await deliver(db, id, CALLER_SMS, to, callerText, () =>
      sendTelnyxSms({ from, to, text: callerText }),
    );
  }

  return results;
}
