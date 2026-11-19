import { withUser } from "@/lib/reviews/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { PipelineError, loadUsage } from "@/lib/reviews/process";
import { LOCATION_COLUMNS, syncDeadline, syncLocations, type LocationRow } from "@/lib/reviews/sync";

/**
 * POST /api/reviews/sync   ("Sync now" in the dashboard)
 * Runs the same sync as the background job, for the signed-in user's
 * locations only. Returns the sync result and the user's plan usage.
 */
export async function POST() {
  return withUser(async (ctx) => {
    const db = createAdminClient();
    const { data: locations } = await db
      .from("locations")
      .select(LOCATION_COLUMNS)
      .eq("user_id", ctx.userId)
      .order("last_synced_at", { ascending: true, nullsFirst: true });
    if (!locations?.length) {
      throw new PipelineError("Connect a Google Business Profile location first.", 409);
    }

    const result = await syncLocations(db, locations as LocationRow[], syncDeadline());
    return { ...result, credits: await loadUsage(ctx) };
  });
}
