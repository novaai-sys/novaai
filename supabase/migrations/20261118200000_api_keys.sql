-- NovaAI: API keys for server-to-server integrations (Make.com, Zapier, ...).
--
-- Run once in the Supabase SQL editor, after
-- 20261117180000_billing_google_reviews.sql. Safe to run again.

-- 1. API keys. Only a SHA-256 hash of each key is stored; the key itself is
--    shown once, when it is created. Users can list their keys (name,
--    prefix, dates) but never read the hash. Creating and revoking happen on
--    the server with the service role key.
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'API key',
  key_hash text not null unique,
  key_prefix text not null,          -- e.g. "nova_sk_Ab3x", shown in the list
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists api_keys_user_idx on public.api_keys (user_id);

alter table public.api_keys enable row level security;

drop policy if exists "Read own api keys" on public.api_keys;
create policy "Read own api keys" on public.api_keys
  for select using (auth.uid() = user_id);

revoke all on public.api_keys from anon, authenticated;
grant select (id, user_id, name, key_prefix, created_at, last_used_at, revoked_at)
  on public.api_keys to authenticated;

-- 2. Where a review came from, and the caller's own ID for it, so a retried
--    request returns the same reply instead of generating (and charging) twice.
alter table public.reviews add column if not exists source text not null default 'dashboard';
alter table public.reviews add column if not exists external_id text;

alter table public.reviews drop constraint if exists reviews_source_check;
alter table public.reviews add constraint reviews_source_check
  check (source in ('dashboard', 'google', 'api'));

update public.reviews set source = 'google'
 where google_review_name is not null and source = 'dashboard';

create unique index if not exists reviews_user_external_id_key
  on public.reviews (user_id, external_id) where external_id is not null;

-- 3. Count one AI reply for a given user, from the server. Same rule as
--    increment_credits_used(), but the API has no user session, so the user
--    is passed in. Only the service role may call it.
create or replace function public.increment_credits_for_user(p_user_id uuid)
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
  return query
    update public.profiles as p
       set credits_used = p.credits_used + 1
     where p.id = p_user_id
       and (
         public.has_paid_access(p.plan, p.subscription_status)
         or (p.credits_used < p.credits_limit and p.trial_ends_at > now())
       )
    returning p.credits_used, p.credits_limit, p.plan, p.trial_ends_at,
              p.subscription_status;
end;
$$;

revoke all on function public.increment_credits_for_user(uuid) from public, anon, authenticated;
grant execute on function public.increment_credits_for_user(uuid) to service_role;
