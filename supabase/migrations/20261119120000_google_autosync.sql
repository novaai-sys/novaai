-- NovaAI: native Google Business Profile auto-sync.
--
-- Run once in the Supabase SQL editor, after
-- 20261118200000_api_keys.sql. Safe to run again.

-- 1. Google connection: cached access token, health, and connected accounts.
--    Tokens are encrypted by the app (AES-256-GCM) before they are stored.
alter table public.google_connections add column if not exists access_token_encrypted text;
alter table public.google_connections add column if not exists token_expires_at timestamptz;
-- 'active', or 'needs_reconnect' when Google refuses the refresh token
-- (the owner removed access, changed password, or the token expired).
alter table public.google_connections add column if not exists status text not null default 'active';
alter table public.google_connections add column if not exists last_error text;
-- Google account resource names, e.g. {accounts/123}. The location IDs live
-- in public.locations (google_account_id, google_location_id).
alter table public.google_connections add column if not exists account_ids text[] not null default '{}';

alter table public.google_connections drop constraint if exists google_connections_status_check;
alter table public.google_connections add constraint google_connections_status_check
  check (status in ('active', 'needs_reconnect'));

-- The browser may read the connection's health, never its tokens.
grant select (id, user_id, google_email, scope, created_at, updated_at,
              token_expires_at, status, last_error, account_ids)
  on public.google_connections to authenticated;

-- 2. Per-location sync bookkeeping.
alter table public.locations add column if not exists last_sync_error text;
alter table public.locations add column if not exists last_sync_new int not null default 0;
-- While set in the future, another sync run owns this location.
alter table public.locations add column if not exists sync_locked_until timestamptz;

create index if not exists locations_last_synced_idx
  on public.locations (last_synced_at nulls first);

-- 3. Claim a location for one sync run, atomically. Returns false if another
--    run holds it, so two runs never reply to (and pay for) the same review.
create or replace function public.claim_location_sync(
  p_location_id uuid,
  p_lock_seconds int default 120
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.locations
     set sync_locked_until = now() + make_interval(secs => p_lock_seconds)
   where id = p_location_id
     and (sync_locked_until is null or sync_locked_until < now());
  return found;
end;
$$;

revoke all on function public.claim_location_sync(uuid, int) from public, anon, authenticated;
grant execute on function public.claim_location_sync(uuid, int) to service_role;
