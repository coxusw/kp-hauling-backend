-- KP Hauling timecard/payroll tables for the existing Supabase project.
-- Run this once in Supabase SQL Editor before using the live Timecard tab.

create table if not exists public.kp_hauling_driver_hourly_rates (
  driver_id uuid primary key references public.kp_hauling_profiles(id) on delete cascade,
  hourly_rate numeric(10,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.kp_hauling_driver_timecards (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references public.kp_hauling_profiles(id) on delete set null,
  driver_name text not null,
  work_date date not null,
  start_time time not null,
  end_time time not null,
  note text not null,
  paid_at date,
  paid_amount numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kp_hauling_timecard_valid_time check (start_time < end_time)
);

alter table public.kp_hauling_driver_hourly_rates enable row level security;
alter table public.kp_hauling_driver_timecards enable row level security;

drop policy if exists "KP users read driver hourly rates" on public.kp_hauling_driver_hourly_rates;
create policy "KP users read driver hourly rates"
on public.kp_hauling_driver_hourly_rates for select
to authenticated
using (driver_id = auth.uid() or public.kp_hauling_is_admin());

drop policy if exists "KP admins manage driver hourly rates" on public.kp_hauling_driver_hourly_rates;
create policy "KP admins manage driver hourly rates"
on public.kp_hauling_driver_hourly_rates for all
to authenticated
using (public.kp_hauling_is_admin())
with check (public.kp_hauling_is_admin());

drop policy if exists "KP users read timecards" on public.kp_hauling_driver_timecards;
create policy "KP users read timecards"
on public.kp_hauling_driver_timecards for select
to authenticated
using (driver_id = auth.uid() or public.kp_hauling_is_admin());

drop policy if exists "KP drivers add own timecards" on public.kp_hauling_driver_timecards;
create policy "KP drivers add own timecards"
on public.kp_hauling_driver_timecards for insert
to authenticated
with check (driver_id = auth.uid() or public.kp_hauling_is_admin());

drop policy if exists "KP admins update timecards" on public.kp_hauling_driver_timecards;
create policy "KP admins update timecards"
on public.kp_hauling_driver_timecards for update
to authenticated
using (public.kp_hauling_is_admin())
with check (public.kp_hauling_is_admin());

drop policy if exists "KP admins delete timecards" on public.kp_hauling_driver_timecards;
create policy "KP admins delete timecards"
on public.kp_hauling_driver_timecards for delete
to authenticated
using (public.kp_hauling_is_admin());
