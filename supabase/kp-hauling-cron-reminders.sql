-- KP Hauling due reminder cron support
-- Run this once in Supabase SQL Editor. It does not clear any data.

alter table public.kp_hauling_push_subscriptions
  add column if not exists daily_reminder_time time not null default '07:00';

alter table public.kp_hauling_push_subscriptions
  add column if not exists reminder_timezone text not null default 'America/Chicago';

create table if not exists public.kp_hauling_due_reminder_sends (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.kp_hauling_push_subscriptions(id) on delete cascade,
  user_id uuid not null references public.kp_hauling_profiles(id) on delete cascade,
  reminder_date date not null,
  created_at timestamptz not null default now(),
  unique (subscription_id, reminder_date)
);

alter table public.kp_hauling_due_reminder_sends enable row level security;

drop policy if exists "KP admins read due reminder sends" on public.kp_hauling_due_reminder_sends;
create policy "KP admins read due reminder sends"
on public.kp_hauling_due_reminder_sends for select
to authenticated
using (public.kp_hauling_is_admin());
