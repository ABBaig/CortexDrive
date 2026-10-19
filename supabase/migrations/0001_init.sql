-- 0001_init.sql
-- Initial schema for CortexDrive (tables from SPEC.md section 6)

create extension if not exists pgcrypto;

-- users table
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  phone text unique,
  role text not null default 'learner' check (role in ('learner','instructor','vendor','admin')),
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- verifications
create table if not exists verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('cnic','license','registration')),
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- license_progress
create table if not exists license_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  stage integer not null check (stage >= 0),
  notes text,
  updated_at timestamptz not null default now()
);

-- bookings
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references users(id) on delete cascade,
  provider_id uuid references users(id) on delete set null,
  service_id uuid,
  status text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- wallets
create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  currency text not null default 'PKR',
  balance numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- transactions
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id) on delete cascade,
  amount numeric not null,
  type text not null check (type in ('credit','debit','hold','release','fee','payout','refund')),
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- sos_alerts
create table if not exists sos_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  lat double precision,
  lng double precision,
  message text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- vehicle_logs
create table if not exists vehicle_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  speed numeric,
  fuel_level numeric,
  recorded_at timestamptz not null default now()
);

-- Storage bucket creation note: create via Supabase UI or API. Policy below assumes bucket 'documents' exists.

-- Enable row level security on relevant tables
alter table users enable row level security;
alter table verifications enable row level security;
alter table license_progress enable row level security;
alter table bookings enable row level security;
alter table wallets enable row level security;
alter table transactions enable row level security;
alter table sos_alerts enable row level security;
alter table vehicle_logs enable row level security;

-- Deny access by default
-- Create policies

-- users: allow select/update to self; admins full access
create policy "users_select_self_or_admin" on users for select using (
  auth.role() = 'anon' and false
) with check (true);

create policy "users_self" on users for select using (
  auth.uid() = id
);
create policy "users_update_self" on users for update using (
  auth.uid() = id
) with check (auth.uid() = id);

create policy "users_admin_full" on users for all using (
  exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
);

-- verifications: learners can see their own; admins can manage
create policy "verifications_select_own_or_admin" on verifications for select using (
  user_id = auth.uid() or exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
);
create policy "verifications_insert" on verifications for insert using (
  auth.uid() is not null
) with check (user_id = auth.uid() or exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin'));
create policy "verifications_update_admin" on verifications for update using (
  exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
);

-- license_progress
create policy "license_progress_select_own_or_admin" on license_progress for select using (
  user_id = auth.uid() or exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
);
create policy "license_progress_insert" on license_progress for insert using (
  auth.uid() is not null
) with check (user_id = auth.uid() or exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin'));
create policy "license_progress_update_admin" on license_progress for update using (
  exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
);

-- bookings: learners read where learner_id = auth.uid; instructors/vendors where provider_id = auth.uid; admins full
create policy "bookings_select_learner" on bookings for select using (
  learner_id = auth.uid()
);
create policy "bookings_select_provider" on bookings for select using (
  provider_id = auth.uid()
);
create policy "bookings_select_admin" on bookings for select using (
  exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
);
create policy "bookings_insert_learner" on bookings for insert using (
  auth.uid() is not null
) with check (learner_id = auth.uid() or exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin'));
create policy "bookings_update_provider_or_admin" on bookings for update using (
  provider_id = auth.uid() or exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
) with check (true);

-- wallets: users see only their wallet; transactions read via wallet relation; admins full
create policy "wallets_select_own" on wallets for select using (
  user_id = auth.uid() or exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
);
create policy "wallets_update_admin" on wallets for update using (
  exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
);
create policy "wallets_insert" on wallets for insert using (
  auth.uid() is not null
) with check (user_id = auth.uid() or exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin'));

-- transactions: allow insert only from trusted service role or Edge Functions (check via function or role) - here we allow admins and service_role via RLS check placeholder
create policy "transactions_insert_edge" on transactions for insert using (
  exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
) with check (true);
create policy "transactions_select_wallet_owner_or_admin" on transactions for select using (
  exists (select 1 from wallets w where w.id = wallet_id and w.user_id = auth.uid()) or exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
);

-- sos_alerts: learner can insert their own; admins can read all; learners can read own
create policy "sos_insert_own" on sos_alerts for insert using (
  auth.uid() is not null
) with check (user_id = auth.uid());
create policy "sos_select_own_or_admin" on sos_alerts for select using (
  user_id = auth.uid() or exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
);
create policy "sos_update_admin" on sos_alerts for update using (
  exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
);

-- vehicle_logs: owner can insert/read own; admins full
create policy "vehicle_logs_insert_owner" on vehicle_logs for insert using (
  auth.uid() is not null
) with check (user_id = auth.uid() or exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin'));
create policy "vehicle_logs_select_owner_or_admin" on vehicle_logs for select using (
  user_id = auth.uid() or exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
);

-- Storage bucket policy note: create a bucket 'documents' and configure RLS-like rules via Storage Policies in Supabase UI so users can only access their own folder (e.g., {userId}/*)

-- END OF MIGRATION
