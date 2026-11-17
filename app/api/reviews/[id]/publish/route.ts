import { withUser } from "@/lib/reviews/http";
import { PipelineError, postToGoogle } from "@/lib/reviews/process";

/**
 * POST /api/reviews/:id/publish   { reply? }
 *
 * "Approve & publish" and "Update reply". Uses the edited text when given,
 * otherwise the current draft. Reviews that came from Google get the reply
 * posted on Google first; if Google refuses, the review stays a draft and
 * the error is shown.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  return withUser(async ({ supabase, userId }) => {
    const { data: rows } = await supabase
      .from("reviews")
      .select("id, ai_reply, google_review_name, status")
      .eq("id", id)
      .eq("user_id", userId)
      .limit(1);
    const review = rows?.[0];
    if (!review) throw new PipelineError("That review was not found.", 404);

    const reply =
      typeof body?.reply === "string" && body.reply.trim()
        ? body.reply.trim()
        : (review.ai_reply ?? "").trim();
    if (!reply) throw new PipelineError("Write a reply before publishing.", 400);
    if (Buffer.byteLength(reply, "utf8") > 4096) {
      throw new PipelineError("Google allows replies up to 4,096 bytes. Shorten it.", 400);
    }

    const posted = await postToGoogle(userId, review.google_review_name, reply);
    const update = posted.error
      ? { ai_reply: reply, publish_error: posted.error }
      : {
          ai_reply: reply,
          status: "published",
          auto_published: false,
          published_at: new Date().toISOString(),
          posted_to_google_at: posted.postedAt,
          publish_error: null,
        };

    const { data, error } = await supabase
      .from("reviews")
      .update(update)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .limit(1);
    if (error || !data?.[0]) {
      throw new PipelineError(`Could not save the reply: ${error?.message ?? "no row"}`, 500);
    }
    if (posted.error) {
      throw new PipelineError(`Google did not accept the reply: ${posted.error}`, 502, {
        review: data[0],
      });
    }
    return { review: data[0] };
  });
}
