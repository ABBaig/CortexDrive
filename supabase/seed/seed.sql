-- seed.sql: demo data for CortexDrive
-- Creates one learner, one instructor, one vendor, one admin and sample rows

insert into users (id, email, phone, role, full_name)
values
  (gen_random_uuid(), 'learner@example.com', '+923001234567', 'learner', 'Demo Learner'),
  (gen_random_uuid(), 'instructor@example.com', '+923001234568', 'instructor', 'Demo Instructor'),
  (gen_random_uuid(), 'vendor@example.com', '+923001234569', 'vendor', 'Demo Vendor'),
  (gen_random_uuid(), 'admin@example.com', '+923001234560', 'admin', 'Super Admin');

-- Note: wallets and related data should be created by Edge Functions or via direct DB access with service role.

insert into sos_alerts (id, user_id, lat, lng, message)
select gen_random_uuid(), id, 31.5204, 74.3587, 'Test SOS Alert' from users where email = 'learner@example.com' limit 1;

-- minimal booking sample
insert into bookings (id, learner_id, provider_id, status, scheduled_at)
select gen_random_uuid(), l.id, p.id, 'confirmed', now() + interval '2 days'
from (select id from users where email = 'learner@example.com' limit 1) l,
     (select id from users where email = 'instructor@example.com' limit 1) p;

-- license_progress sample
insert into license_progress (id, user_id, stage, notes)
select gen_random_uuid(), id, 1, 'Started theory' from users where email = 'learner@example.com' limit 1;

-- verifications sample
insert into verifications (id, user_id, type, status)
select gen_random_uuid(), id, 'cnic', 'verified' from users where email = 'learner@example.com' limit 1;

-- vehicle_logs sample
insert into vehicle_logs (id, user_id, speed, fuel_level)
select gen_random_uuid(), id, 45, 0.6 from users where email = 'learner@example.com' limit 1;

-- wallets and transactions left for Edge Functions to create with service role
