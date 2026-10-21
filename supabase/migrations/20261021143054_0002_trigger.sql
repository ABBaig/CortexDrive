-- 0002_trigger.sql
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.users (id, email, full_name, created_at, updated_at)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', null), now(), now())
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
