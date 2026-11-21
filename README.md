# NovaAI

An AI dispatcher that answers calls for HVAC and plumbing shops (Retell AI +
Telnyx), plus AI replies to Google reviews.
Next.js 16, Tailwind CSS 4, Supabase (auth + database), OpenAI `gpt-4o-mini`,
Paddle Billing, Retell AI, Google Business Profile API.

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

Live Paddle checkout only opens on domains Paddle has approved, so on
`localhost` use a sandbox client token and sandbox price IDs with
`NEXT_PUBLIC_PADDLE_ENV=sandbox`.

## Database

Run these in the Supabase SQL editor, in this order. Each is safe to run again.

1. [`supabase/schema.sql`](supabase/schema.sql): `business_settings`, `reviews` and their row level security.
2. [`supabase/credits.sql`](supabase/credits.sql): `profiles` (one per user) and the sign-up trigger.
3. [`supabase/plans.sql`](supabase/plans.sql): plan and 7-day trial columns.
4. [`supabase/migrations/20261117180000_billing_google_reviews.sql`](supabase/migrations/20261117180000_billing_google_reviews.sql):
   Paddle billing columns, `google_connections`, `locations`, review routing
   columns, and the final `increment_credits_used()`.
5. [`supabase/migrations/20261118200000_api_keys.sql`](supabase/migrations/20261118200000_api_keys.sql):
   API keys for the integrations API, and review source / external ID.
6. [`supabase/migrations/20261119120000_google_autosync.sql`](supabase/migrations/20261119120000_google_autosync.sql):
   cached access tokens, connection status, per-location sync status and the
   sync lock.
7. [`supabase/migrations/20261121090000_dispatcher_demo_trials.sql`](supabase/migrations/20261121090000_dispatcher_demo_trials.sql):
   demo call limits (`demo_calls`, `claim_demo_call`) and free-trial
   requests (`trial_requests`).

Then in Supabase > Authentication > Email, decide whether "Confirm email" is
on. With it on, new users confirm by email before they can log in.

## How the pieces fit

### AI dispatcher (landing page, live demo, trials)

NovaAI's main product is now Jessica, an AI dispatcher that answers calls
for HVAC and plumbing shops. Calls run on Retell AI with Telnyx numbers.

- `/` and `/pricing` sell the dispatcher. Plans are in
  `lib/dispatcher/plans.ts` (Starter $199, Pro $299, 14-day free trial).
  Every plan button opens the trial form; setup is done for each shop.
- **Live demo** (`components/TalkToJessica.tsx`): a browser call with the
  agent in `RETELL_DEMO_AGENT_ID`. The Retell browser SDK sends its
  create-web-call request to `/api/demo/retell/v3/create-web-call`, which
  checks the origin, applies `DEMO_CALLS_PER_IP` / `DEMO_CALLS_PER_DAY`,
  adds `RETELL_API_KEY` and forwards to Retell. The key never reaches the
  browser.
- **Trial form** (`components/TrialForm.tsx`) posts to `/api/trial-request`,
  which saves to `trial_requests` and, if `TRIAL_NOTIFY_WEBHOOK_URL` is set,
  posts the request there (Discord, Slack, Make or Zapier).
- Billing for the dispatcher plans is not connected yet: create the Starter
  and Pro prices in Paddle first. The dashboard's review-reply plans in
  `lib/plans.ts` are unchanged.

### Plans

| Plan | Replies | Locations | Access rule |
| --- | --- | --- | --- |
| Free trial | 10, within 7 days | 1 | every new account |
| Starter | unlimited | 1 | `plan = 'starter'` and subscription `active`, `trialing` or `past_due` |
| Growth | unlimited | 5 | `plan = 'growth'` and the same statuses |

A canceled or paused subscription falls back to the trial rules. The rule is
checked in `lib/usage.ts` and enforced in the database by
`increment_credits_used()`, which every AI reply must pass.

### Paddle

- `lib/paddle.ts` loads Paddle.js once with the client token.
- Plan buttons on `/` and `/pricing` go to `/signup?...&next=/dashboard/billing?checkout=starter-annual`.
  Signed-in visitors skip sign-up. The Billing page opens the overlay with
  `customData: { userId }` and `customer: { email }`.
- `checkout.completed` sends the user to `/dashboard?upgraded=true`, which waits
  for the webhook and confirms the plan.
- Customers who already pay are never sent to a second checkout: the Billing
  page switches the price on their subscription through the Paddle API
  (`/api/billing/change-plan`, prorated). "Manage subscription" opens the Paddle
  customer portal (`/api/billing/portal`), where they can cancel.
- `/api/webhooks/paddle` verifies `Paddle-Signature` (HMAC-SHA256 of
  `ts:rawBody`, 5-minute tolerance), then writes `plan`, `billing_cycle`,
  `subscription_status`, `paddle_customer_id`, `paddle_subscription_id`,
  `current_period_end` and `locations_limit` with the service role key. Late,
  out-of-order events are ignored.

### Review routing (`lib/reviews/process.ts`)

| Review | Auto-reply on | Auto-reply off |
| --- | --- | --- |
| 4–5 stars | generated and published | draft, `pending_approval` |
| 1–3 stars | draft, `pending_approval` | draft, `pending_approval` |

"Auto-reply" is the location's `auto_reply_enabled` switch for Google
reviews, and the Autopilot switch for test reviews. Replies to 1–3 star
reviews use a de-escalating prompt and are never published without the
owner. "Regenerate" always produces a new draft.

API: `POST /api/reviews/process` (new test review, or `{ reviewId }` to
regenerate), `POST /api/reviews/:id/publish`, `POST /api/reviews/sync`.

### Google Business Profile

- `/api/auth/google-business` → Google consent (`business.manage`, offline
  access, `prompt=consent`) → `/api/auth/google-business/callback`.
- The refresh token and the current access token are encrypted with
  AES-256-GCM (`lib/crypto.ts`) and stored in `google_connections`, with the
  token expiry and account IDs. The browser can read neither token column.
- The callback imports locations up to the plan's limit.
- `lib/google/tokens.ts` reuses the access token until a minute before it
  expires, then refreshes it. If Google answers `invalid_grant` (access
  revoked), the connection is marked `needs_reconnect` and the dashboard asks
  the owner to reconnect.
- `lib/reviews/sync.ts` is the sync engine. For each location it takes a lock
  (`claim_location_sync`), lists reviews, skips answered and already-imported
  ones, and runs the rest through the pipeline. 4–5★ with Autopilot on are
  posted to Google straight away; the rest wait as drafts.
- Callers: "Sync now" on the Locations page (`POST /api/reviews/sync`, the
  owner's locations) and the cron route `/api/cron/sync-reviews` (all active
  connections, `Authorization: Bearer $CRON_SECRET`).
- `netlify/functions/sync-reviews.mts` is a Netlify scheduled function that
  calls the cron route every 15 minutes, and again (up to 3 times) while the
  response says `more: true`.

### Integrations API (Make.com, Zapier, scripts)

`POST /api/v1/reviews/reply`, authenticated with an account API key
(`Authorization: Bearer nova_sk_...` or `X-API-Key: nova_sk_...`). Keys are
created and revoked in the dashboard under Integrations; only a SHA-256 hash
is stored.

Body: `review` (text, may be empty), `rating` (1–5 or `"ONE"`..`"FIVE"`),
`author` (optional), `review_id` (optional, makes retries free and
duplicate-safe).

Response: `{ reply, should_post, status, rating, nova_review_id, duplicate, credits }`.
`should_post` is true only for 4–5 stars with Autopilot on; 1–3 stars always
wait in the dashboard. Errors: `{ error, code }` with 401 `invalid_api_key`,
400 `invalid_input`, 402 `trial_ended` / `no_credits`, 502 `ai_error`.

Requires `supabase/migrations/20261118200000_api_keys.sql`.

## Not built yet

- Alert emails. `alert_email` is stored only.
- Google calls are written against Google's documentation but untested with a
  live project: Business Profile API access must be approved by Google first.
