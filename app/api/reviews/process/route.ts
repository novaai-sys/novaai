import { withUser } from "@/lib/reviews/http";
import {
  MAX_REVIEW_CHARS,
  PipelineError,
  processNewReview,
  regenerateReply,
} from "@/lib/reviews/process";

/**
 * POST /api/reviews/process
 *
 *   { reviewerName?, rating, reviewText }   a new (test) review: generate a
 *                                           reply and route it by stars
 *   { reviewId }                            "Regenerate": a new draft for a
 *                                           review waiting for approval
 *
 * Returns { review, credits }. See lib/reviews/process.ts for the rules.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  return withUser(async (ctx) => {
    if (!body || typeof body !== "object") throw new PipelineError("Send a JSON body.", 400);

    if (body.reviewId != null) {
      return regenerateReply(ctx, String(body.reviewId));
    }

    const reviewText = typeof body.reviewText === "string" ? body.reviewText.trim() : "";
    const rating = Number(body.rating);
    if (!reviewText) throw new PipelineError("reviewText is required.", 400);
    if (reviewText.length > MAX_REVIEW_CHARS) {
      throw new PipelineError(`reviewText must be under ${MAX_REVIEW_CHARS} characters.`, 400);
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new PipelineError("rating must be a whole number from 1 to 5.", 400);
    }
    const reviewerName =
      typeof body.reviewerName === "string" && body.reviewerName.trim()
        ? body.reviewerName.trim().slice(0, 80)
        : "A customer";

    return processNewReview(ctx, { reviewerName, rating, reviewText });
  });
}
