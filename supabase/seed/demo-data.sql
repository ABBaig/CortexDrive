-- demo-data.sql (deterministic UUIDs)
-- Insert 7 auth.users entries are held for preview security; see README.
-- The preview does not allow inserting into auth.users via migrations.

-- Seed application-level rows that do not require service role where possible
insert into public.users (id, email, full_name, city, language, role, hourly_rate, onboarded, created_at, updated_at)
values
('a0a0a0a0-0000-4000-8000-000000000001','amna@example.com','Amna','Lahore','en','learner',0,false,now(),now()),
('a0a0a0a0-0000-4000-8000-000000000002','rizwan@example.com','Rizwan','Lahore','en','instructor',25.00,true,now(),now()),
('a0a0a0a0-0000-4000-8000-000000000003','ayesha@example.com','Ayesha','Karachi','en','learner',0,false,now(),now()),
('a0a0a0a0-0000-4000-8000-000000000004','kamran@example.com','Kamran','Islamabad','en','instructor',30.00,true,now(),now()),
('a0a0a0a0-0000-4000-8000-000000000005','bilal@example.com','Bilal','Rawalpindi','en','learner',0,false,now(),now()),
('a0a0a0a0-0000-4000-8000-000000000006','usman@example.com','Usman','Multan','en','vendor',0,false,now(),now()),
('a0a0a0a0-0000-4000-8000-000000000007','faisal@example.com','Faisal','Lahore','en','admin',0,true,now(),now())
on conflict (id) do nothing;

-- Admins
insert into public.admins (user_id) values ('a0a0a0a0-0000-4000-8000-000000000007') on conflict (user_id) do nothing;

-- Wallets
insert into public.wallets (id, user_id, balance) values
(gen_random_uuid(), 'a0a0a0a0-0000-4000-8000-000000000002', 100.00),
(gen_random_uuid(), 'a0a0a0a0-0000-4000-8000-000000000004', 50.00),
(gen_random_uuid(), 'a0a0a0a0-0000-4000-8000-000000000007', 1000.00)
on conflict do nothing;

-- Availability
insert into public.availability_slots (id, instructor_id, slot_start, slot_end, is_booked) values
(gen_random_uuid(), 'a0a0a0a0-0000-4000-8000-000000000002', now() + interval '1 day', now() + interval '1 day' + interval '1 hour', false)
on conflict do nothing;

-- One completed booking + rating
insert into public.bookings (id, learner_id, instructor_id, slot_start, slot_end, status, amount, platform_fee_pct) values
(gen_random_uuid(), 'a0a0a0a0-0000-4000-8000-000000000001','a0a0a0a0-0000-4000-8000-000000000002', now() - interval '2 days', now() - interval '2 days' + interval '1 hour','completed', 25.00, 10) on conflict do nothing;

-- Ratings
insert into public.ratings (booking_id, learner_id, instructor_id, stars, comment) select b.id, b.learner_id, b.instructor_id, 5, 'Great lesson' from public.bookings b where b.status = 'completed' limit 1 on conflict do nothing;

-- Transactions (simple)
insert into public.transactions (id, wallet_id, booking_id, kind, amount, balance_after) 
select gen_random_uuid(), w.id, b.id, 'credit', b.amount, w.balance + b.amount from public.wallets w join public.bookings b on w.user_id = b.instructor_id where b.status = 'completed' limit 1 on conflict do nothing;
