import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ipHash } from "@/lib/dispatcher/request";

/**
 * POST /api/demo/retell/v3/create-web-call
 *
 * Server side of the "Talk to Jessica" demo on the landing page. The browser
 * SDK (retell-client-js-sdk) is pointed here with baseURL, so it sends the
 * same request it would send to Retell. This route:
 *   - ignores the agent in the request and always uses RETELL_DEMO_AGENT_ID,
 *   - limits demo calls per visitor and per day (Supabase claim_demo_call),
 *   - adds the secret RETELL_API_KEY and forwards to Retell.
 * The key never reaches the browser.
 *
 * Limits: DEMO_CALLS_PER_IP (default 3) and DEMO_CALLS_PER_DAY (default 150),
 * both over the last 24 hours. Set the agent's maximum call duration in
 * Retell too (3 minutes is plenty for a demo).
 */

const RETELL_API = () =>
  (process.env.RETELL_API_BASE_URL || "https://api.retellai.com").replace(/\/$/, "");

const fail = (status: number, code: string, error: string) =>
  NextResponse.json({ error, code }, { status });

export async function POST(req: Request) {
  const key = process.env.RETELL_API_KEY;
  const agentId = process.env.RETELL_DEMO_AGENT_ID;
  if (!key || !agentId) {
    return fail(503, "not_configured", "The live demo is not set up yet.");
  }

  // Only accept the call from our own pages.
  const origin = req.headers.get("origin");
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (origin && site && new URL(site).origin !== origin && !origin.startsWith("http://localhost")) {
    return fail(403, "forbidden", "Demo calls can only start from getnovaai.app.");
  }

  const perIp = Number(process.env.DEMO_CALLS_PER_IP) || 3;
  const perDay = Number(process.env.DEMO_CALLS_PER_DAY) || 150;

  let verdict: string;
  try {
    const db = createAdminClient();
    const { data, error } = await db.rpc("claim_demo_call", {
      p_ip_hash: ipHash(req),
      p_per_ip: perIp,
      p_per_day: perDay,
    });
    if (error) throw error;
    verdict = String(data);
  } catch (e) {
    console.error("[demo] claim_demo_call failed", e);
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

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  };
  const sdkVersion = req.headers.get("x-retell-client-js-sdk-version");
  if (sdkVersion) headers["X-Retell-Client-JS-SDK-Version"] = sdkVersion;

  let upstream: Response;
  try {
    upstream = await fetch(`${RETELL_API()}/v3/create-web-call`, {
      method: "POST",
      headers,
      body: JSON.stringify({ agent_id: agentId, metadata: { source: "landing_demo" } }),
    });
  } catch (e) {
    console.error("[demo] Retell unreachable", e);
    return fail(502, "retell_error", "The demo couldn't connect. Please try again.");
  }

  const text = await upstream.text();
  if (!upstream.ok) console.error("[demo] Retell", upstream.status, text.slice(0, 300));

  const out = new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") || "application/json" },
  });
  // Pass through Retell's SDK version headers so the SDK can check itself.
  upstream.headers.forEach((v, k) => {
    if (k.toLowerCase().startsWith("x-retell")) out.headers.set(k, v);
  });
  return out;
}
