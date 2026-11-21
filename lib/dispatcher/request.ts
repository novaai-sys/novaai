import "server-only";
import { createHmac } from "node:crypto";

/** The visitor's IP address as Netlify (or a local proxy) reports it. */
export function clientIp(req: Request) {
  const h = req.headers;
  return (
    h.get("x-nf-client-connection-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * A keyed hash of the visitor's IP, so limits work per visitor without
 * storing the address itself.
 */
export function ipHash(req: Request) {
  const salt =
    process.env.RETELL_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "novaai";
  return createHmac("sha256", salt).update(clientIp(req)).digest("hex").slice(0, 32);
}
