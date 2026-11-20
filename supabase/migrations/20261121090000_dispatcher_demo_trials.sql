-- NovaAI dispatcher: live demo call limits and free-trial requests.
-- Safe to run more than once.

-- One row per demo web call started from the landing page. Only the server
-- (service role) reads or writes it.
create table if not exists public.demo_calls (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists demo_calls_ip_created_idx on public.demo_calls (ip_hash, created_at desc);
create index if not exists demo_calls_created_idx on public.demo_calls (created_at desc);
alter table public.demo_calls enable row level security;
revoke all on public.demo_calls from anon, authenticated;

-- Records a demo call if the visitor and the site are under their limits
-- for the last 24 hours. Returns 'ok', 'ip_limit' or 'daily_limit'.
create or replace function public.claim_demo_call(
  p_ip_hash text,
  p_per_ip int default 3,
  p_per_day int default 150
) returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  -- One claim at a time, so two clicks can't both pass the same count.
  perform pg_advisory_xact_lock(hashtext('claim_demo_call'));

  if (select count(*) from demo_calls
      where created_at > now() - interval '24 hours') >= p_per_day then
    return 'daily_limit';
  end if;

  if (select count(*) from demo_calls
      where ip_hash = p_ip_hash and created_at > now() - interval '24 hours') >= p_per_ip then
    return 'ip_limit';
  end if;

  insert into demo_calls (ip_hash) values (p_ip_hash);
  return 'ok';
end;
$$;

revoke all on function public.claim_demo_call(text, int, int) from public, anon, authenticated;
grant execute on function public.claim_demo_call(text, int, int) to service_role;

-- Free-trial requests from the landing page form.
create table if not exists public.trial_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  business text not null,
  email text not null,
  phone text not null,
  location text not null default '',
  trade text not null default '',
  plan text not null default '',
  notes text not null default '',
  ip_hash text not null default '',
  status text not null default 'new' check (status in ('new','contacted','live','won','lost'))
);
create index if not exists trial_requests_created_idx on public.trial_requests (created_at desc);
create index if not exists trial_requests_ip_idx on public.trial_requests (ip_hash, created_at desc);
alter table public.trial_requests enable row level security;
revoke all on public.trial_requests from anon, authenticated;
