-- ============================================================================
-- demo-data.sql — CortexDrive demo seed
-- Run in Supabase SQL Editor (service role) AFTER the schema migration.
-- Demo password for ALL accounts: CortexDemo123
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0) Helper: fixed UUIDs (deterministic, works across teammates' machines)
-- ----------------------------------------------------------------------------
-- learner_amna :  a0a0a0a0-0000-4000-8000-000000000001
-- instructor_rizwan : a0a0a0a0-0000-4000-8000-000000000002
-- instructor_ayesha : a0a0a0a0-0000-4000-8000-000000000003
-- instructor_kamran : a0a0a0a0-0000-4000-8000-000000000004
-- vendor_bilal : a0a0a0a0-0000-4000-8000-000000000005
-- vendor_usman : a0a0a0a0-0000-4000-8000-000000000006
-- admin_faisal : a0a0a0a0-0000-4000-8000-000000000007

-- ----------------------------------------------------------------------------
-- 1) Auth users (Supabase auth.users — required for real login in demo)
-- ----------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('a0a0a0a0-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'amna@example.com', crypt('CortexDemo123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Amna Khan"}'),
  ('a0a0a0a0-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'rizwan@example.com', crypt('CortexDemo123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rizwan Ahmed"}'),
  ('a0a0a0a0-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'ayesha@example.com', crypt('CortexDemo123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ayesha Siddiqui"}'),
  ('a0a0a0a0-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'kamran@example.com', crypt('CortexDemo123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Kamran Ali"}'),
  ('a0a0a0a0-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'bilal@example.com', crypt('CortexDemo123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Bilal Hussain"}'),
  ('a0a0a0a0-0000-4000-8000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'usman@example.com', crypt('CortexDemo123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Usman Tariq"}'),
  ('a0a0a0a0-0000-4000-8000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'faisal@cortexdrive.pk', crypt('CortexDemo123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Faisal Mehmood"}')
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 2) App users (profiles + 4-tier RBAC)
-- ----------------------------------------------------------------------------
insert into users (id, full_name, role, phone, city, language, two_factor_enabled, verification_status) values
  ('a0a0a0a0-0000-4000-8000-000000000001', 'Amna Khan',        'learner',    '0300-1111111', 'Lahore',     'roman_ur', true,  'ai_verified'),
  ('a0a0a0a0-0000-4000-8000-000000000002', 'Rizwan Ahmed',     'instructor', '0301-2222222', 'Lahore',     'en',        true,  'ai_verified'),
  ('a0a0a0a0-0000-4000-8000-000000000003', 'Ayesha Siddiqui',  'instructor', '0302-3333333', 'Karachi',    'ur',        false, 'ai_verified'),
  ('a0a0a0a0-0000-4000-8000-000000000004', 'Kamran Ali',       'instructor', '0303-4444444', 'Islamabad', 'en',        false, 'pending'),
  ('a0a0a0a0-0000-4000-8000-000000000005', 'Bilal Hussain',    'vendor',     '0304-5555555', 'Lahore',     'en',        false, 'ai_verified'),
  ('a0a0a0a0-0000-4000-8000-000000000006', 'Usman Tariq',      'vendor',     '0305-6666666', 'Karachi',    'ur',        false, 'unverified'),
  ('a0a0a0a0-0000-4000-8000-000000000007', 'Faisal Mehmood',   'admin',      '0306-7777777', 'Lahore',     'en',        true,  'ai_verified')
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 3) Wallets (one per user)
-- ----------------------------------------------------------------------------
insert into wallets (user_id, balance_pkr) values
  ('a0a0a0a0-0000-4000-8000-000000000001', 47500),
  ('a0a0a0a0-0000-4000-8000-000000000002',  2250),
  ('a0a0a0a0-0000-4000-8000-000000000003',     0),
  ('a0a0a0a0-0000-4000-8000-000000000004',     0),
  ('a0a0a0a0-0000-4000-8000-000000000005',   900),
  ('a0a0a0a0-0000-4000-8000-000000000006',     0),
  ('a0a0a0a0-0000-4000-8000-000000000007',   250)
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 4) Verifications (AI OCR + face-match audit trail)
-- ----------------------------------------------------------------------------
insert into verifications (user_id, doc_type, doc_url, ocr_payload, face_match_score, ai_decision) values
  ('a0a0a0a0-0000-4000-8000-000000000002', 'cnic',           'documents/a0a0a0a0...0002/cnic.jpg',
   '{"full_name":"Rizwan Ahmed","cnic_number":"35202-1234567-1","dob":"1990-04-12","expiry":"2029-04-12"}', 0.93, 'verified'),
  ('a0a0a0a0-0000-4000-8000-000000000002', 'driving_license','documents/a0a0a0a0...0002/license.jpg',
   '{"license_number":"LHR-DL-88214","category":"LTV","issue":"2019-01-20","expiry":"2029-01-20"}', 0.90, 'verified'),
  ('a0a0a0a0-0000-4000-8000-000000000003', 'cnic',           'documents/a0a0a0a0...0003/cnic.jpg',
   '{"full_name":"Ayesha Siddiqui","cnic_number":"42101-7654321-2","dob":"1988-09-03","expiry":"2028-09-03"}', 0.87, 'verified'),
  ('a0a0a0a0-0000-4000-8000-000000000004', 'cnic',           'documents/a0a0a0a0...0004/cnic.jpg',
   '{"full_name":"Kamran Ali","cnic_number":"61101-1122334-5","dob":"1992-06-17","expiry":"2030-06-17"}', 0.58, 'needs_review'),
  ('a0a0a0a0-0000-4000-8000-000000000005', 'car_registration','documents/a0a0a0a0...0005/car_reg.jpg',
   '{"registration_no":"LEB-4523","owner":"Bilal Hussain","make":"Suzuki","model":"Alto"}', null, 'verified');

-- ----------------------------------------------------------------------------
-- 5) License progress (Amna — DLIMS-style tracker)
-- ----------------------------------------------------------------------------
insert into license_progress (user_id, permit_number, stage, test_date) values
  ('a0a0a0a0-0000-4000-8000-000000000001', 'LHR-LP-2026-8891', 'test_scheduled', current_date + 7);

-- ----------------------------------------------------------------------------
-- 6) Availability slots (instructors)
-- ----------------------------------------------------------------------------
insert into availability_slots (instructor_id, day, start_time, end_time) values
  ('a0a0a0a0-0000-4000-8000-000000000002', 'Monday',    '16:00', '21:00'),
  ('a0a0a0a0-0000-4000-8000-000000000002', 'Wednesday', '16:00', '21:00'),
  ('a0a0a0a0-0000-4000-8000-000000000002', 'Friday',    '16:00', '21:00'),
  ('a0a0a0a0-0000-4000-8000-000000000002', 'Saturday',  '09:00', '14:00'),
  ('a0a0a0a0-0000-4000-8000-000000000003', 'Tuesday',   '10:00', '18:00'),
  ('a0a0a0a0-0000-4000-8000-000000000003', 'Thursday',  '10:00', '18:00'),
  ('a0a0a0a0-0000-4000-8000-000000000004', 'Monday',    '08:00', '12:00'),
  ('a0a0a0a0-0000-4000-8000-000000000004', 'Thursday',  '08:00', '12:00');

-- ----------------------------------------------------------------------------
-- 7) Bookings (3 statuses: completed / booked / refunded + 1 vendor booking)
-- ----------------------------------------------------------------------------
insert into bookings (id, learner_id, provider_id, service_type, slot_start, slot_end, status, price_pkr, gps_track_url, telematics) values
  ('b0b0b0b0-0000-4000-8000-000000000001', 'a0a0a0a0-0000-4000-8000-000000000001',
   'a0a0a0a0-0000-4000-8000-000000000002', 'driving_lesson',
   now() - interval '10 days', now() - interval '10 days' + interval '1 hour', 'completed', 2500,
   'gps/b0b0...0001', '[{"event":"harsh_brake","ts_offset_min":12,"speed_kmh":45},{"event":"harsh_accel","ts_offset_min":18,"speed_kmh":30},{"event":"speeding","ts_offset_min":25,"speed_kmh":72}]'),

('b0b0b0b0-0000-4000-8000-000000000002', 'a0a0a0a0-0000-4000-8000-000000000001',
   'a0a0a0a0-0000-4000-8000-000000000002', 'driving_lesson',
   now() + interval '2 days' + interval '18 hours', now() + interval '2 days' + interval '19 hours', 'booked', 2500,
   null, null),

('b0b0b0b0-0000-4000-8000-000000000003', 'a0a0a0a0-0000-4000-8000-000000000001',
   'a0a0a0a0-0000-4000-8000-000000000002', 'driving_lesson',
   now() - interval '5 days', now() - interval '5 days' + interval '1 hour', 'refunded', 2000,
   null, null),

('b0b0b0b0-0000-4000-8000-000000000004', 'a0a0a0a0-0000-4000-8000-000000000001',
   'a0a0a0a0-0000-4000-8000-000000000005', 'car_wash',
   now() - interval '3 days', now() - interval '3 days' + interval '30 minutes', 'completed', 1000,
   null, null);

-- ----------------------------------------------------------------------------
-- 8) Wallet transactions — full chains
--    (topup -> escrow -> fee-split -> payout  AND  topup -> escrow -> refund)
-- ----------------------------------------------------------------------------
-- Amna (learner): topup, 2 escrow holds, auto refund, car-wash escrow+split
insert into transactions (wallet_id, booking_id, kind, amount_pkr, platform_fee_pkr, balance_after, created_at) values
  ((select id from wallets where user_id = 'a0a0a0a0-0000-4000-8000-000000000001'), null,                         'topup',      50000, 0,    50000, now() - interval '20 days'),
  ((select id from wallets where user_id = 'a0a0a0a0-0000-4000-8000-000000000001'), 'b0b0b0b0-0000-4000-8000-000000000001', 'escrow_hold', -2500, 0,    47500, now() - interval '11 days'),
  ((select id from wallets where user_id = 'a0a0a0a0-0000-4000-8000-000000000001'), 'b0b0b0b0-0000-4000-8000-000000000003', 'escrow_hold', -2000, 0,    45500, now() - interval '6 days'),
  ((select id from wallets where user_id = 'a0a0a0a0-0000-4000-8000-000000000001'), 'b0b0b0b0-0000-4000-8000-000000000003', 'refund',       2000, 0,    47500, now() - interval '5 days'),  -- no-show rule fired after grace window
  ((select id from wallets where user_id = 'a0a0a0a0-0000-4000-8000-000000000001'), 'b0b0b0b0-0000-4000-8000-000000000004', 'escrow_hold', -1000, 0,    46500, now() - interval '4 days');

-- Rizwan (instructor): payout of completed lesson minus 10% platform fee
insert into transactions (wallet_id, booking_id, kind, amount_pkr, platform_fee_pkr, balance_after, created_at) values
  ((select id from wallets where user_id = 'a0a0a0a0-0000-4000-8000-000000000002'), 'b0b0b0b0-0000-4000-8000-000000000001', 'payout', 2250, 250, 2250, now() - interval '10 days' + interval '90 minutes');

-- Bilal (vendor): payout for completed car wash minus 10% fee
insert into transactions (wallet_id, booking_id, kind, amount_pkr, platform_fee_pkr, balance_after, created_at) values
  ((select id from wallets where user_id = 'a0a0a0a0-0000-4000-8000-000000000005'), 'b0b0b0b0-0000-4000-8000-000000000004', 'payout', 900, 100, 900, now() - interval '3 days' + interval '45 minutes');

-- Admin/platform wallet: collected commission (fee_split rows)
insert into transactions (wallet_id, booking_id, kind, amount_pkr, platform_fee_pkr, balance_after, created_at) values
  ((select id from wallets where user_id = 'a0a0a0a0-0000-4000-8000-000000000007'), 'b0b0b0b0-0000-4000-8000-000000000001', 'fee_split', 250, 250, 250, now() - interval '10 days' + interval '90 minutes');

-- ----------------------------------------------------------------------------
-- 9) SOS alert (1 open, for the admin realtime feed demo)
-- ----------------------------------------------------------------------------
insert into sos_alerts (user_id, booking_id, lat, lng, status) values
  ('a0a0a0a0-0000-4000-8000-000000000001', 'b0b0b0b0-0000-4000-8000-000000000002',
   31.5204, 74.3587, 'open');

-- ----------------------------------------------------------------------------
-- 10) Vehicle logs (Amna — 2 months of fuel + parts, drives the Recharts)
-- ----------------------------------------------------------------------------
insert into vehicle_logs (user_id, log_type, odometer_km, amount_pkr, liters, note, created_at) values
  ('a0a0a0a0-0000-4000-8000-000000000001', 'fuel',       120500, 5820, 35.3, 'Shell Ferozepur Rd',        now() - interval '60 days'),
  ('a0a0a0a0-0000-4000-8000-000000000001', 'fuel',       121180, 5450, 33.0, 'PSO Jail Rd',              now() - interval '53 days'),
  ('a0a0a0a0-0000-4000-8000-000000000001', 'fuel',       121830, 5600, 33.8, 'Total DHA Phase 5',        now() - interval '46 days'),
  ('a0a0a0a0-0000-4000-8000-000000000001', 'spare_part', null,   3200, null,  'Front brake pads',         now() - interval '44 days'),
  ('a0a0a0a0-0000-4000-8000-000000000001', 'fuel',       122490, 5300, 32.0, 'Shell Ferozepur Rd',       now() - interval '39 days'),
  ('a0a0a0a0-0000-4000-8000-000000000001', 'fuel',       123110, 5510, 33.2, 'PSO Canal Bank',           now() - interval '32 days'),
  ('a0a0a0a0-0000-4000-8000-000000000001', 'spare_part', null,   850,  null,  'Engine oil filter',        now() - interval '30 days'),
  ('a0a0a0a0-0000-4000-8000-000000000001', 'fuel',       123760, 5680, 34.1, 'Total Model Town',         now() - interval '25 days'),
  ('a0a0a0a0-0000-4000-8000-000000000001', 'fuel',       124410, 5420, 32.6, 'Caltex Johar Town',        now() - interval '18 days'),
  ('a0a0a0a0-0000-4000-8000-000000000001', 'service',    124600, 1500, null,  'AC service check',        now() - interval '15 days'),
  ('a0a0a0a0-0000-4000-8000-000000000001', 'fuel',       125020, 5490, 33.0, 'Shell Ferozepur Rd',       now() - interval '11 days'),
  ('a0a0a0a0-0000-4000-8000-000000000001', 'fuel',       125680, 5610, 33.5, 'PSO Jail Rd',              now() - interval '4 days');

-- ----------------------------------------------------------------------------
-- 11) Ratings (marketplace cards + sort-by-rating demo)
-- ----------------------------------------------------------------------------
insert into ratings (booking_id, stars, comment) values
  ('b0b0b0b0-0000-4000-8000-000000000001', 5, 'Rizwan bahut acha instructor hain, punctual aur professional.'),
  ('b0b0b0b0-0000-4000-8000-000000000004', 4, 'Car wash was quick, good value.');

-- ----------------------------------------------------------------------------
-- 12) Chat messages (Realtime chat demo on the upcoming booking)
-- ----------------------------------------------------------------------------
insert into messages (booking_id, sender_id, body, created_at) values
  ('b0b0b0b0-0000-4000-8000-000000000002', 'a0a0a0a0-0000-4000-8000-000000000001', 'Assalam o alaikum, 6 PM ki booking confirm hai?', now() - interval '1 day'),
  ('b0b0b0b0-0000-4000-8000-000000000002', 'a0a0a0a0-0000-4000-8000-000000000002', 'Ji bilkul, main 5:45 p tak pohanch jaunga. Funds secure dekh raha hoon, shukriya!', now() - interval '1 day' + interval '20 minutes'),
  ('b0b0b0b0-0000-4000-8000-000000000002', 'a0a0a0a0-0000-4000-8000-000000000001', 'Perfect, main live tracking on kar dungi.', now() - interval '1 day' + interval '22 minutes');

-- ----------------------------------------------------------------------------
-- 13) GPS live-tracking pin (instructor approaching, for the map demo)
-- ----------------------------------------------------------------------------
insert into gps_locations (booking_id, lat, lng, updated_at) values
  ('b0b0b0b0-0000-4000-8000-000000000002', 31.5310, 74.3510, now() - interval '5 minutes');

-- ============================================================================
-- End of seed. Expected demo state:
--   Amna: ai_verified learner, 1 completed + 1 upcoming + 1 refunded lesson,
--         car wash booked, wallet ledger chain visible, 2 months of fuel data.
--   Rizwan: verified Lahore instructor, earnings payout visible, rated 5 stars.
--   Kamran: needs_review instructor (fills admin verification queue).
--   Admin Faisal: SOS alert open + verification queue + commission collected.
-- ============================================================================
