import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyRetellSignature, type RetellCall } from "@/lib/dispatcher/retell-webhook";
import { BUSINESS_COLUMNS, describeCall, runPostCall, type Business } from "@/lib/dispatcher/post-call";

/**
 * POST /api/webhooks/retell
 *
 * Retell calls this when a call starts, ends and has been analyzed.
 *
 * - call_ended: saves the call in `calls`, linked to the business that owns
 *   the agent and to that business's client account (user_id).
 * - call_analyzed: saves the analysis (summary, sentiment, outcome), then
 *   runs the follow-ups in lib/dispatcher/post-call.ts: text and email the
 *   owner with a link to the call in the dashboard, and text the caller a
 *   confirmation or follow-up if the business turned that on.
 *
 * The business is the `businesses` row whose retell_agent_id matches the
 * call's agent. With no row, the owner text goes to OWNER_SMS_TO and the
 * email to OWNER_EMAIL_TO, and the caller is never texted.
 *
 * The request must carry a valid X-Retell-Signature, made with
 * RETELL_WEBHOOK_KEY or, if that isn't set, RETELL_API_KEY. When a follow-up
 * fails in a way that may succeed later, the route answers 502 so Retell
 * retries; follow-ups already sent are never repeated.
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
    user_id: business?.user_id ?? null,
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
    const info = describeCall(call);
    row.summary = call.call_analysis.call_summary ?? "";
    row.analysis = call.call_analysis;
    row.outcome = info.outcome;
    row.customer_name = info.customerName;
    row.user_sentiment = call.call_analysis.user_sentiment ?? "";
    row.call_successful = typeof call.call_analysis.call_successful === "boolean" ? call.call_analysis.call_successful : null;
    row.in_voicemail = typeof call.call_analysis.in_voicemail === "boolean" ? call.call_analysis.in_voicemail : null;
  }

  const { error: saveError } = await db.from("calls").upsert(row, { onConflict: "call_id" });
  if (saveError) {
    console.error("[retell-webhook] could not save call", saveError);
    return NextResponse.json({ error: "Could not save call" }, { status: 500 });
  }

  if (event === "call_ended") return ok({ saved: call.call_id });

  const results = await runPostCall(db, call, business);
  const retry = Object.entries(results).filter(([, r]) => r.state === "failed" && r.retryable);
  for (const [channel, r] of Object.entries(results)) {
    if (r.state === "failed") console.error(`[retell-webhook] ${channel} failed:`, r.error);
  }
  if (retry.length) {
    return NextResponse.json({ error: "Some follow-ups failed, retry", results }, { status: 502 });
  }
  return ok({ results });
}

async function findBusiness(db: Db, agentId?: string) {
  if (!agentId) return null;
  const { data, error } = await db
    .from("businesses")
    .select(BUSINESS_COLUMNS)
    .eq("retell_agent_id", agentId)
    .maybeSingle();
  if (error) console.error("[retell-webhook] business lookup failed", error);
  return (data as Business | null) ?? null;
}
