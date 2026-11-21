import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listRecentReviews } from "@/lib/google/business";
import {
  CONNECTION_COLUMNS,
  ReconnectNeeded,
  withGoogleToken,
  type ConnectionRow,
} from "@/lib/google/tokens";
import { loadUsage, processNewReview } from "./process";

/**
 * The sync engine, shared by the background cron and the "Sync now" button.
 *
 * For each location, oldest sync first:
 *   1. claim it (claim_location_sync) so no other run works on it
 *   2. fetch the newest reviews from Google (refreshing the token if needed)
 *   3. every review without an owner reply that NovaAI hasn't seen yet goes
 *      through the review pipeline: 4–5 stars with auto-reply on are
 *      published on Google, everything else is saved as a draft
 *   4. record the result and release the lock
 *
 * Work stops at `deadline` and continues on the next run, so it always fits
 * inside the platform's request time limits.
 */

export const LOCATION_COLUMNS =
  "id, user_id, connection_id, google_account_id, google_location_id, title, last_synced_at";

export type LocationRow = {
  id: string;
  user_id: string;
  connection_id: string;
  google_account_id: string;
  google_location_id: string;
  title: string;
  last_synced_at: string | null;
};

export type SyncResult = {
  locationsChecked: number;
  locationsBusy: number;
  imported: number;
  generated: number;
  postedToGoogle: number;
  savedWithoutDraft: number;
  errors: string[];
  /** True when the time ran out with work left; the next run continues. */
  more: boolean;
};

const LOCK_SECONDS = 120;

export async function syncLocations(
  db: SupabaseClient,
  locations: LocationRow[],
  deadline: number,
): Promise<SyncResult> {
  const result: SyncResult = {
    locationsChecked: 0,
    locationsBusy: 0,
    imported: 0,
    generated: 0,
    postedToGoogle: 0,
    savedWithoutDraft: 0,
    errors: [],
    more: false,
  };

  const connections = new Map<string, ConnectionRow | null>();
  const getConnection = async (id: string) => {
    if (!connections.has(id)) {
      const { data } = await db
        .from("google_connections")
        .select(CONNECTION_COLUMNS)
        .eq("id", id)
        .limit(1);
      connections.set(id, (data?.[0] as ConnectionRow | undefined) ?? null);
    }
    return connections.get(id)!;
  };

  for (const loc of locations) {
    if (Date.now() > deadline) {
      result.more = true;
      break;
    }

    const { data: claimed } = await db.rpc("claim_location_sync", {
      p_location_id: loc.id,
      p_lock_seconds: LOCK_SECONDS,
    });
    if (!claimed) {
      result.locationsBusy++;
      continue;
    }

    let newHere = 0;
    let finished = true;
    let error: string | null = null;

    try {
      const conn = await getConnection(loc.connection_id);
      if (!conn) throw new ReconnectNeeded("Google is not connected.");

      const reviews = await withGoogleToken(db, conn, (token) =>
        listRecentReviews(token, loc.google_account_id, loc.google_location_id),
      );
      const unanswered = reviews.filter((r) => !r.hasReply);

      let unseen = unanswered;
      if (unanswered.length > 0) {
        const { data: known } = await db
          .from("reviews")
          .select("google_review_name")
          .eq("user_id", loc.user_id)
          .in("google_review_name", unanswered.map((r) => r.name));
        const seen = new Set((known ?? []).map((k) => k.google_review_name));
        unseen = unanswered.filter((r) => !seen.has(r.name));
      }

      const ctx = { supabase: db, userId: loc.user_id, service: true };
      for (const r of unseen) {
        if (Date.now() > deadline) {
          finished = false;
          result.more = true;
          break;
        }
        result.imported++;
        newHere++;
        const input = {
          reviewerName: r.reviewerName,
          rating: r.rating,
          reviewText: r.comment,
          locationId: loc.id,
          googleReviewName: r.name,
          createdAt: r.createTime,
        };

        const usage = await loadUsage(ctx);
        if (!usage.canGenerate) {
          // Out of trial replies: keep the review visible, without a draft.
          await db.from("reviews").insert({
            user_id: loc.user_id,
            reviewer_name: input.reviewerName,
            rating: input.rating,
            review_text: input.reviewText,
            ai_reply: null,
            status: "pending_approval",
            location_id: loc.id,
            google_review_name: r.name,
            created_at: r.createTime,
          });
          result.savedWithoutDraft++;
          continue;
        }

        try {
          const { review } = await processNewReview(ctx, input);
          result.generated++;
          if (review.posted_to_google_at) result.postedToGoogle++;
        } catch (e) {
          result.errors.push(`${loc.title || loc.google_location_id}: ${e instanceof Error ? e.message : e}`);
        }
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      result.errors.push(`${loc.title || loc.google_location_id}: ${error}`);
    }

    result.locationsChecked++;
    await db
      .from("locations")
      .update({
        // Only a complete pass counts as synced, so unfinished locations go
        // first next time.
        ...(finished && !error ? { last_synced_at: new Date().toISOString() } : {}),
        last_sync_new: newHere,
        last_sync_error: error,
        sync_locked_until: null,
      })
      .eq("id", loc.id);
  }

  return result;
}

/**
 * Time budget for one run, from SYNC_TIME_BUDGET_MS (default 4 seconds).
 * A review that has started is always finished, so a run can last the budget
 * plus one AI reply. 4 s keeps each call short; the Cloudflare Cron Trigger
 * (custom-worker.ts) calls again, up to 3 times, while there is more to do.
 */
export function syncDeadline(start = Date.now()) {
  const budget = Number(process.env.SYNC_TIME_BUDGET_MS) || 4000;
  return start + budget;
}
