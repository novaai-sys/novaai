import "server-only";
import { createHmac } from "node:crypto";

/**
 * The visitor's IP address as Cloudflare (or another proxy) reports it, or
 * null when no proxy header is present.
 */
export function clientIp(req: Request): string | null {
  const h = req.headers;
  const ip =
    h.get("cf-connecting-ip") ||
    h.get("x-nf-client-connection-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "";
  return ip || null;
}

/**
 * A keyed hash of the visitor's IP, so limits work per visitor without
 * storing the address itself. Null when the IP is unknown.
 */
export function ipHash(req: Request): string | null {
  const ip = clientIp(req);
  if (!ip) return null;
  const salt =
    process.env.RETELL_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "novaai";
  return createHmac("sha256", salt).update(ip).digest("hex").slice(0, 32);
}

/** True when the request comes from one of our own pages. */
export function sameSite(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin GETs and server tools send none
  let host: string;
  try {
    host = new URL(origin).host.replace(/^www\./, "");
  } catch {
    return false;
  }
  const allowed = new Set<string>();
  const add = (v?: string | null) => v && allowed.add(v.replace(/^www\./, ""));
  add(req.headers.get("x-forwarded-host"));
  add(req.headers.get("host"));
  for (const u of [process.env.NEXT_PUBLIC_SITE_URL]) {
    try {
      if (u) add(new URL(u).host);
    } catch {}
  }
  return allowed.has(host) || host.startsWith("localhost") || host.startsWith("127.0.0.1");
}
