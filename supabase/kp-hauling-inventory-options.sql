-- KP Hauling inventory option update
-- Run once in Supabase SQL Editor. This does not clear data.
-- It changes dumpster size/type fields from fixed enums to text so custom sizes can be saved.

alter table public.kp_hauling_dumpsters
  alter column size type text using size::text,
  alter column type type text using type::text,
  alter column type set default 'Roll-off';

alter table public.kp_hauling_jobs
  alter column dumpster_size type text using dumpster_size::text;

update public.kp_hauling_dumpsters
set type = 'Garbage'
where type = 'Mixed Debris';
