-- 003_verifications_kit.sql
-- CNIC AI Verification Kit: adds doc/selfie storage paths, OCR payload, face-match
-- score and needs_review status to the verifications table. Idempotent per AGENTS.md.

-- 1) Extend status check to include 'needs_review' (recreate constraint only if missing)
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'verifications_status_check'
  ) and not exists (
    select 1 from pg_constraint
    where conname = 'verifications_status_check'
      and pg_get_constraintdef(oid) like '%needs_review%'
  ) then
    alter table verifications drop constraint verifications_status_check;
    alter table verifications add constraint verifications_status_check
      check (status in ('pending','verified','needs_review','rejected'));
  end if;
end $$;

-- 2) Add columns required by the kit (idempotent)
alter table verifications add column if not exists doc_url text;
alter table verifications add column if not exists selfie_url text;
alter table verifications add column if not exists ocr_payload jsonb;
alter table verifications add column if not exists face_match_score numeric;
alter table verifications add column if not exists ai_decision text
  check (ai_decision is null or ai_decision in ('verified','needs_review','rejected'));

-- 3) Widen document type to include 'driving_license' used by the UI
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'verifications_type_check'
  ) and not exists (
    select 1 from pg_constraint
    where conname = 'verifications_type_check'
      and pg_get_constraintdef(oid) like '%driving_license%'
  ) then
    alter table verifications drop constraint verifications_type_check;
    alter table verifications add constraint verifications_type_check
      check (type in ('cnic','license','driving_license','registration'));
  end if;
end $$;

-- 4) RLS: allow the row owner to update their OWN verification row
--    (needed because the AI route updates status with an owner-checked filter;
--     admins keep full access via the existing admin policy)
create policy "verifications_update_own"
  on verifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 5) Owner-scoped read policy (already exists; kept explicit for the kit)
-- create policy "verifications_select_own_or_admin" ... (exists in 0001_init.sql)

-- 6) Storage bucket for verification images (private)
insert into storage.buckets (id, name, public)
values ('verifications', 'verifications', false)
on conflict (id) do nothing;

-- 7) Storage policies: users may upload into their own folder and read their own
--    files; the Edge Function uses the service role key (bypasses RLS).
create policy "verifications_storage_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'verifications' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "verifications_storage_select_own"
  on storage.objects for select
  using (bucket_id = 'verifications' and auth.uid()::text = (storage.foldername(name))[1]);
