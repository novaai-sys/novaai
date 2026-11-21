import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ipHash, sameSite } from "@/lib/dispatcher/request";

/**
 * POST /api/demo/web-call
 *
 * Starts a "Talk to Jessica" demo call from the landing page.
 *
 * 1. Checks the request comes from our own site.
 * 2. Claims a demo call within the limits (Supabase claim_demo_call):
 *    DEMO_CALLS_PER_IP per visitor (default 10) and DEMO_CALLS_PER_DAY for
 *    the whole site (default 300), both over the last 24 hours.
 * 3. Creates the web call at Retell (POST /v3/create-web-call) with the
 *    secret RETELL_API_KEY and RETELL_DEMO_AGENT_ID.
 * 4. Returns the connection details. The browser then connects its audio
 *    straight to Retell with RetellWebClient.startCall().
 *
 * If Retell refuses or can't be reached, the claim is given back, so a
 * failed attempt never uses up a visitor's demo calls.
 */

const RETELL_API = () =>
  (process.env.RETELL_API_BASE_URL || "https://api.retellai.com").replace(/\/$/, "");

const fail = (status: number, code: string, error: string) =>
  NextResponse.json({ error, code }, { status, headers: { "Cache-Control": "no-store" } });

const limit = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

export async function POST(req: Request) {
  const key = process.env.RETELL_API_KEY;
  const agentId = process.env.RETELL_DEMO_AGENT_ID;
  if (!key || !agentId) {
    console.error("[demo] RETELL_API_KEY or RETELL_DEMO_AGENT_ID is not set");
    return fail(503, "not_configured", "The live demo is not set up yet.");
  }

  if (!sameSite(req)) {
    return fail(403, "forbidden", "Demo calls can only start from getnovaai.app.");
  }

  const perIp = limit("DEMO_CALLS_PER_IP", 10);
  const perDay = limit("DEMO_CALLS_PER_DAY", 300);
  const hash = ipHash(req);
  if (!hash) console.warn("[demo] no client IP header; applying the daily limit only");

  const db = createAdminClient();
  // Unknown IPs share no per-visitor bucket: only the daily limit applies.
  const bucket = hash ?? `anon-${crypto.randomUUID()}`;

  const { data: verdict, error: claimError } = await db.rpc("claim_demo_call", {
    p_ip_hash: bucket,
    p_per_ip: perIp,
    p_per_day: perDay,
  });
  if (claimError) {
    console.error("[demo] claim_demo_call failed", claimError);
    return fail(500, "server_error", "The demo couldn't start. Please try again.");
  }
  if (verdict === "ip_limit") {
    return fail(
      429,
      "ip_limit",
      `You've used your ${perIp} demo calls for today. Start a free trial to hear Jessica on your own number.`,
    );
  }
  if (verdict === "daily_limit") {
    return fail(429, "daily_limit", "The demo line is busy today. Please try again tomorrow.");
  }

  // From here on, a failure gives the claim back.
  const release = async () => {
    const { data } = await db
      .from("demo_calls")
      .select("id")
      .eq("ip_hash", bucket)
      .order("created_at", { ascending: false })
      .limit(1);
    const id = data?.[0]?.id;
    if (id != null) await db.from("demo_calls").delete().eq("id", id);
  };

  let res: Response;
  try {
    res = await fetch(`${RETELL_API()}/v3/create-web-call`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ agent_id: agentId, metadata: { source: "landing_demo" } }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    console.error("[demo] Retell unreachable", e);
    await release();
    return fail(502, "retell_error", "The demo couldn't connect. Please try again.");
  }

  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !body || typeof body.access_token !== "string") {
    console.error("[demo] Retell create-web-call", res.status, JSON.stringify(body)?.slice(0, 400));
    await release();
    const hint =
      res.status === 401 || res.status === 403
        ? "The demo isn't set up correctly yet. Please try again later."
        : res.status === 404
          ? "The demo agent wasn't found. Please try again later."
          : "The demo couldn't connect. Please try again.";
    return fail(502, "retell_error", hint);
  }

  // Only what the browser needs to connect its audio to Retell.
  return NextResponse.json(
    {
      accessToken: body.access_token,
      callId: body.call_id,
      transport: body.transport,
      url: body.url,
      iceServers: body.ice_servers,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
