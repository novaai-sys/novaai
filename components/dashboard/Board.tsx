"use client";

import { useMemo, useState } from "react";
import Stars from "../Stars";
import Switch from "./Switch";
import TestReviewForm from "./TestReviewForm";
import CreditsBadge, { UpgradeNotice } from "./CreditsBadge";
import UpgradeBanner from "./UpgradeBanner";
import { ruleRows } from "./rules";
import { isPublished, needsApproval, useDashboard } from "./Store";
import type { Review } from "@/lib/types";

type Filter = "all" | "approval" | "auto" | "approved";

const dateFormat = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const d = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

export default function Board() {
  const { reviews, settings, credits, locations, updateSettings } = useDashboard();
  const [filter, setFilter] = useState<Filter>("all");
  const [adding, setAdding] = useState(false);
  const outOfCredits = credits !== null && !credits.canGenerate;

  const stats = useMemo(() => {
    const total = reviews.length;
    const average = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : null;
    const waiting = reviews.filter(needsApproval).length;
    const auto = reviews.filter((r) => isPublished(r) && r.auto_published).length;
    const byStar = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: reviews.filter((r) => r.rating === star).length,
    }));
    return { total, average, waiting, auto, published: total - waiting, byStar };
  }, [reviews]);

  const filters: { id: Filter; label: string; count?: number }[] = [
    { id: "all", label: "All" },
    { id: "approval", label: "Needs approval", count: stats.waiting },
    { id: "auto", label: "Auto-published" },
    { id: "approved", label: "Approved by you" },
  ];

  const visible = reviews.filter((r) => {
    if (filter === "approval") return needsApproval(r);
    if (filter === "auto") return isPublished(r) && r.auto_published;
    if (filter === "approved") return isPublished(r) && !r.auto_published;
    return true;
  });

  const maxCount = Math.max(...stats.byStar.map((b) => b.count), 1);

  const summary =
    stats.total === 0
      ? "No reviews yet. Add a test review to see Nova write a reply."
      : stats.waiting > 0
        ? `${stats.waiting} ${stats.waiting === 1 ? "reply needs" : "replies need"} your approval.`
        : "Nothing is waiting for you. Every review has a reply.";

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-8 md:px-10 md:py-12">
      <header className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.9rem,3.4vw,2.75rem)] font-medium leading-none tracking-[-0.03em]">
            Reviews
          </h1>
          <p className="mt-3 text-[15px] text-mist">{summary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CreditsBadge />
          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              disabled={outOfCredits}
              aria-describedby={outOfCredits ? "upgrade-notice" : undefined}
              className="rounded-full bg-fog px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-fog"
            >
              Add test review
            </button>
          )}
        </div>
      </header>

      <UpgradeBanner />

      <div id="upgrade-notice">
        <UpgradeNotice />
      </div>

      {adding && !outOfCredits && <TestReviewForm onDone={() => setAdding(false)} />}

      <dl
        style={d(0.1)}
        className="rise mt-10 grid grid-cols-2 border-y border-white/10 md:grid-cols-4 md:divide-x md:divide-white/10"
      >
        <Figure label="Reviews" value={String(stats.total)} />
        <Figure
          label="Average rating"
          value={stats.average === null ? "–" : stats.average.toFixed(1)}
          suffix={stats.average === null ? undefined : <StarGlyph />}
        />
        <Figure label="Auto-published" value={String(stats.auto)} />
        <Figure label="Needs approval" value={String(stats.waiting)} />
      </dl>

      <div style={d(0.2)} className="rise mt-8 grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <section
          aria-labelledby="dist-title"
          className="rounded-card border border-white/10 bg-panel/70 p-6 md:p-7"
        >
          <h2 id="dist-title" className="text-[17px] font-medium">
            Reviews by rating
          </h2>
          <ul className="mt-6 space-y-3.5">
            {stats.byStar.map((b) => (
              <li
                key={b.star}
                title={`${b.count} ${b.count === 1 ? "review" : "reviews"} with ${b.star} ${b.star === 1 ? "star" : "stars"}`}
                className="grid grid-cols-[2.25rem_1fr_1.5rem] items-center gap-3 text-[14px]"
              >
                <span className="flex items-center gap-1 text-mist">
                  {b.star}
                  <StarGlyph small />
                </span>
                <span className="h-2 rounded-full bg-white/5">
                  <span
                    className="block h-2 rounded-full bg-ice transition-all duration-500"
                    style={{ width: `${(b.count / maxCount) * 100}%` }}
                  />
                </span>
                <span className="text-right tabular-nums text-fog">{b.count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="auto-title"
          className="rounded-card border border-white/10 bg-panel/70 p-6 md:p-7"
        >
          <h2 id="auto-title" className="text-[17px] font-medium">
            Autopilot
          </h2>
          <p className="mt-1 text-[14px] text-mist">
            {locations.length > 0
              ? "Default for test reviews and new locations. Each Google location has its own switch on the Locations page."
              : "Whether Nova publishes replies to 4 and 5-star reviews without asking."}
          </p>
          <ul className="mt-4 divide-y divide-white/10">
            {ruleRows.map((row) => {
              const auto = row.switchable && settings.autopilot_enabled;
              return (
                <li key={row.id} className="flex items-center gap-4 py-3.5">
                  <span className="flex w-16 items-baseline gap-1 text-[22px] font-medium tracking-[-0.03em]">
                    {row.stars}
                    <StarGlyph small />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium">{row.who}</span>
                    <span className="block text-[13px] text-mist" aria-live="polite">
                      {auto ? "Published right away" : "Drafted, then sent to you"}
                    </span>
                  </span>
                  {row.switchable ? (
                    <Switch
                      checked={settings.autopilot_enabled}
                      onChange={() =>
                        void updateSettings({ autopilot_enabled: !settings.autopilot_enabled })
                      }
                      label="Publish replies to 4 and 5 star reviews without asking"
                    />
                  ) : (
                    <span className="text-[12px] text-ghost">Always asks you</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section aria-labelledby="table-title" style={d(0.3)} className="rise mt-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="table-title" className="text-[17px] font-medium">
            Customer reviews
          </h2>
          <div
            role="tablist"
            aria-label="Filter reviews"
            className="flex gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/5 p-1"
          >
            {filters.map((f) => (
              <button
                key={f.id}
                role="tab"
                type="button"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-[13px] transition-colors ${
                  filter === f.id ? "bg-fog text-ink" : "text-mist hover:bg-white/10 hover:text-fog"
                }`}
              >
                {f.label}
                {f.count ? (
                  <span
                    className={`rounded-full px-1.5 text-[11px] tabular-nums ${
                      filter === f.id ? "bg-ink/10" : "bg-star/15 text-star"
                    }`}
                  >
                    {f.count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-card border border-white/10 bg-panel/70">
          <table className="block w-full border-collapse text-left text-[14px] md:table md:min-w-[860px]">
            <thead className="hidden md:table-header-group">
              <tr className="border-b border-white/10 text-[13px] text-mist">
                <th scope="col" className="px-6 py-4 font-normal">Customer</th>
                <th scope="col" className="px-4 py-4 font-normal">Review and reply</th>
                <th scope="col" className="px-4 py-4 font-normal">Status</th>
                <th scope="col" className="px-6 py-4 text-right font-normal">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="block divide-y divide-white/10 md:table-row-group">
              {visible.map((r) => (
                <ReviewRow key={r.id} review={r} canGenerate={!outOfCredits} />
              ))}
              {visible.length === 0 && (
                <tr className="block md:table-row">
                  <td colSpan={4} className="block px-6 py-14 text-center text-mist md:table-cell">
                    {reviews.length === 0
                      ? "No reviews yet. Choose “Add test review” to create one."
                      : filter === "approval"
                        ? "Nothing needs your approval."
                        : "No reviews match this filter. Choose “All” to see every review."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[13px] text-ghost">
          Replies to 1 to 3-star reviews always wait for your approval. Test
          reviews are never posted to Google.
        </p>
      </section>
    </div>
  );
}

function ReviewRow({ review: r, canGenerate }: { review: Review; canGenerate: boolean }) {
  const { publish, regenerate } = useDashboard();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<null | "publish" | "regenerate">(null);
  const [error, setError] = useState<string | null>(null);

  const published = isPublished(r);
  const unhappy = r.rating <= 3;
  const highlight = !published && unhappy;

  const run = async (kind: "publish" | "regenerate", fn: () => Promise<string | null>) => {
    setBusy(kind);
    setError(null);
    const problem = await fn();
    setBusy(null);
    if (problem) setError(problem);
    else setEditing(false);
  };

  const btn =
    "rounded-full px-4 py-2 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-40";
  const primary = `${btn} bg-fog font-medium text-ink hover:bg-white`;
  const secondary = `${btn} border border-white/15 text-fog hover:bg-white/5`;

  return (
    <tr className={`block p-5 align-top md:table-row md:p-0 ${highlight ? "bg-star/[0.05]" : ""}`}>
      <td
        className={`block md:table-cell md:w-44 md:px-6 md:py-5 ${
          highlight ? "md:shadow-[inset_3px_0_0_var(--color-star)]" : ""
        }`}
      >
        <span className="block font-medium">{r.reviewer_name}</span>
        <span className="mt-1.5 block">
          <Stars count={r.rating} size={13} />
        </span>
        <span className="mt-1.5 block text-[12px] text-mist">
          {dateFormat.format(new Date(r.created_at))}
        </span>
      </td>
      <td className="block pt-4 md:table-cell md:px-4 md:py-5">
        <p className="max-w-[58ch] leading-relaxed text-fog">
          {r.review_text || <span className="text-mist">Rating only, no text.</span>}
        </p>
        {editing ? (
          <div className="mt-3 max-w-[58ch]">
            <label htmlFor={`edit-${r.id}`} className="sr-only">
              Edit reply to {r.reviewer_name}
            </label>
            <textarea
              id={`edit-${r.id}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-white/15 bg-ink/60 p-3 leading-relaxed text-fog outline-none focus:border-ice/60"
            />
          </div>
        ) : (
          <p className="mt-3 max-w-[58ch] border-l border-white/15 pl-3 leading-relaxed text-mist">
            {busy === "regenerate"
              ? "Nova is writing a new draft…"
              : r.ai_reply || "No draft yet."}
          </p>
        )}
        {(error || r.publish_error) && (
          <p role="alert" className="mt-3 max-w-[58ch] text-[13px] text-star">
            {error || r.publish_error}
          </p>
        )}
      </td>
      <td className="block pt-4 md:table-cell md:w-44 md:px-4 md:py-5">
        <StatusChip review={r} />
        <span className="mt-2 block text-[12px] text-ghost">
          {r.posted_to_google_at
            ? "Posted on Google"
            : r.google_review_name
              ? "From Google"
              : r.source === "api"
                ? "Via API"
                : "Test review"}
        </span>
      </td>
      <td className="block pt-4 md:table-cell md:w-56 md:px-6 md:py-5">
        <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => run("publish", () => publish(r.id, draft.trim()))}
                disabled={draft.trim() === "" || busy !== null}
                className={primary}
              >
                {busy === "publish" ? "Publishing…" : published ? "Update reply" : "Approve & publish"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className={`${btn} text-mist hover:text-fog`}
              >
                Cancel
              </button>
            </>
          ) : !published ? (
            <>
              <button
                type="button"
                onClick={() => run("publish", () => publish(r.id))}
                disabled={!r.ai_reply || busy !== null}
                className={primary}
              >
                {busy === "publish" ? "Publishing…" : "Approve & publish"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(r.ai_reply ?? "");
                  setEditing(true);
                }}
                disabled={busy !== null}
                className={secondary}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => run("regenerate", () => regenerate(r.id))}
                disabled={busy !== null || !canGenerate}
                title={canGenerate ? undefined : "No AI replies left on your plan"}
                className={secondary}
              >
                {busy === "regenerate" ? "Writing…" : r.ai_reply ? "Regenerate" : "Write draft"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(r.ai_reply ?? "");
                setEditing(true);
              }}
              className={secondary}
            >
              Edit reply
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function Figure({ label, value, suffix }: { label: string; value: string; suffix?: React.ReactNode }) {
  return (
    <div className="px-1 py-6 md:px-6 md:first:pl-1">
      <dt className="text-[13px] text-mist">{label}</dt>
      <dd className="mt-3 flex items-baseline gap-2 text-[clamp(2.25rem,4vw,3.25rem)] font-medium leading-none tracking-[-0.04em] tabular-nums">
        {value}
        {suffix}
      </dd>
    </div>
  );
}

function StarGlyph({ small = false }: { small?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={`${small ? "h-3 w-3" : "h-[0.42em] w-[0.42em]"} shrink-0 text-star`}
    >
      <path
        fill="currentColor"
        d="m10 1.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8L10 1.5Z"
      />
    </svg>
  );
}

function StatusChip({ review: r }: { review: Review }) {
  const published = isPublished(r);
  const label = !published ? "Needs approval" : r.auto_published ? "Auto-published" : "Approved";
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] ${
        published ? "bg-ice/15 text-ice" : "bg-star/15 text-star"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${published ? "bg-ice" : "bg-star"}`} />
      {label}
    </span>
  );
}
