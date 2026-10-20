-- Demo data: instructors, vendors, admin, wallets, transactions, bookings, vehicle_logs, sos
-- Note: uses existing auth.users; replace with real uuids in a real deploy.

-- Create an admin entry for the first existing user
INSERT INTO admins (user_id) SELECT id FROM auth.users LIMIT 1 ON CONFLICT DO NOTHING;

-- Create wallets for first 5 users
INSERT INTO wallets (user_id, balance)
SELECT id, 10000 FROM auth.users LIMIT 5 ON CONFLICT DO NOTHING;

-- Create sample transactions for the first wallet
INSERT INTO transactions (wallet_id, kind, amount, balance_after)
SELECT w.id, 'topup', 10000, 10000 FROM wallets w LIMIT 1 ON CONFLICT DO NOTHING;

-- platform wallet
INSERT INTO wallets (user_id, balance)
SELECT id, 0 FROM auth.users OFFSET 5 LIMIT 1 ON CONFLICT DO NOTHING;

-- sample vehicle logs for user 1
INSERT INTO vehicle_logs (user_id, type, odometer_km, liters, amount_pkr)
SELECT id, 'fuel', 1000, 50, 20000 FROM auth.users LIMIT 1;

-- sample sos alert
INSERT INTO sos_alerts (user_id, lat, lng, status)
SELECT id, 31.5204, 74.3587, 'open' FROM auth.users LIMIT 1;
