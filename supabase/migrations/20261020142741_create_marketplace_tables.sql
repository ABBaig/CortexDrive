-- create profiles, admins, ratings, availability_slots, messages, gps_locations, bookings
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  full_name text,
  city text,
  phone text,
  hourly_rate numeric(10,2) default 0,
  verification_status text default 'unverified',
  created_at timestamptz default now()
);

create unique index if not exists profiles_user_id_idx on public.profiles(user_id);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id) not null,
  learner_id uuid references auth.users(id) not null,
  instructor_rate numeric(10,2) not null,
  service_type text not null,
  start_time timestamptz not null,
  end_time timestamptz,
  status text default 'booked',
  created_at timestamptz default now()
);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) not null,
  stars int check (stars >= 1 and stars <= 5),
  comment text,
  created_at timestamptz default now()
);

create table if not exists public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id) not null,
  day smallint not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) not null,
  sender_id uuid references auth.users(id) not null,
  body text not null,
  created_at timestamptz default now()
);

create table if not exists public.gps_locations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) not null,
  lat double precision,
  lng double precision,
  updated_at timestamptz default now()
);

-- enable RLS and policies
alter table public.profiles enable row level security;
-- profiles: owner can select/insert/update; authenticated users can select
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (auth.role() = 'authenticated' or true);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert with check (auth.uid() = user_id);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.admins enable row level security;
-- admins: only existing admins can select? allow authenticated select
drop policy if exists admins_select on public.admins;
create policy admins_select on public.admins for select using (auth.role() = 'authenticated' or true);

drop policy if exists admins_insert on public.admins;
create policy admins_insert on public.admins for insert with check (exists (select 1 from public.admins a where a.user_id = auth.uid()) );

alter table public.bookings enable row level security;
-- bookings: learner or instructor can select/insert/update; delete only admins
drop policy if exists bookings_select on public.bookings;
create policy bookings_select on public.bookings for select using (auth.uid() = learner_id or auth.uid() = instructor_id or exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists bookings_insert on public.bookings;
create policy bookings_insert on public.bookings for insert with check (auth.uid() = learner_id or auth.uid() = instructor_id or exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists bookings_update on public.bookings;
create policy bookings_update on public.bookings for update using (auth.uid() = learner_id or auth.uid() = instructor_id or exists (select 1 from public.admins a where a.user_id = auth.uid())) with check (auth.uid() = learner_id or auth.uid() = instructor_id or exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists bookings_delete on public.bookings;
create policy bookings_delete on public.bookings for delete using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

alter table public.ratings enable row level security;
-- ratings: allow select to authenticated, insert only if booking's learner created it
drop policy if exists ratings_select on public.ratings;
create policy ratings_select on public.ratings for select using (auth.role() = 'authenticated' or true);

drop policy if exists ratings_insert on public.ratings;
create policy ratings_insert on public.ratings for insert with check (exists (select 1 from public.bookings b where b.id = booking_id and b.learner_id = auth.uid()));

alter table public.availability_slots enable row level security;
-- availability: instructor owns rows
drop policy if exists slots_select on public.availability_slots;
create policy slots_select on public.availability_slots for select using (true);

drop policy if exists slots_insert on public.availability_slots;
create policy slots_insert on public.availability_slots for insert with check (auth.uid() = instructor_id);

drop policy if exists slots_update on public.availability_slots;
create policy slots_update on public.availability_slots for update using (auth.uid() = instructor_id) with check (auth.uid() = instructor_id);

alter table public.messages enable row level security;
-- messages: only booking's learner or instructor can select/insert
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select using (exists (select 1 from public.bookings b where b.id = booking_id and (b.learner_id = auth.uid() or b.instructor_id = auth.uid())));

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert with check (exists (select 1 from public.bookings b where b.id = booking_id and (b.learner_id = auth.uid() or b.instructor_id = auth.uid())));

alter table public.gps_locations enable row level security;
-- gps: only booking participants can select/insert/update
drop policy if exists gps_select on public.gps_locations;
create policy gps_select on public.gps_locations for select using (exists (select 1 from public.bookings b where b.id = booking_id and (b.learner_id = auth.uid() or b.instructor_id = auth.uid())));

drop policy if exists gps_insert on public.gps_locations;
create policy gps_insert on public.gps_locations for insert with check (exists (select 1 from public.bookings b where b.id = booking_id and b.instructor_id = auth.uid()));

drop policy if exists gps_update on public.gps_locations;
create policy gps_update on public.gps_locations for update using (exists (select 1 from public.bookings b where b.id = booking_id and b.instructor_id = auth.uid())) with check (exists (select 1 from public.bookings b where b.id = booking_id and b.instructor_id = auth.uid()));

-- Indexes
create index if not exists bookings_instructor_idx on public.bookings(instructor_id);
create index if not exists bookings_learner_idx on public.bookings(learner_id);
create index if not exists messages_booking_idx on public.messages(booking_id);
create index if not exists gps_booking_idx on public.gps_locations(booking_id);

-- Grant execute on pgcrypto if needed (gen_random_uuid)
-- (Assumes extension exists)
