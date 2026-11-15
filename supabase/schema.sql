-- NovaAI expects these two tables. You already created them, so use this file
-- as a checklist: column names and types must match, and row level security
-- needs the policies at the bottom or the dashboard will show no data.
--
-- Running it in the Supabase SQL editor keeps existing tables and data. It
-- only replaces the two policies named "Own settings" and "Own reviews".

create table if not exists public.business_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  business_name text not null default 'My business',
  tone_of_voice text not null default 'Warm',
  autopilot_enabled boolean not null default true,
  alert_email text
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  reviewer_name text not null,
  rating int not null check (rating between 1 and 5),
  review_text text not null,
  ai_reply text,
  -- NovaAI writes 'pending' (waiting for approval) or 'published'.
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists reviews_user_created_idx
  on public.reviews (user_id, created_at desc);

-- Each user can only see and change their own rows.
alter table public.business_settings enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "Own settings" on public.business_settings;
create policy "Own settings" on public.business_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Own reviews" on public.reviews;
create policy "Own reviews" on public.reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
