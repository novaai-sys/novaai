-- NovaAI: Paddle billing, Google Business Profile connections, review routing.
--
-- Run once in the Supabase SQL editor, after supabase/credits.sql and
-- supabase/plans.sql. Safe to run again: nothing is dropped or reset except
-- the functions and policies it re-creates.

-- =============================================================================
-- 1. Billing columns on profiles (written only by the Paddle webhook)
-- =============================================================================
alter table public.profiles add column if not exists billing_cycle text;
alter table public.profiles add column if not exists subscription_status text;
alter table public.profiles add column if not exists paddle_customer_id text;
alter table public.profiles add column if not exists paddle_subscription_id text;
alter table public.profiles add column if not exists current_period_end timestamptz;
alter table public.profiles add column if not exists locations_limit int not null default 1;
-- occurred_at of the last Paddle event applied, so late events cannot undo newer ones.
alter table public.profiles add column if not exists paddle_event_at timestamptz;

alter table public.profiles drop constraint if exists profiles_billing_cycle_check;
alter table public.profiles add constraint profiles_billing_cycle_check
  check (billing_cycle is null or billing_cycle in ('monthly', 'annual'));

alter table public.profiles drop constraint if exists profiles_locations_limit_check;
alter table public.profiles add constraint profiles_locations_limit_check
  check (locations_limit between 0 and 100);

create unique index if not exists profiles_paddle_subscription_id_key
  on public.profiles (paddle_subscription_id) where paddle_subscription_id is not null;
create index if not exists profiles_paddle_customer_id_idx
  on public.profiles (paddle_customer_id);

-- Customers moved to a paid plan by hand before Paddle existed keep access.
update public.profiles
   set subscription_status = 'active'
 where plan in ('starter', 'growth') and subscription_status is null;
update public.profiles set locations_limit = 5
 where plan = 'growth' and locations_limit < 5;

-- Paid access: a paid plan whose subscription is active, trialing, or past
-- due (Paddle is still retrying the payment). Canceled or paused: no access,
-- the account falls back to the free-trial rules.
create or replace function public.has_paid_access(p_plan text, p_status text)
returns boolean
language sql
immutable
as $$
  select p_plan in ('starter', 'growth')
     and coalesce(p_status, '') in ('active', 'trialing', 'past_due');
$$;

-- Count one AI reply. Paid access: always counted. Otherwise: only while the
-- 7-day trial is open and under its 10 replies. Returns no row when refused.
drop function if exists public.increment_credits_used();
create function public.increment_credits_used()
returns table (
  credits_used int,
  credits_limit int,
  plan text,
  trial_ends_at timestamptz,
  subscription_status text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  return query
    update public.profiles as p
       set credits_used = p.credits_used + 1
     where p.id = auth.uid()
       and (
         public.has_paid_access(p.plan, p.subscription_status)
         or (p.credits_used < p.credits_limit and p.trial_ends_at > now())
       )
    returning p.credits_used, p.credits_limit, p.plan, p.trial_ends_at,
              p.subscription_status;
end;
$$;

revoke all on function public.increment_credits_used() from public, anon;
grant execute on function public.increment_credits_used() to authenticated;

-- =============================================================================
-- 2. Google Business Profile connections
--    One row per NovaAI user. The refresh token is encrypted by the app
--    (AES-256-GCM) before it is stored, and the browser can never read it.
-- =============================================================================
create table if not exists public.google_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  google_email text,
  refresh_token_encrypted text not null,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_connections enable row level security;

drop policy if exists "Read own connection" on public.google_connections;
create policy "Read own connection" on public.google_connections
  for select using (auth.uid() = user_id);

-- Column-level access: every column except the token. Writes happen on the
-- server with the service role key.
revoke all on public.google_connections from anon, authenticated;
grant select (id, user_id, google_email, scope, created_at, updated_at)
  on public.google_connections to authenticated;

-- =============================================================================
-- 3. Locations (Google Business Profile locations the user connected)
-- =============================================================================
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  connection_id uuid not null references public.google_connections (id) on delete cascade,
  google_account_id text not null,   -- accounts/123
  google_location_id text not null,  -- locations/456
  title text not null default '',
  address text,
  auto_reply_enabled boolean not null default false,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, google_location_id)
);

create index if not exists locations_user_idx on public.locations (user_id);

alter table public.locations enable row level security;

drop policy if exists "Read own locations" on public.locations;
create policy "Read own locations" on public.locations
  for select using (auth.uid() = user_id);

drop policy if exists "Update own locations" on public.locations;
create policy "Update own locations" on public.locations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Users may read their locations and switch auto-reply. Nothing else.
revoke all on public.locations from anon, authenticated;
grant select on public.locations to authenticated;
grant update (auto_reply_enabled) on public.locations to authenticated;

-- =============================================================================
-- 4. Reviews: Google link, routing and publishing fields
-- =============================================================================
alter table public.reviews add column if not exists location_id uuid
  references public.locations (id) on delete set null;
-- Full Google resource name: accounts/1/locations/2/reviews/3. Null for test reviews.
alter table public.reviews add column if not exists google_review_name text;
alter table public.reviews add column if not exists auto_published boolean not null default false;
alter table public.reviews add column if not exists published_at timestamptz;
alter table public.reviews add column if not exists posted_to_google_at timestamptz;
alter table public.reviews add column if not exists publish_error text;

create unique index if not exists reviews_google_review_name_key
  on public.reviews (google_review_name) where google_review_name is not null;
create index if not exists reviews_user_status_idx on public.reviews (user_id, status);

-- Status names: 'pending' becomes 'pending_approval'.
update public.reviews set status = 'pending_approval' where status = 'pending';
alter table public.reviews alter column status set default 'pending_approval';
alter table public.reviews drop constraint if exists reviews_status_check;
alter table public.reviews add constraint reviews_status_check
  check (status in ('pending_approval', 'published'));
