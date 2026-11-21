import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { googleConfigured } from "@/lib/google/business";
import { LOCATION_COLUMNS, syncDeadline, syncLocations, type LocationRow } from "@/lib/reviews/sync";

/**
 * POST (or GET) /api/cron/sync-reviews
 * Header: Authorization: Bearer <CRON_SECRET>
 *
 * The background worker. Syncs every connected location, oldest sync first,
 * for up to SYNC_TIME_BUDGET_MS (default 4 s), then returns. `more: true` means work is
 * left; the scheduled function calls again, and the next run continues.
 *
 * Called every 15 minutes by the Cloudflare Cron Trigger in custom-worker.ts. Any other
 * scheduler (cron-job.org, GitHub Actions) can call it the same way.
 */

const MAX_LOCATIONS_PER_RUN = 100;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < 16) return false;
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function run(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Send Authorization: Bearer <CRON_SECRET> (at least 16 characters)." },
      { status: 401 },
    );
  }
  if (!googleConfigured()) {
    return NextResponse.json({ error: "Google is not configured on the server." }, { status: 500 });
  }

  const started = Date.now();
  const deadline = syncDeadline(started);
  const db = createAdminClient();

  // Only locations whose Google connection is healthy.
  const { data: healthy } = await db
    .from("google_connections")
    .select("id")
    .eq("status", "active");
  const ok = new Set((healthy ?? []).map((c) => c.id));

  const { data: locations, error } = await db
    .from("locations")
    .select(LOCATION_COLUMNS)
    .order("last_synced_at", { ascending: true, nullsFirst: true })
    .limit(MAX_LOCATIONS_PER_RUN);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const todo = ((locations ?? []) as LocationRow[]).filter((l) => ok.has(l.connection_id));
  const result = await syncLocations(db, todo, deadline);
  if (result.errors.length) console.warn("[cron] sync errors:", result.errors);

  return NextResponse.json({ ok: true, ...result, durationMs: Date.now() - started });
}

export const POST = run;
export const GET = run;
