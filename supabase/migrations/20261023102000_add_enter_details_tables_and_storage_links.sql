create table if not exists enter_details (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  role text not null,
  payload jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (id)
);

alter table enter_details enable row level security;

create policy enter_details_select_self on enter_details for select using (auth.uid() = user_id or is_admin(auth.uid()));
create policy enter_details_insert on enter_details for insert with check (auth.uid() = user_id);
create policy enter_details_update on enter_details for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- simple storage links table for uploaded files
create table if not exists storage_files (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  key text not null,
  bucket text not null,
  metadata jsonb,
  created_at timestamptz default now(),
  primary key (id)
);
alter table storage_files enable row level security;
create policy storage_files_select_self on storage_files for select using (auth.uid() = user_id or is_admin(auth.uid()));
create policy storage_files_insert on storage_files for insert with check (auth.uid() = user_id);
create policy storage_files_delete on storage_files for delete using (auth.uid() = user_id);
