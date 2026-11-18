import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { accountForKey, keyFromRequest } from "@/lib/api-keys";
import { MAX_REVIEW_CHARS, PipelineError, loadUsage, processNewReview } from "@/lib/reviews/process";

/**
 * POST /api/v1/reviews/reply
 *
 * Generates an AI reply for one review, for integrations such as Make.com.
 *
 * Auth:   Authorization: Bearer nova_sk_...   (or X-API-Key: nova_sk_...)
 *         Create keys in the dashboard under Integrations. A key acts for
 *         one NovaAI account: its tone of voice, plan limits and Autopilot.
 *
 * Body (JSON):
 *   review     string   review text; may be empty for rating-only reviews
 *                       (aliases: review_text, comment)
 *   rating     1–5, or "ONE".."FIVE" as Google returns it  (alias: star_rating)
 *   author     string   reviewer's name, optional (aliases: reviewer_name, reviewer)
 *   review_id  string   optional, your unique ID for the review (e.g. Google's
 *                       reviewId). Sending the same ID again returns the
 *                       first reply without generating or charging again.
 *
 * 201 / 200 (duplicate):
 *   { reply, should_post, status, rating, nova_review_id, duplicate, credits }
 *   should_post is true only for 4–5 star reviews with Autopilot on. For
 *   1–3 stars it is always false: the draft waits in the dashboard for the
 *   owner's approval.
 *
 * Errors: { error, code }
 *   401 invalid_api_key · 400 invalid_input · 402 trial_ended | no_credits
 *   502 ai_error · 500 server_error
 */

const STARS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

const fail = (status: number, code: string, error: string, extra: object = {}) =>
  NextResponse.json({ error, code, ...extra }, { status });

const str = (...vals: unknown[]) => {
  for (const v of vals) if (typeof v === "string") return v.trim();
  return "";
};

function parseRating(v: unknown) {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const t = v.trim().toUpperCase();
    return STARS[t] ?? Number(t);
  }
  return NaN;
}

type ReviewRow = {
  id: string;
  ai_reply: string | null;
  status: string;
  rating: number;
};

const body = (r: ReviewRow, duplicate: boolean, credits: unknown) => ({
  reply: r.ai_reply ?? "",
  should_post: r.status === "published",
  status: r.status,
  rating: r.rating,
  nova_review_id: String(r.id),
  duplicate,
  credits,
});

export async function POST(request: Request) {
  // 1. Who is calling?
  const key = keyFromRequest(request);
  if (!key) {
    return fail(401, "invalid_api_key", "Send your NovaAI API key as: Authorization: Bearer nova_sk_...");
  }
  let account;
  try {
    account = await accountForKey(key);
  } catch (e) {
    console.error("[api] key lookup failed:", e);
    return fail(500, "server_error", "The API is not configured on the server.");
  }
  if (!account) return fail(401, "invalid_api_key", "This API key is invalid or has been revoked.");

  // 2. What do they want?
  let input: Record<string, unknown>;
  try {
    input = await request.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error();
  } catch {
    return fail(400, "invalid_input", "Send a JSON object as the request body.");
  }

  const reviewText = str(input.review, input.review_text, input.comment);
  const rating = parseRating(input.rating ?? input.star_rating);
  const reviewerName = str(input.author, input.reviewer_name, input.reviewer).slice(0, 80) || "A customer";
  const externalId = str(input.review_id, input.reviewId).slice(0, 300) || null;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return fail(400, "invalid_input", 'rating must be 1 to 5, or "ONE" to "FIVE".');
  }
  if (reviewText.length > MAX_REVIEW_CHARS) {
    return fail(400, "invalid_input", `review must be under ${MAX_REVIEW_CHARS} characters.`);
  }

  const db = createAdminClient();
  const ctx = { supabase: db, userId: account.userId, service: true };

  // 3. Already handled this review? Return the same reply, free.
  if (externalId) {
    const { data: existing } = await db
      .from("reviews")
      .select("id, ai_reply, status, rating")
      .eq("user_id", account.userId)
      .eq("external_id", externalId)
      .limit(1);
    if (existing?.[0]) {
      return NextResponse.json(body(existing[0], true, await loadUsage(ctx).catch(() => null)));
    }
  }

  // 4. Generate, route by stars, save. Make posts to Google itself.
  try {
    const { review, credits } = await processNewReview(
      ctx,
      { reviewerName, rating, reviewText, source: "api", externalId },
      { postToGoogle: false },
    );
    return NextResponse.json(body(review, false, credits), { status: 201 });
  } catch (e) {
    if (e instanceof PipelineError) {
      const code =
        (e.extra.code as string) ?? (e.status === 502 ? "ai_error" : e.status === 400 ? "invalid_input" : "server_error");
      return fail(e.status, code, e.message, e.extra.credits ? { credits: e.extra.credits } : {});
    }
    console.error("[api] reply failed:", e);
    return fail(500, "server_error", "Something went wrong. Try again.");
  }
}
