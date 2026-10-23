-- 20261023200000_fix_signup_trigger.sql
-- Signup robustness fix:
-- 1) The old handle_new_user trigger inserted into public.users with NO error
--    handling. If the insert fails (missing table/column, schema drift), the
--    exception aborts the auth.users insert too — Supabase returns
--    "Database error saving new user" and the signup UI shows a red error and
--    never proceeds. This version wraps the insert in its own exception block
--    so account creation ALWAYS succeeds, and logs the failure instead.
-- 2) The old trigger ignored the role chosen at signup (raw_user_meta_data),
--    so instructor/vendor signups landed as 'learner'. This version persists
--    it (validated).
-- 3) Ensures public.users exists and has every column the app queries.
-- 4) Grants so the auth service (supabase_auth_admin, which runs the trigger
--    on auth.users during signup) can execute the function and write the
--    profile row. Without these, EVERY signup fails with a bare
--    "500 Internal Server Error" and an empty error body.
-- Idempotent: safe to re-run.

-- 3) Ensure the users table exists with the full shape the app expects.
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

-- 1) + 2) Defensive trigger.
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

-- 4) Auth-service grants — the missing piece that caused the bare 500.
--    GoTrue runs as supabase_auth_admin and fires the trigger during signup.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.handle_new_user to supabase_auth_admin;
grant select, insert, update on table public.users to supabase_auth_admin;
