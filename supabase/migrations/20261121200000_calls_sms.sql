-- NovaAI dispatcher: businesses (who gets the job texts) and calls (one row
-- per call Jessica answers, with the SMS summary status).
-- Safe to run more than once. Only the server (service role) uses these.

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  -- The Retell agent that answers this business's calls (Retell > Agents).
  retell_agent_id text not null unique,
  -- Where job texts go, in E.164 format, e.g. +15125550100.
  owner_phone text not null check (owner_phone ~ '^\+[1-9][0-9]{7,14}$'),
  sms_enabled boolean not null default true,
  notes text not null default ''
);
alter table public.businesses enable row level security;
revoke all on public.businesses from anon, authenticated;

create table if not exists public.calls (
  call_id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  agent_id text not null default '',
  business_id uuid references public.businesses (id) on delete set null,
  call_type text not null default '',
  direction text not null default '',
  from_number text not null default '',
  to_number text not null default '',
  started_at timestamptz,
  ended_at timestamptz,
  duration_ms integer,
  disconnection_reason text not null default '',
  summary text not null default '',
  analysis jsonb not null default '{}'::jsonb,
  recording_url text not null default '',
  transcript text not null default '',
  -- pending: waiting for call_analyzed; sending: being sent now;
  -- sent / failed / skipped: final (failed may be retried).
  sms_status text not null default 'pending'
    check (sms_status in ('pending','sending','sent','failed','skipped')),
  sms_to text not null default '',
  sms_body text not null default '',
  sms_message_id text not null default '',
  sms_error text not null default ''
);
create index if not exists calls_business_created_idx on public.calls (business_id, created_at desc);
create index if not exists calls_agent_created_idx on public.calls (agent_id, created_at desc);
alter table public.calls enable row level security;
revoke all on public.calls from anon, authenticated;
