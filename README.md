# NovaAI

Replies to Google reviews, written by AI in your tone of voice.
Next.js 16, Tailwind CSS 4, Supabase (auth + database), OpenAI `gpt-4o-mini`,
Paddle Billing, Google Business Profile API.

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

Then in Supabase > Authentication > Email, decide whether "Confirm email" is
on. With it on, new users confirm by email before they can log in.

## How the pieces fit

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

- `/api/auth/google-business/connect` → Google consent (`business.manage`,
  offline access) → `/api/auth/google-business/callback`.
- The refresh token is encrypted with AES-256-GCM (`lib/crypto.ts`) and stored
  in `google_connections`. The browser can read every column except the token.
- The callback imports locations up to the plan's limit.
- "Check for new reviews" on the Locations page calls `/api/reviews/sync`,
  which imports unanswered reviews and runs them through the pipeline.
  Publishing posts the reply with the v4 `reviews.updateReply` endpoint.

## Not built yet

- Automatic background sync. Reviews are fetched when the owner presses
  "Check for new reviews". A scheduled job needs a server-side version of the
  sync that does not rely on the user's session.
- Alert emails. `alert_email` is stored only.
- Google calls are written against Google's documentation but untested with a
  live project: Business Profile API access must be approved by Google first.
