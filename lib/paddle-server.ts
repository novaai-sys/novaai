import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** How old a webhook signature may be before it is refused, in seconds. */
const SIGNATURE_TOLERANCE_S = 5 * 60;

/**
 * Checks a Paddle-Signature header ("ts=...;h1=...") against the raw body.
 * Paddle signs `${ts}:${rawBody}` with HMAC-SHA256 (hex). Several h1 values
 * can appear while a secret is being rotated; any match is accepted.
 */
export function verifyPaddleSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowS = Math.floor(Date.now() / 1000),
): boolean {
  if (!header || !secret) return false;

  let ts: string | null = null;
  const h1: string[] = [];
  for (const part of header.split(";")) {
    const [k, v] = part.split("=", 2).map((s) => s?.trim());
    if (k === "ts" && v) ts = v;
    if (k === "h1" && v) h1.push(v);
  }
  if (!ts || !/^\d+$/.test(ts) || h1.length === 0) return false;
  if (Math.abs(nowS - Number(ts)) > SIGNATURE_TOLERANCE_S) return false;

  const expected = Buffer.from(
    createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex"),
  );
  return h1.some((sig) => {
    const given = Buffer.from(sig);
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

/** Base URL of the Paddle API for the configured environment. */
export function paddleApiBase() {
  if (process.env.PADDLE_API_BASE_URL) return process.env.PADDLE_API_BASE_URL;
  return process.env.NEXT_PUBLIC_PADDLE_ENV === "sandbox"
    ? "https://sandbox-api.paddle.com"
    : "https://api.paddle.com";
}

/** Calls the Paddle API with PADDLE_API_KEY. Throws with Paddle's message on failure. */
export async function paddleApi<T = unknown>(
  path: string,
  init: { method: string; body?: unknown },
): Promise<T> {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) throw new Error("PADDLE_API_KEY is missing on the server.");

  const res = await fetch(`${paddleApiBase()}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = json?.error?.detail ?? json?.error?.code ?? res.statusText;
    throw new Error(`Paddle returned ${res.status}: ${detail}`);
  }
  return json as T;
}
