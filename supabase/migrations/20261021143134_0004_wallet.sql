create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.users(id) on delete cascade,
  balance numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.wallets enable row level security;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid references public.wallets(id) on delete cascade,
  booking_id uuid references public.bookings(id),
  kind text check (kind in ('credit','debit','hold','release','payout','fee','refund','topup')),
  amount numeric,
  balance_after numeric,
  metadata jsonb,
  created_at timestamptz default now()
);
alter table public.transactions enable row level security;

create table if not exists public.platform_settings (
  key text primary key,
  value numeric check (value >= 0 and value <= 100)
);
alter table public.platform_settings enable row level security;

insert into public.platform_settings (key, value) values ('platform_fee_pct', 10) on conflict (key) do nothing;

-- policies held for approval
