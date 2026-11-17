-- NovaAI plans: free trial, Starter, Growth.
-- Run this once in the Supabase SQL editor, AFTER supabase/credits.sql.
-- It is safe to run again: nobody's plan, counter or trial date is reset.
--
-- Rules it enforces:
--   free     7-day trial, up to credits_limit (10) AI replies
--   starter  unlimited AI replies
--   growth   unlimited AI replies

-- 1. Plan and trial end date on every profile --------------------------------
alter table public.profiles
  add column if not exists plan text not null default 'free';

alter table public.profiles
  add column if not exists trial_ends_at timestamptz not null
  default (now() + interval '7 days');

alter table public.profiles
  drop constraint if exists profiles_plan_check;
alter table public.profiles
  add constraint profiles_plan_check check (plan in ('free', 'starter', 'growth'));

-- Users still cannot change their own row from the browser (credits.sql
-- revoked insert/update/delete). Plans are changed by an admin, below, or
-- later by a payment webhook running with the service role.

-- 2. Count one reply, by plan -----------------------------------------------
-- Paid plans: always counted, never refused.
-- Free trial: counted only while under the limit and before the trial ends.
-- Returns the new numbers, or no row at all when the reply is not allowed.
-- The return type changes, so the old function is dropped first.
drop function if exists public.increment_credits_used();

create function public.increment_credits_used()
returns table (
  credits_used int,
  credits_limit int,
  plan text,
  trial_ends_at timestamptz
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
         p.plan in ('starter', 'growth')
         or (p.credits_used < p.credits_limit and p.trial_ends_at > now())
       )
    returning p.credits_used, p.credits_limit, p.plan, p.trial_ends_at;
end;
$$;

revoke all on function public.increment_credits_used() from public, anon;
grant execute on function public.increment_credits_used() to authenticated;

-- 3. Admin examples (run in the SQL editor) ----------------------------------
-- Move a customer to a paid plan:
--   update public.profiles set plan = 'starter' where id = '<user uuid>';
-- Find a user's id by email:
--   select id from auth.users where email = 'owner@example.com';
-- Give a trial user 7 more days:
--   update public.profiles set trial_ends_at = now() + interval '7 days'
--   where id = '<user uuid>';
