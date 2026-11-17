import { withUser } from "@/lib/reviews/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { accessTokenFor, listRecentReviews } from "@/lib/google/business";
import { PipelineError, loadUsage, processNewReview } from "@/lib/reviews/process";

/** Most new reviews handled per sync, to bound time and OpenAI cost. */
const MAX_NEW_PER_SYNC = 20;

/**
 * POST /api/reviews/sync
 *
 * Fetches the newest reviews of each connected location and sends every
 * review that has no reply yet, and that NovaAI has not seen, through the
 * pipeline. When the plan does not allow another reply, the review is saved
 * without a draft so the owner still sees it.
 *
 * Returns { imported, generated, skippedForLimit, errors }.
 */
export async function POST() {
  return withUser(async (ctx) => {
    const { data: locations } = await ctx.supabase
      .from("locations")
      .select("id, google_account_id, google_location_id")
      .eq("user_id", ctx.userId);
    if (!locations?.length) {
      throw new PipelineError("Connect a Google Business Profile location first.", 409);
    }

    const db = createAdminClient();
    const { data: conn } = await db
      .from("google_connections")
      .select("refresh_token_encrypted")
      .eq("user_id", ctx.userId)
      .limit(1);
    if (!conn?.[0]) throw new PipelineError("Google is not connected.", 409);

    let accessToken: string;
    try {
      accessToken = await accessTokenFor(conn[0].refresh_token_encrypted);
    } catch (e) {
      throw new PipelineError(
        `Google access has expired or was removed. Reconnect Google. (${e instanceof Error ? e.message : e})`,
        409,
      );
    }

    let imported = 0;
    let generated = 0;
    let skippedForLimit = 0;
    const errors: string[] = [];

    for (const loc of locations) {
      let reviews;
      try {
        reviews = await listRecentReviews(accessToken, loc.google_account_id, loc.google_location_id);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
        continue;
      }

      const unanswered = reviews.filter((r) => !r.hasReply);
      if (unanswered.length === 0) continue;

      const { data: known } = await ctx.supabase
        .from("reviews")
        .select("google_review_name")
        .in("google_review_name", unanswered.map((r) => r.name));
      const seen = new Set((known ?? []).map((k) => k.google_review_name));

      for (const r of unanswered.filter((r) => !seen.has(r.name))) {
        if (imported >= MAX_NEW_PER_SYNC) break;
        imported++;
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
          await ctx.supabase.from("reviews").insert({
            user_id: ctx.userId,
            reviewer_name: input.reviewerName,
            rating: input.rating,
            review_text: input.reviewText,
            ai_reply: null,
            status: "pending_approval",
            location_id: loc.id,
            google_review_name: r.name,
            created_at: r.createTime,
          });
          skippedForLimit++;
          continue;
        }

        try {
          await processNewReview(ctx, input);
          generated++;
        } catch (e) {
          errors.push(e instanceof Error ? e.message : String(e));
        }
      }

      await db
        .from("locations")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", loc.id);
    }

    return { imported, generated, skippedForLimit, errors, credits: await loadUsage(ctx) };
  });
}
