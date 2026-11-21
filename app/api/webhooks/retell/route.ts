import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyRetellSignature, type RetellCall } from "@/lib/dispatcher/retell-webhook";
import { buildJobText, sendTelnyxSms, TelnyxError } from "@/lib/dispatcher/sms";

/**
 * POST /api/webhooks/retell
 *
 * Retell calls this when a call starts, ends and has been analyzed.
 *
 * - call_ended: saves the call in `calls`.
 * - call_analyzed: saves the analysis, then texts the job details to the
 *   business owner with Telnyx (once per call, even if Retell repeats the
 *   webhook).
 *
 * Who gets the text: the `businesses` row whose retell_agent_id matches the
 * call's agent, or OWNER_SMS_TO when no row matches. Texts are sent from
 * TELNYX_FROM_NUMBER, or from the number the customer called.
 *
 * Demo calls from the landing page (web calls, or the agent in
 * RETELL_DEMO_AGENT_ID) are saved but never texted.
 *
 * The request must carry a valid X-Retell-Signature, made with
 * RETELL_WEBHOOK_KEY or, if that isn't set, RETELL_API_KEY.
 */

type Db = ReturnType<typeof createAdminClient>;

const ok = (extra: Record<string, unknown> = {}) => NextResponse.json({ ok: true, ...extra });

const iso = (ms?: number) => (typeof ms === "number" && ms > 0 ? new Date(ms).toISOString() : null);

export async function POST(req: Request) {
  const raw = await req.text();
  const key = process.env.RETELL_WEBHOOK_KEY || process.env.RETELL_API_KEY || "";
  if (!verifyRetellSignature(raw, req.headers.get("x-retell-signature"), key)) {
    console.warn("[retell-webhook] invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: string;
  let call: RetellCall;
  try {
    const parsed = JSON.parse(raw);
    event = String(parsed.event ?? "");
    call = parsed.call;
    if (!call?.call_id) throw new Error("no call_id");
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (event !== "call_ended" && event !== "call_analyzed") return ok({ ignored: event });

  const db = createAdminClient();
  const business = await findBusiness(db, call.agent_id);

  const row: Record<string, unknown> = {
    call_id: call.call_id,
    updated_at: new Date().toISOString(),
    agent_id: call.agent_id ?? "",
    business_id: business?.id ?? null,
    call_type: call.call_type ?? "",
    direction: call.direction ?? "",
    from_number: call.from_number ?? "",
    to_number: call.to_number ?? "",
    started_at: iso(call.start_timestamp),
    ended_at: iso(call.end_timestamp),
    duration_ms: typeof call.duration_ms === "number" ? Math.round(call.duration_ms) : null,
    disconnection_reason: call.disconnection_reason ?? "",
    recording_url: call.recording_url ?? "",
    transcript: (call.transcript ?? "").slice(0, 50000),
  };
  if (call.call_analysis) {
    row.summary = call.call_analysis.call_summary ?? "";
    row.analysis = call.call_analysis;
  }

  const { error: saveError } = await db.from("calls").upsert(row, { onConflict: "call_id" });
  if (saveError) {
    console.error("[retell-webhook] could not save call", saveError);
    return NextResponse.json({ error: "Could not save call" }, { status: 500 });
  }

  if (event === "call_ended") return ok({ saved: call.call_id });

  // ---- call_analyzed: text the owner ----
  const skip = async (reason: string) => {
    await db
      .from("calls")
      .update({ sms_status: "skipped", sms_error: reason })
      .eq("call_id", call.call_id)
      .eq("sms_status", "pending");
    return ok({ sms: "skipped", reason });
  };

  const demoAgent = process.env.RETELL_DEMO_AGENT_ID;
  if (call.call_type === "web_call" || (demoAgent && call.agent_id === demoAgent)) {
    return skip("demo call");
  }
  if (business && !business.sms_enabled) return skip("texts turned off for this business");

  const to = business?.owner_phone || process.env.OWNER_SMS_TO || "";
  if (!to) return skip(`no business for agent ${call.agent_id ?? "?"} and OWNER_SMS_TO not set`);

  const from = process.env.TELNYX_FROM_NUMBER || call.to_number || "";
  if (!from) return skip("no number to send from: set TELNYX_FROM_NUMBER");

  const text = buildJobText(call, business?.name || process.env.OWNER_BUSINESS_NAME || "your line");
  if (!text.hasInfo && (call.duration_ms ?? 0) < 15000) return skip("hang-up with no details");

  // Claim the text, so a repeated webhook can't send it twice.
  const { data: claimed, error: claimError } = await db
    .from("calls")
    .update({ sms_status: "sending", sms_to: to, sms_body: text.body, sms_error: "" })
    .eq("call_id", call.call_id)
    .in("sms_status", ["pending", "failed"])
    .select("call_id");
  if (claimError) {
    console.error("[retell-webhook] claim failed", claimError);
    return NextResponse.json({ error: "Could not claim SMS" }, { status: 500 });
  }
  if (!claimed?.length) return ok({ sms: "already handled" });

  try {
    const id = await sendTelnyxSms({ from, to, text: text.body });
    await db.from("calls").update({ sms_status: "sent", sms_message_id: id }).eq("call_id", call.call_id);
    return ok({ sms: "sent", id });
  } catch (e) {
    const err = e instanceof TelnyxError ? e : new TelnyxError(String(e), 0);
    console.error("[retell-webhook] SMS failed", err.status, err.message);
    await db
      .from("calls")
      .update({ sms_status: "failed", sms_error: err.message.slice(0, 500) })
      .eq("call_id", call.call_id);
    // Ask Retell to retry only when trying again could help.
    if (err.retryable) {
      return NextResponse.json({ error: "SMS failed, retry", detail: err.message }, { status: 502 });
    }
    return ok({ sms: "failed", error: err.message });
  }
}

async function findBusiness(db: Db, agentId?: string) {
  if (!agentId) return null;
  const { data, error } = await db
    .from("businesses")
    .select("id, name, owner_phone, sms_enabled")
    .eq("retell_agent_id", agentId)
    .maybeSingle();
  if (error) console.error("[retell-webhook] business lookup failed", error);
  return data as { id: string; name: string; owner_phone: string; sms_enabled: boolean } | null;
}
