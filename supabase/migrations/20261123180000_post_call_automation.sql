-- NovaAI: post-call automation.
-- Links each business (Retell agent) to a client account, adds the client's
-- notification and caller-text settings, and records every call's outcome
-- and the delivery of the three follow-ups: owner text, caller text and
-- owner email. Clients can read their own calls and edit their own settings.
-- Safe to run more than once. Run after 20261121200000_calls_sms.sql.

-- ---------- businesses: owner account and settings ----------
alter table public.businesses
  add column if not exists user_id uuid references auth.users (id) on delete set null,
  add column if not exists notify_email text,
  add column if not exists email_enabled boolean not null default true,
  add column if not exists caller_sms_enabled boolean not null default false,
  add column if not exists caller_sms_booked_template text,
  add column if not exists caller_sms_followup_template text,
  add column if not exists followup_link text not null default '';

-- The owner's phone can now be set (or cleared) by the client.
alter table public.businesses alter column owner_phone drop not null;

create index if not exists businesses_user_idx on public.businesses (user_id);

do $$ begin
  alter table public.businesses add constraint businesses_notify_email_check
    check (notify_email is null or notify_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.businesses add constraint businesses_templates_length_check
    check (coalesce(length(caller_sms_booked_template), 0) <= 480
       and coalesce(length(caller_sms_followup_template), 0) <= 480);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.businesses add constraint businesses_followup_link_check
    check (followup_link = '' or followup_link ~* '^https://[^\s]+$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.businesses add constraint businesses_name_length_check
    check (length(name) between 1 and 80);
exception when duplicate_object then null; end $$;

-- Clients see and edit only their own business, and only these columns.
drop policy if exists "Owners read their businesses" on public.businesses;
create policy "Owners read their businesses" on public.businesses
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Owners update their businesses" on public.businesses;
create policy "Owners update their businesses" on public.businesses
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.businesses from anon, authenticated;
grant select (id, created_at, user_id, name, retell_agent_id, owner_phone, sms_enabled,
              notify_email, email_enabled, caller_sms_enabled,
              caller_sms_booked_template, caller_sms_followup_template, followup_link)
  on public.businesses to authenticated;
grant update (name, owner_phone, sms_enabled, notify_email, email_enabled, caller_sms_enabled,
              caller_sms_booked_template, caller_sms_followup_template, followup_link)
  on public.businesses to authenticated;

-- ---------- calls: client, outcome and follow-up delivery ----------
alter table public.calls
  add column if not exists user_id uuid references auth.users (id) on delete set null,
  add column if not exists outcome text not null default '',
  add column if not exists customer_name text not null default '',
  add column if not exists user_sentiment text not null default '',
  add column if not exists call_successful boolean,
  add column if not exists in_voicemail boolean,
  add column if not exists caller_sms_status text not null default 'pending',
  add column if not exists caller_sms_to text not null default '',
  add column if not exists caller_sms_body text not null default '',
  add column if not exists caller_sms_message_id text not null default '',
  add column if not exists caller_sms_error text not null default '',
  add column if not exists email_status text not null default 'pending',
  add column if not exists email_to text not null default '',
  add column if not exists email_subject text not null default '',
  add column if not exists email_message_id text not null default '',
  add column if not exists email_error text not null default '';

do $$ begin
  alter table public.calls add constraint calls_caller_sms_status_check
    check (caller_sms_status in ('pending','sending','sent','failed','skipped'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.calls add constraint calls_email_status_check
    check (email_status in ('pending','sending','sent','failed','skipped'));
exception when duplicate_object then null; end $$;

create index if not exists calls_user_created_idx on public.calls (user_id, created_at desc);

-- Calls already saved belong to the business's owner.
update public.calls c set user_id = b.user_id
  from public.businesses b
  where c.business_id = b.id and c.user_id is null and b.user_id is not null;

drop policy if exists "Owners read their calls" on public.calls;
create policy "Owners read their calls" on public.calls
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.calls from anon, authenticated;
grant select on public.calls to authenticated;

-- ---------- helper: link a business to a client by email ----------
-- select public.assign_business_owner('agent_xxx', 'owner@shop.com');
create or replace function public.assign_business_owner(p_agent_id text, p_email text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid;
  v_business uuid;
begin
  select id into v_user from auth.users where lower(email) = lower(p_email);
  if v_user is null then
    raise exception 'No NovaAI account with the email %', p_email;
  end if;
  update businesses set user_id = v_user where retell_agent_id = p_agent_id returning id into v_business;
  if v_business is null then
    raise exception 'No business with the Retell agent %', p_agent_id;
  end if;
  update calls set user_id = v_user where business_id = v_business and user_id is null;
  return v_business;
end;
$$;
revoke all on function public.assign_business_owner(text, text) from public, anon, authenticated;
