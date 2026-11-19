/**
 * Netlify scheduled function: runs the NovaAI review sync every 15 minutes.
 *
 * It calls /api/cron/sync-reviews with CRON_SECRET. Each call works for up
 * to SYNC_TIME_BUDGET_MS (4 s by default); while the response says there is
 * more to do, it calls again, up to 3 times, to stay inside Netlify's
 * 30-second limit for scheduled functions. Whatever is left is picked up on
 * the next run.
 *
 * Needs NEXT_PUBLIC_SITE_URL (or Netlify's own URL) and CRON_SECRET.
 */

const MAX_CALLS = 3;

async function syncReviews() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "").replace(/\/$/, "");
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.error("[sync-reviews] NEXT_PUBLIC_SITE_URL/URL or CRON_SECRET is not set.");
    return;
  }

  for (let i = 0; i < MAX_CALLS; i++) {
    const res = await fetch(`${base}/api/cron/sync-reviews`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });
    const json = await res.json().catch(() => ({}));
    console.log(`[sync-reviews] call ${i + 1}: ${res.status}`, JSON.stringify(json));
    if (!res.ok || !json.more) break;
  }
}

export default syncReviews;

export const config = { schedule: "*/15 * * * *" };
