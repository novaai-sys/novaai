import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ipHash } from "@/lib/dispatcher/request";

/**
 * POST /api/trial-request
 *
 * Saves a free-trial request from the landing page in trial_requests, and,
 * if TRIAL_NOTIFY_WEBHOOK_URL is set, posts it there too (a Discord or Slack
 * incoming webhook, or a Make.com / Zapier webhook) so you hear about it
 * straight away.
 */

const LIMITS = { name: 120, business: 160, email: 200, phone: 40, location: 120, trade: 60, plan: 20, notes: 1000 };
const PER_IP_PER_DAY = 5;

const fail = (status: number, error: string, field?: string) =>
  NextResponse.json({ error, field }, { status });

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, "Send the form as JSON.");
  }

  // Bots fill every field; people never see this one.
  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ ok: true });
  }

  const f = {} as Record<keyof typeof LIMITS, string>;
  for (const [k, max] of Object.entries(LIMITS) as [keyof typeof LIMITS, number][]) {
    const v = typeof body[k] === "string" ? (body[k] as string).trim() : "";
    f[k] = v.slice(0, max);
  }

  if (!f.name) return fail(400, "Enter your name.", "name");
  if (!f.business) return fail(400, "Enter your company name.", "business");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return fail(400, "Enter a valid email address.", "email");
  if (f.phone.replace(/\D/g, "").length < 10) return fail(400, "Enter a phone number with area code.", "phone");

  const hash = ipHash(req) ?? "";
  let db;
  try {
    db = createAdminClient();
  } catch (e) {
    console.error("[trial] not configured", e);
    return fail(500, "Something went wrong. Email support@getnovaai.app and we'll set you up.");
  }

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = hash
    ? await db
        .from("trial_requests")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", hash)
        .gte("created_at", since)
    : { count: 0 };
  if ((count ?? 0) >= PER_IP_PER_DAY) {
    return fail(429, "We already have your request. We'll be in touch within one business day.");
  }

  const { error } = await db.from("trial_requests").insert({ ...f, ip_hash: hash });
  if (error) {
    console.error("[trial] insert failed", error);
    return fail(500, "Something went wrong. Email support@getnovaai.app and we'll set you up.");
  }

  const hook = process.env.TRIAL_NOTIFY_WEBHOOK_URL;
  if (hook) {
    const text =
      `New NovaAI trial request\n${f.name} · ${f.business} (${f.trade || "trade not given"})\n` +
      `${f.email} · ${f.phone} · ${f.location || "location not given"}\nPlan: ${f.plan || "not chosen"}` +
      (f.notes ? `\nNotes: ${f.notes}` : "");
    try {
      await fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // content: Discord, text: Slack; Make/Zapier get every field.
        body: JSON.stringify({ content: text, text, ...f }),
        signal: AbortSignal.timeout(4000),
      });
    } catch (e) {
      console.error("[trial] notify failed", e);
    }
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
