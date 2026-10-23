-- ============================================================================
-- CORTEXDRIVE — FINAL SUBMISSION SQL
-- One script, all pending migrations, in dependency order. Every statement is
-- idempotent (IF NOT EXISTS / ON CONFLICT / OR REPLACE / DROP-then-CREATE
-- policies) so re-running the whole script is safe.
--
-- Run once in the Supabase SQL editor before final submission/demo.
-- Prerequisite: the base migrations (0001_init, 0003_domain, 0004_wallet,
-- 20261020 marketplace, 20261020 wallets, chat core) have been applied.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FEATURE 1 — Telemations columns on bookings
-- ----------------------------------------------------------------------------

alter table public.bookings
  add column if not exists telematics jsonb,
  add column if not exists telematics_score smallint
    check (telematics_score is null or telematics_score between 0 and 100);

-- ----------------------------------------------------------------------------
-- 2. FEATURE 2 — GPS realtime + one live fix per booking
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication
             where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime'
                     and schemaname = 'public'
                     and tablename = 'gps_locations') then
      alter publication supabase_realtime add table public.gps_locations;
    end if;
  end if;
end $$;

drop index if exists public.gps_booking_idx;
create unique index if not exists gps_locations_booking_uidx
  on public.gps_locations (booking_id);

-- ----------------------------------------------------------------------------
-- 3. FEATURE 3 — No-show auto-refund (grace setting + atomic RPC)
-- ----------------------------------------------------------------------------
insert into platform_settings (key, value)
values ('no_show_grace_minutes', '15')
on conflict (key) do nothing;

create or replace function public.report_instructor_no_show(p_booking_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  b record;
  v_wallet_id uuid;
  v_balance numeric;
  v user numeric;
begin
  select * into b from bookings where id = p_booking_id;
  if not found or b.learner_id is distinct from auth.uid() then
  end if;
end $$;
