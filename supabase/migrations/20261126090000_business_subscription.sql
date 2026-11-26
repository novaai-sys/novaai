-- NovaAI: mirror each account's Paddle subscription onto its businesses.
-- The Paddle webhook writes the same values to profiles (the source of truth
-- for plan and access) and to every business the account owns.
-- Safe to run more than once. Run after 20261123180000_post_call_automation.sql.

alter table public.businesses
  add column if not exists plan text,
  add column if not exists subscription_status text,
  add column if not exists paddle_customer_id text,
  add column if not exists paddle_subscription_id text;

-- Clients can read these (not change them).
grant select (plan, subscription_status, paddle_customer_id, paddle_subscription_id)
  on public.businesses to authenticated;

-- Fill in businesses that already belong to a subscribed account.
update public.businesses b
   set plan = p.plan,
       subscription_status = p.subscription_status,
       paddle_customer_id = p.paddle_customer_id,
       paddle_subscription_id = p.paddle_subscription_id
  from public.profiles p
 where b.user_id = p.id
   and p.paddle_subscription_id is not null
   and b.paddle_subscription_id is distinct from p.paddle_subscription_id;
