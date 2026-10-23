-- Telematics (v1.0 spec): browser-Geolocation-based lesson measurement.
-- No hardware: speed comes from the device's GPS (coords.speed), falling back
-- to haversine distance / time between fixes. Stored per lesson booking.

alter table public.bookings
  add column if not exists telematics jsonb,
  add column if not exists telematics_score smallint
    check (telematics_score is null or telematics_score between 0 and 100);

-- telematics jsonb shape:
-- {
--   "device": "geolocation",
--   "started_at": "...", "ended_at": "...",
--   "duration_s": 1800, "distance_km": 12.4,
--   "max_speed": 86.2, "avg_speed": 41.7,
--   "harsh_brake_count": 2, "harsh_accel_count": 1, "speeding_count": 0,
--   "events": [{"event":"harsh_brake","ts":"...","speed":64.1}, ...]
-- }
--
-- RLS: bookings_update already allows both learner and instructor to update
-- their own rows — no policy changes needed.
