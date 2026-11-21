/**
 * Cloudflare Worker entry for NovaAI.
 *
 * Wraps the Worker that OpenNext builds from the Next.js app (all pages and
 * API routes) and adds a Cron Trigger: every 15 minutes (see "triggers" in
 * wrangler.jsonc) it runs the Google review sync by calling
 * /api/cron/sync-reviews inside this same Worker, with CRON_SECRET.
 *
 * Each sync call works for up to SYNC_TIME_BUDGET_MS. While the response says
 * there is more to do, it calls again, up to 3 times; anything left is picked
 * up on the next run. This replaces netlify/functions/sync-reviews.mts.
 */

// The OpenNext output only exists after `opennextjs-cloudflare build`.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { default as openNext } from "./.open-next/worker.js";

type Env = Record<string, unknown> & { CRON_SECRET?: string; NEXT_PUBLIC_SITE_URL?: string };
type Ctx = { waitUntil(p: Promise<unknown>): void; passThroughOnException?(): void };
type Handler = { fetch(req: Request, env: Env, ctx: Ctx): Promise<Response> };

const app = openNext as Handler;
const MAX_CALLS = 3;

async function syncReviews(env: Env, ctx: Ctx) {
  const secret = env.CRON_SECRET;
  if (!secret) {
    console.error("[sync-reviews] CRON_SECRET is not set; skipping.");
    return;
  }
  const origin = (env.NEXT_PUBLIC_SITE_URL || "https://getnovaai.app").replace(/\/$/, "");
  for (let i = 0; i < MAX_CALLS; i++) {
    const res = await app.fetch(
      new Request(`${origin}/api/cron/sync-reviews`, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
      }),
      env,
      ctx,
    );
    const json = (await res.json().catch(() => ({}))) as { more?: boolean };
    console.log(`[sync-reviews] call ${i + 1}: ${res.status}`, JSON.stringify(json));
    if (!res.ok || !json.more) break;
  }
}

const worker = {
  fetch: (req: Request, env: Env, ctx: Ctx) => app.fetch(req, env, ctx),
  async scheduled(_controller: unknown, env: Env, ctx: Ctx) {
    ctx.waitUntil(syncReviews(env, ctx));
  },
};

export default worker;

// Durable Objects OpenNext may use for caching, re-exported as Wrangler expects.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
