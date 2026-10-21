-- 0001_core.sql
create table public.users (
  id uuid primary key,
  email text not null,
  full_name text,
  city text,
  language text default 'en',
  role text check (role in ('learner','instructor','vendor','admin')) default 'learner',
  hourly_rate numeric(10,2),
  onboarded boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.users enable row level security;

create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.admins enable row level security;

create or replace function public.is_admin(uid uuid) returns boolean as $$
  select exists(select 1 from public.admins where user_id = uid);
$$ language sql stable security definer;

-- policies (held for approval in preview)
create policy users_select_own on public.users for select using (auth.uid() = id or public.is_admin(auth.uid()));
create policy users_update_own on public.users for update using (auth.uid() = id) with check (auth.uid() = id);
create policy users_insert_auth on public.users for insert using (auth.uid() is not null);

create policy admins_select on public.admins for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy admins_insert_admin on public.admins for insert using (public.is_admin(auth.uid()));
