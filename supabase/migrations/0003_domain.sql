-- 0003_domain.sql
create table if not exists public.verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  type text check (type in ('cnic','driving_license')),
  status text check (status in ('pending','verified','needs_review','rejected')) default 'pending',
  doc_url text,
  selfie_url text,
  ocr_payload jsonb,
  face_match_score numeric,
  ai_decision text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.verifications enable row level security;

create table if not exists public.license_progress (
  user_id uuid references public.users(id) on delete cascade primary key,
  stage int,
  notes text,
  updated_at timestamptz default now()
);
alter table public.license_progress enable row level security;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid references public.users(id) on delete cascade,
  instructor_id uuid references public.users(id) on delete cascade,
  slot_start timestamptz,
  slot_end timestamptz,
  status text check (status in ('booked','completed','no_show','refunded','cancelled')) default 'booked',
  amount numeric,
  platform_fee_pct numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.bookings enable row level security;

create table if not exists public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references public.users(id) on delete cascade,
  slot_start timestamptz,
  slot_end timestamptz,
  is_booked boolean default false
);
alter table public.availability_slots enable row level security;

create table if not exists public.ratings (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  learner_id uuid references public.users(id),
  instructor_id uuid references public.users(id),
  stars int check (stars between 1 and 5),
  comment text,
  created_at timestamptz default now()
);
alter table public.ratings enable row level security;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  sender_id uuid references public.users(id),
  body text,
  created_at timestamptz default now()
);
alter table public.messages enable row level security;

create table if not exists public.gps_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  lat double precision,
  lng double precision,
  recorded_at timestamptz default now()
);
alter table public.gps_locations enable row level security;

create table if not exists public.sos_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  lat double precision,
  lng double precision,
  message text,
  resolved boolean default false,
  created_at timestamptz default now()
);
alter table public.sos_alerts enable row level security;

create table if not exists public.vehicle_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  event_type text check (event_type in ('harsh_brake','harsh_accel','fuel','service')),
  speed_delta numeric,
  odometer_km numeric,
  liters numeric,
  amount_pkr numeric,
  created_at timestamptz default now()
);
alter table public.vehicle_logs enable row level security;

-- policies are held for approval
