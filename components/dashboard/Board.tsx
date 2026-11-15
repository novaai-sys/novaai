"use client";

import { useMemo, useState } from "react";
import Stars from "../Stars";
import Switch from "./Switch";
import TestReviewForm from "./TestReviewForm";
import { ruleRows } from "./rules";
import { isPublished, useDashboard } from "./Store";
import type { Review } from "@/lib/types";

type Filter = "all" | "high" | "low" | "awaiting";

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "high", label: "4–5 stars" },
  { id: "low", label: "1–3 stars" },
  { id: "awaiting", label: "Waiting for you" },
];

const dateFormat = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const d = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;

export default function Board() {
  const { reviews, settings, updateSettings, publish } = useDashboard();
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  const stats = useMemo(() => {
    const total = reviews.length;
    const average = total
      ? reviews.reduce((s, r) => s + r.rating, 0) / total
      : null;
    const awaiting = reviews.filter((r) => !isPublished(r)).length;
    const byStar = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: reviews.filter((r) => r.rating === star).length,
    }));
    return { total, average, awaiting, published: total - awaiting, byStar };
  }, [reviews]);

  const visible = reviews.filter((r) => {
    if (filter === "high") return r.rating >= 4;
    if (filter === "low") return r.rating <= 3;
    if (filter === "awaiting") return !isPublished(r);
    return true;
  });

  const publishReply = (id: string, reply?: string) => {
    void publish(id, reply);
    setEditing(null);
  };

  const startEdit = (r: Review) => {
    setEditing(r.id);
    setDraft(r.ai_reply ?? "");
  };

  const maxCount = Math.max(...stats.byStar.map((b) => b.count), 1);

  const summary =
    stats.total === 0
      ? "No reviews yet. Add a test review to see Nova write a reply."
      : stats.awaiting > 0
        ? `${stats.awaiting} ${stats.awaiting === 1 ? "reply is" : "replies are"} waiting for your approval.`
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
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-full bg-fog px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-white"
          >
            Add test review
          </button>
        )}
      </header>

      {adding && <TestReviewForm onDone={() => setAdding(false)} />}

      {/* Headline figures: one strip, divided by hairlines. */}
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
        <Figure label="Replies published" value={String(stats.published)} />
        <Figure label="Waiting for you" value={String(stats.awaiting)} />
      </dl>

      <div style={d(0.2)} className="rise mt-8 grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        {/* Rating distribution */}
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

        {/* Autopilot */}
        <section
          aria-labelledby="auto-title"
          className="rounded-card border border-white/10 bg-panel/70 p-6 md:p-7"
        >
          <h2 id="auto-title" className="text-[17px] font-medium">
            Autopilot
          </h2>
          <p className="mt-1 text-[14px] text-mist">
            Choose whether Nova publishes good reviews without asking.
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
                        void updateSettings({
                          autopilot_enabled: !settings.autopilot_enabled,
                        })
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

      {/* Reviews table */}
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
                className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] transition-colors ${
                  filter === f.id
                    ? "bg-fog text-ink"
                    : "text-mist hover:bg-white/10 hover:text-fog"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-card border border-white/10 bg-panel/70">
          <table className="block w-full border-collapse text-left text-[14px] md:table md:min-w-[820px]">
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
                <tr key={r.id} className="block p-5 align-top md:table-row md:p-0">
                  <td className="block md:table-cell md:w-44 md:px-6 md:py-5">
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
                      {r.review_text}
                    </p>
                    {editing === r.id ? (
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
                        {r.ai_reply || "No reply yet."}
                      </p>
                    )}
                  </td>
                  <td className="block pt-4 md:table-cell md:w-40 md:px-4 md:py-5">
                    <StatusChip published={isPublished(r)} />
                  </td>
                  <td className="block pt-4 md:table-cell md:w-56 md:px-6 md:py-5">
                    <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
                      {editing === r.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => publishReply(r.id, draft.trim())}
                            disabled={draft.trim() === ""}
                            className="rounded-full bg-fog px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-white disabled:opacity-40"
                          >
                            Publish reply
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="rounded-full px-4 py-2 text-[13px] text-mist hover:text-fog"
                          >
                            Cancel
                          </button>
                        </>
                      ) : !isPublished(r) ? (
                        <>
                          <button
                            type="button"
                            onClick={() => publishReply(r.id)}
                            disabled={!r.ai_reply}
                            className="rounded-full bg-fog px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-white disabled:opacity-40"
                          >
                            Publish reply
                          </button>
                          <button
                            type="button"
                            onClick={() => startEdit(r)}
                            className="rounded-full border border-white/15 px-4 py-2 text-[13px] text-fog transition-colors hover:bg-white/5"
                          >
                            Edit reply
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(r)}
                          className="rounded-full border border-white/15 px-4 py-2 text-[13px] text-fog transition-colors hover:bg-white/5"
                        >
                          Edit reply
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr className="block md:table-row">
                  <td colSpan={4} className="block px-6 py-14 text-center text-mist md:table-cell">
                    {reviews.length === 0
                      ? "No reviews yet. Choose “Add test review” to create one."
                      : "No reviews match this filter. Choose “All” to see every review."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[13px] text-ghost">
          Google is not connected yet, so “Published” means approved in NovaAI.
          Nothing is posted to Google.
        </p>
      </section>
    </div>
  );
}

function Figure({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: React.ReactNode;
}) {
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

function StatusChip({ published }: { published: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] ${
        published ? "bg-ice/15 text-ice" : "bg-star/15 text-star"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${published ? "bg-ice" : "bg-star"}`}
      />
      {published ? "Published" : "Waiting for you"}
    </span>
  );
}
