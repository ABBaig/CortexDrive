-- wallets
create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users default auth.uid(),
  balance numeric not null default 0,
  created_at timestamptz default now()
);
alter table wallets enable row level security;
create policy wallets_select on wallets for select using (auth.uid() = user_id or exists (select 1 from admins a where a.user_id = auth.uid()));
create policy wallets_insert on wallets for insert with check (auth.uid() = user_id or exists (select 1 from admins a where a.user_id = auth.uid()));
create policy wallets_update on wallets for update using (auth.uid() = user_id or exists (select 1 from admins a where a.user_id = auth.uid())) with check (auth.uid() = user_id or exists (select 1 from admins a where a.user_id = auth.uid()));

-- transactions
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id),
  kind text not null,
  amount numeric not null,
  balance_after numeric not null,
  meta jsonb default '{}',
  related_booking uuid,
  created_at timestamptz default now()
);
alter table transactions enable row level security;
create policy transactions_select on transactions for select using (exists (select 1 from wallets w where w.id = transactions.wallet_id and (w.user_id = auth.uid() or exists (select 1 from admins a where a.user_id = auth.uid()))));
create policy transactions_insert on transactions for insert with check (exists (select 1 from wallets w where w.id = transactions.wallet_id and (w.user_id = auth.uid() or exists (select 1 from admins a where a.user_id = auth.uid()))));

-- platform_settings
create table if not exists platform_settings (
  key text primary key,
  value text not null,
  created_at timestamptz default now()
);
alter table platform_settings enable row level security;
create policy platform_settings_select on platform_settings for select using (auth.role() = 'authenticated');
create policy platform_settings_update on platform_settings for update using (exists (select 1 from admins a where a.user_id = auth.uid())) with check (exists (select 1 from admins a where a.user_id = auth.uid()));

-- sos_alerts
create table if not exists sos_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  lat double precision,
  lng double precision,
  booking_id uuid,
  status text default 'open',
  created_at timestamptz default now()
);
alter table sos_alerts enable row level security;
create policy sos_select on sos_alerts for select using (auth.uid() = user_id or exists (select 1 from admins a where a.user_id = auth.uid()));
create policy sos_insert on sos_alerts for insert with check (auth.uid() = user_id);

-- vehicle_logs
create table if not exists vehicle_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  odometer_km numeric,
  liters numeric,
  amount_pkr numeric,
  meta jsonb default '{}',
  created_at timestamptz default now()
);
alter table vehicle_logs enable row level security;
create policy vehicle_logs_select on vehicle_logs for select using (auth.uid() = user_id or exists (select 1 from admins a where a.user_id = auth.uid()));
create policy vehicle_logs_insert on vehicle_logs for insert with check (auth.uid() = user_id);

-- ensure bookings have related fields
alter table bookings add column if not exists vendor_id uuid;

-- seed platform fee default 10%
insert into platform_settings (key, value) values ('platform_fee_percent', '10') on conflict (key) do nothing;
