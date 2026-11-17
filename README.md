# NovaAI

Replies to customer reviews, written by AI in your tone of voice.
Next.js 16, Tailwind CSS 4, Supabase (auth + database), OpenAI `gpt-4o-mini`.

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in the three values
npm run dev                  # http://localhost:3000
```

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Project Settings > API (anon public key) |
| `OPENAI_API_KEY` | platform.openai.com > API keys. Server-side only. |

Restart `npm run dev` after changing `.env.local`.

## Supabase checklist

1. **Tables.** `business_settings` and `reviews` must have the columns in
   [`supabase/schema.sql`](supabase/schema.sql).
2. **Row level security.** If RLS is on (it should be), add the two policies
   at the bottom of that file. Without them the dashboard cannot read or
   write, and shows an error with these same hints.
3. **`reviews.status`.** NovaAI writes `pending` (waiting for approval) and
   `published`. If your column has a check constraint or enum, allow both.
4. **Free-reply limit.** Run [`supabase/credits.sql`](supabase/credits.sql)
   once. It creates `profiles` (10 free AI replies per user), the sign-up
   trigger and the `increment_credits_used()` function. Until it is run,
   `/api/generate-reply` refuses to generate.
5. **Plans.** Then run [`supabase/plans.sql`](supabase/plans.sql). It adds
   `profiles.plan` (`free`, `starter` or `growth`) and
   `profiles.trial_ends_at`. The free trial allows 10 replies within 7 days;
   Starter and Growth are unlimited. To move a customer to a paid plan:
   `update public.profiles set plan = 'starter' where id = '<user uuid>';`
6. **Email confirmation.** Authentication > Sign In / Providers > Email.
   With "Confirm email" on, new users must click the link in their inbox
   before they can log in. Turn it off for sign-up to open the dashboard
   straight away.

## How it works

- `/signup`, `/login`: email + password with Supabase Auth
  (`components/AuthCard.tsx`).
- `proxy.ts`: refreshes the session and sends signed-out visitors from
  `/dashboard/*` to `/login`. `app/dashboard/layout.tsx` checks again on the
  server.
- `components/dashboard/Store.tsx`: loads the signed-in user's settings and
  reviews, and writes every change to Supabase.
- `POST /api/generate-reply` (`app/api/generate-reply/route.ts`): takes
  `{ reviewText, rating, toneOfVoice?, businessName?, reviewerName?, reviewId? }`,
  asks `gpt-4o-mini` for a reply and saves it in `reviews`. With Autopilot on,
  4 and 5 star reviews are saved as `published`; everything else is `pending`.
- "Add test review" on the Reviews page calls that route.

| Dashboard page | Column it saves |
| --- | --- |
| Autopilot switch | `business_settings.autopilot_enabled` |
| Autopilot > Alert email | `business_settings.alert_email` |
| Tone of voice | `business_settings.tone_of_voice` |
| Locations > Business name | `business_settings.business_name` |
| Reviews > Publish / Edit reply | `reviews.status`, `reviews.ai_reply` |

## Not built yet

- Google Business Profile connection. Nothing is read from or posted to
  Google; "Published" means approved inside NovaAI.
- Sending alert emails. The address is stored only.
- Payments. Paid plans are switched by hand in the SQL editor (see Plans
  above). Setting the `NEXT_PUBLIC_LEMONSQUEEZY_*` variables in `.env.local`
  sends the pricing and Billing buttons to checkout, but nothing updates
  `profiles.plan` after a payment yet: that needs a Lemon Squeezy webhook.
