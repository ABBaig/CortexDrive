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
-- 1. FEATURE 1 — Telematics columns on bookings
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
  v_amount numeric;
  v_grace numeric;
begin
  select * into b from bookings where id = p_booking_id;
  if not found or b.learner_id is distinct from auth.uid() then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0001';
  end if;

  if b.status <> 'booked' then
    raise exception 'NOT_ELIGIBLE' using errcode = 'P0003';
  end if;

  if exists (select 1 from transactions t
             where t.related_booking = p_booking_id and t.kind = 'refund') then
    raise exception 'ALREADY_REFUNDED' using errcode = 'P0005';
  end if;

  select coalesce(max(case when s.key = 'no_show_grace_minutes'
                          then s.value::numeric end), 15)
    into v_grace
  from platform_settings s;

  if now() < b.start_time + (v_grace || ' minutes')::interval then
    raise exception 'GRACE_NOT_PASSED' using errcode = 'P0004';
  end if;

  v_amount := coalesce(b.instructor_rate, 0);
  if v_amount <= 0 then
    raise exception 'NO_AMOUNT' using errcode = 'P0006';
  end if;

  select w.id into v_wallet_id from wallets w where w.user_id = b.learner_id limit 1;
  if v_wallet_id is null then
    insert into wallets (user_id, balance) values (b.learner_id, 0)
      returning id into v_wallet_id;
  end if;

  update wallets set balance = balance + v_amount where id = v_wallet_id
    returning balance into v_balance;

  update bookings set status = 'refunded' where id = p_booking_id;

  insert into transactions (wallet_id, kind, amount, balance_after, related_booking, meta)
  values (v_wallet_id, 'refund', v_amount, v_balance, p_booking_id,
          jsonb_build_object('reason', 'instructor_no_show', 'full_refund', true));

  return v_amount;
end $$;

revoke execute on function public.report_instructor_no_show(uuid) from anon;
grant execute on function public.report_instructor_no_show(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. BOOKING-CHAT LINK — conversation_bookings INSERT policy
-- ----------------------------------------------------------------------------
drop policy if exists "booking parties link conversation" on public.conversation_bookings;
create policy "booking parties link conversation" on public.conversation_bookings
  for insert with check (
    exists (select 1 from public.bookings b
            where b.id = booking_id
              and (b.learner_id = auth.uid() or b.instructor_id = auth.uid()))
  );

-- ----------------------------------------------------------------------------
-- 5. V2 — Vendor availability DELETE policy
-- ----------------------------------------------------------------------------
drop policy if exists "vendor deletes availability" on public.vendor_availability;
create policy "vendor deletes availability" on public.vendor_availability
  for delete using (vendor_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 6. V3 — Rating aggregate trigger
-- ----------------------------------------------------------------------------
create or replace function public.update_service_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into vendor_ratings (service_id, vendor_id, avg_rating, rating_count, updated_at)
  select
    b.service_id,
    b.provider_id,
    round(avg(r.rating)::numeric, 2),
    count(*)::int,
    now()
  from vendor_booking_ratings r
  join vendor_bookings b on b.id = r.booking_id
  where b.service_id = (select service_id from vendor_bookings where id = new.booking_id)
  group by b.service_id, b.provider_id
  on conflict (service_id) do update
    set avg_rating = excluded.avg_rating,
        rating_count = excluded.rating_count,
        updated_at = now();
  return new;
end $$;

drop trigger if exists vendor_booking_rating_agg on public.vendor_booking_ratings;
create trigger vendor_booking_rating_agg
  after insert on public.vendor_booking_ratings
  for each row execute function public.update_service_rating();

-- ----------------------------------------------------------------------------
-- 7. V4 — Reschedule/consensus UPDATE policies + client-callable admin check
-- ----------------------------------------------------------------------------
create or replace function public.is_admin_current_user()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_admin(auth.uid());
$$;

drop policy if exists "parties update reschedules" on public.vendor_booking_reschedules;
create policy "parties update reschedules" on public.vendor_booking_reschedules
  for update using (
    proposed_by = auth.uid()
    or public.is_admin(auth.uid())
    or exists (select 1 from public.vendor_bookings b
               where b.id = vendor_booking_reschedules.booking_id
                 and (b.learner_id = auth.uid() or b.provider_id = auth.uid()))
  );

drop policy if exists "voters update consensus" on public.vendor_booking_consensus;
create policy "voters update consensus" on public.vendor_booking_consensus
  for update using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 8. V5 — Vendor booking payments (escrow → fee-split → refund trigger)
-- ----------------------------------------------------------------------------
create or replace function public.handle_vendor_booking_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
  v_fee_pct numeric;
  v_fee numeric;
  v_net numeric;
  v_learner_wallet_id uuid;
  v_vendor_wallet_id uuid;
  v_balance numeric;
begin
  v_total := coalesce(new.total_price, 0);
  if v_total <= 0 then
    return new;
  end if;

  if new.status = 'booked' and old.status = 'pending' then
    if exists (select 1 from transactions t
               where t.related_booking = new.id and t.kind = 'escrow_hold') then
      return new;
    end if;

    select w.id, w.balance into v_learner_wallet_id, v_balance
    from wallets w where w.user_id = new.learner_id limit 1;

    if v_learner_wallet_id is null or v_balance is null or v_balance < v_total then
      raise exception 'INSUFFICIENT_FUNDS'
        using errcode = 'P0002',
              message = 'Learner wallet has insufficient funds for this booking';
    end if;

    update wallets set balance = balance - v_total where id = v_learner_wallet_id
      returning balance into v_balance;

    insert into transactions (wallet_id, kind, amount, balance_after, meta, related_booking)
    values (v_learner_wallet_id, 'escrow_hold', v_total, v_balance,
            jsonb_build_object('vendor_booking_id', new.id), new.id);

  elsif new.status = 'completed' then
    if exists (select 1 from transactions t
               where t.related_booking = new.id and t.kind = 'fee_split') then
      return new;
    end if;
    if not exists (select 1 from transactions t
                   where t.related_booking = new.id and t.kind = 'escrow_hold') then
      return new;
    end if;

    select coalesce(max(case when s.key = 'platform_fee_percent'
                        then s.value::numeric end), 10)
      into v_fee_pct
    from platform_settings s;

    v_fee := round(v_total * v_fee_pct / 100.0, 2);
    v_net := v_total - v_fee;

    select w.id into v_vendor_wallet_id
    from wallets w where w.user_id = new.provider_id limit 1;

    if v_vendor_wallet_id is null then
      insert into wallets (user_id, balance) values (new.provider_id, 0)
        returning id into v_vendor_wallet_id;
    end if;

    update wallets set balance = balance + v_net where id = v_vendor_wallet_id
      returning balance into v_balance;

    insert into transactions (wallet_id, kind, amount, balance_after, meta, related_booking)
    values (v_vendor_wallet_id, 'fee_split', v_net, v_balance,
            jsonb_build_object('vendor_booking_id', new.id,
                                'gross', v_total,
                                'platform_fee', v_fee,
                                'platform_fee_percent', v_fee_pct),
            new.id);

  elsif new.status = 'cancelled' then
    if exists (select 1 from transactions t
               where t.related_booking = new.id and t.kind = 'refund') then
      return new;
    end if;
    if not exists (select 1 from transactions t
                   where t.related_booking = new.id and t.kind = 'escrow_hold') then
      return new;
    end if;

    select w.id into v_learner_wallet_id
    from wallets w where w.user_id = new.learner_id limit 1;

    if v_learner_wallet_id is null then
      insert into wallets (user_id, balance) values (new.learner_id, 0)
        returning id into v_learner_wallet_id;
    end if;

    update wallets set balance = balance + v_total where id = v_learner_wallet_id
      returning balance into v_balance;

    insert into transactions (wallet_id, kind, amount, balance_after, meta, related_booking)
    values (v_learner_wallet_id, 'refund', v_total, v_balance,
            jsonb_build_object('vendor_booking_id', new.id), new.id);
  end if;

  return new;
end $$;

drop trigger if exists vendor_booking_payment on public.vendor_bookings;
create trigger vendor_booking_payment
  after update on public.vendor_bookings
  for each row execute function public.handle_vendor_booking_payment();

-- ----------------------------------------------------------------------------
-- 9. VERIFICATIONS — policies, columns, constraints, storage bucket
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('verifications', 'verifications', false)
on conflict (id) do nothing;

drop policy if exists "verif_storage_insert_own_folder" on storage.objects;
create policy "verif_storage_insert_own_folder"
on storage.objects for insert to authenticated
with check (bucket_id = 'verifications' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "verif_storage_select_own_folder" on storage.objects;
create policy "verif_storage_select_own_folder"
on storage.objects for select to authenticated
using (bucket_id = 'verifications' and (storage.foldername(name))[1] = auth.uid()::text);

alter table public.verifications
  add column if not exists doc_url text,
  add column if not exists selfie_url text,
  add column if not exists ocr_payload jsonb,
  add column if not exists face_match_score numeric,
  add column if not exists ai_decision text;

do $$ begin
  if exists (select 1 from pg_constraint where conname = 'verifications_type_check') then
    alter table public.verifications drop constraint verifications_type_check;
  end if;
end $$;
alter table public.verifications
  add constraint verifications_type_check check (type in ('cnic','driving_license','license','registration'));

do $$ begin
  if exists (select 1 from pg_constraint where conname = 'verifications_status_check') then
    alter table public.verifications drop constraint verifications_status_check;
  end if;
end $$;
alter table public.verifications
  add constraint verifications_status_check check (status in ('pending','verified','needs_review','rejected','unverified'));

drop policy if exists "verifications_select_own_or_admin" on public.verifications;
create policy "verifications_select_own_or_admin"
  on public.verifications for select to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "verifications_insert_own" on public.verifications;
create policy "verifications_insert_own"
  on public.verifications for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "verifications_update_own_or_admin" on public.verifications;
create policy "verifications_update_own_or_admin"
  on public.verifications for update to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()))
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "license_progress_select_own_or_admin" on public.license_progress;
create policy "license_progress_select_own_or_admin"
  on public.license_progress for select to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "license_progress_upsert_own" on public.license_progress;
create policy "license_progress_upsert_own"
  on public.license_progress for all to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()))
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- 10. SIGNUP ROBUSTNESS — defensive handle_new_user trigger (never blocks auth)
--     + ensures users table has every column the app queries + saves role
-- ----------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  phone text unique,
  role text not null default 'learner' check (role in ('learner','instructor','vendor','admin')),
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users
  add column if not exists city text,
  add column if not exists language text default 'en',
  add column if not exists hourly_rate numeric(10,2) default 0,
  add column if not exists onboarded boolean default false,
  add column if not exists avg_rating numeric(3,2) default 0,
  add column if not exists verification_status text default 'unverified';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'learner');
  if v_role not in ('learner','instructor','vendor','admin') then
    v_role := 'learner';
  end if;

  begin
    insert into public.users (id, email, full_name, role, created_at, updated_at)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'full_name', null),
      v_role,
      now(),
      now()
    )
    on conflict (id) do update
      set full_name = coalesce(excluded.full_name, public.users.full_name),
          role = case when public.users.role = 'learner'
                      then excluded.role else public.users.role end,
          updated_at = now();
  exception when others then
    -- NEVER let a profile problem block account creation.
    raise warning 'handle_new_user: profile insert failed for %: %', new.id, sqlerrm;
  end;

  return new;
end $$;

drop trigger if exists auth_user_created on auth.users;
create trigger auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- DONE. Verify with:
--   select key, value from platform_settings;
--   select tablename from pg_publication_tables where pubname='supabase_realtime';
--   select indexname from pg_indexes where tablename='gps_locations';
--   select count(*) from pg_policies where schemaname='public';
--   select role, count(*) from public.users group by role;
-- ============================================================================
