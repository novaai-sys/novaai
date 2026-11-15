-- NovaAI free-usage limit: every user gets 10 free AI replies.
-- Run this whole file once in the Supabase SQL editor. It is safe to run
-- again: it does not reset anyone's counter.

-- 1. One row per user ------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  credits_used int not null default 0 check (credits_used >= 0),
  credits_limit int not null default 10 check (credits_limit >= 0),
  created_at timestamptz not null default now()
);

-- 2. Row level security ----------------------------------------------------
-- Users may READ their own row. There is deliberately no insert, update or
-- delete policy: if users could update this table from the browser they
-- could reset their own counter. Changes only happen through the trigger
-- and the function below.
alter table public.profiles enable row level security;

drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile" on public.profiles
  for select using (auth.uid() = id);

revoke insert, update, delete on public.profiles from anon, authenticated;

-- 3. Give every new user their 10 free replies -------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users who signed up before this file was run get a row too.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- 4. Count one reply, safely -----------------------------------------------
-- Adds 1 to the caller's own counter, and only while they are under their
-- limit. The check and the update are a single statement, so two requests
-- at the same moment cannot both take the last credit.
-- Returns the new numbers, or no row at all when the limit is reached.
create or replace function public.increment_credits_used()
returns table (credits_used int, credits_limit int)
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
       and p.credits_used < p.credits_limit
    returning p.credits_used, p.credits_limit;
end;
$$;

revoke all on function public.increment_credits_used() from public, anon;
grant execute on function public.increment_credits_used() to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- To give someone more replies later, run as admin in the SQL editor:
--   update public.profiles set credits_limit = 50 where id = '<user uuid>';
