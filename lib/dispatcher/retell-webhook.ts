import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** Retell signs webhooks within this window; older ones are rejected. */
const MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Verifies Retell's X-Retell-Signature header: "v=<unix ms>,d=<hex>", where
 * the digest is HMAC-SHA256(rawBody + timestamp) keyed with the Retell API
 * key that has the webhook badge in the Retell dashboard.
 */
export function verifyRetellSignature(
  rawBody: string,
  header: string | null,
  apiKey: string,
  now = Date.now(),
) {
  if (!header || !apiKey) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const ts = parts.v;
  const digest = parts.d;
  if (!ts || !digest || !/^\d+$/.test(ts) || !/^[0-9a-f]+$/i.test(digest)) return false;
  if (Math.abs(now - Number(ts)) > MAX_AGE_MS) return false;

  const expected = createHmac("sha256", apiKey).update(rawBody + ts).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(digest, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The parts of Retell's call object NovaAI uses. */
export type RetellCall = {
  call_id: string;
  call_type?: string;
  agent_id?: string;
  direction?: string;
  from_number?: string;
  to_number?: string;
  start_timestamp?: number;
  end_timestamp?: number;
  duration_ms?: number;
  disconnection_reason?: string;
  transcript?: string;
  recording_url?: string;
  metadata?: Record<string, unknown>;
  call_analysis?: {
    call_summary?: string;
    user_sentiment?: string;
    call_successful?: boolean;
    in_voicemail?: boolean;
    custom_analysis_data?: Record<string, unknown>;
  };
};
