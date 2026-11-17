"use client";

import { useState } from "react";
import { useDashboard } from "./Store";

const field =
  "mt-2 w-full rounded-xl border border-white/15 bg-ink/60 p-3 text-[15px] leading-relaxed text-fog outline-none placeholder:text-ghost focus:border-ice/60";

/**
 * Adds a made-up review and asks Nova (OpenAI) for a real reply. The review
 * and reply are saved in Supabase by /api/generate-reply.
 */
export default function TestReviewForm({ onDone }: { onDone: () => void }) {
  const { addTestReview, settings, credits } = useDashboard();
  const outOfCredits = credits !== null && !credits.canGenerate;
  const [name, setName] = useState("Test customer");
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) {
      setError("Write the review text first.");
      return;
    }
    setBusy(true);
    setError(null);
    const problem = await addTestReview({
      reviewerName: name.trim() || "Test customer",
      rating,
      reviewText: reviewText.trim(),
    });
    setBusy(false);
    if (problem) setError(problem);
    else onDone();
  };

  return (
    <form
      onSubmit={submit}
      className="rise mt-8 rounded-card border border-ice/25 bg-panel/70 p-6 md:p-7"
    >
      <h2 className="text-[17px] font-medium">Add a test review</h2>
      <p className="mt-1 max-w-[62ch] text-[14px] text-mist">
        Nova writes a real reply in your “{settings.tone_of_voice}” tone and
        saves both. Nothing is posted to Google.
        {credits && credits.remaining !== null && (
          <>
            {" "}
            This uses 1 of your {credits.remaining} remaining trial{" "}
            {credits.remaining === 1 ? "reply" : "replies"}.
          </>
        )}
      </p>

      <div className="mt-6 grid gap-5 md:grid-cols-[1fr_auto]">
        <div>
          <label htmlFor="tr-name" className="text-[14px] font-medium">
            Customer name
          </label>
          <input
            id="tr-name"
            type="text"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            className={field}
          />
        </div>

        <fieldset>
          <legend className="text-[14px] font-medium">Rating</legend>
          <div className="mt-2 flex h-[50px] items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
                aria-pressed={rating === n}
                onClick={() => setRating(n)}
                className="rounded-md p-1.5"
              >
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  className={`h-6 w-6 transition-colors ${n <= rating ? "text-star" : "text-white/15"}`}
                >
                  <path
                    fill="currentColor"
                    d="m10 1.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8L10 1.5Z"
                  />
                </svg>
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="mt-5">
        <label htmlFor="tr-text" className="text-[14px] font-medium">
          Review
        </label>
        <textarea
          id="tr-text"
          rows={3}
          value={reviewText}
          maxLength={4000}
          onChange={(e) => {
            setReviewText(e.target.value);
            setError(null);
          }}
          placeholder="Write it the way a customer would, in any language."
          className={field}
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-[14px] text-star">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy || outOfCredits}
          className="rounded-full bg-fog px-6 py-3 text-[15px] font-medium text-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Nova is writing…" : "Generate reply"}
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={busy}
          className="rounded-full px-4 py-3 text-[15px] text-mist hover:text-fog"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
