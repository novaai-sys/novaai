import { NextResponse } from "next/server";

/**
 * GET /api/health
 *
 * Shows which environment variables the running Worker can see: true or
 * false per name, never the values. Use it after a deploy to check the
 * Cloudflare configuration.
 */

const CHECK = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "PADDLE_API_KEY",
  "PADDLE_WEBHOOK_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_TOKEN_ENCRYPTION_KEY",
  "CRON_SECRET",
  "RETELL_API_KEY",
  "RETELL_DEMO_AGENT_ID",
  "TELNYX_API_KEY",
  "TELNYX_FROM_NUMBER",
  "OWNER_SMS_TO",
];

export function GET() {
  const env = Object.fromEntries(CHECK.map((n) => [n, Boolean(process.env[n]?.trim())]));
  const missing = CHECK.filter((n) => !env[n]);
  return NextResponse.json(
    { ok: missing.length === 0, missing, env },
    { headers: { "Cache-Control": "no-store" } },
  );
}
