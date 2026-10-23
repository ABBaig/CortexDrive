-- Live GPS lesson tracking (Feature 2): the gps_locations table and its RLS
-- (read: both booking parties; write: instructor only) already exist live.
-- Realtime updates to the learner require the table to be in the publication.
-- The share UI upserts one fix per booking, which requires a unique constraint
-- on booking_id (the original migration created only a plain index).

alter publication supabase_realtime add table public.gps_locations;

-- one live fix row per booking (drop first so re-runs are safe even if a
-- plain index of the same name exists)
drop index if exists public.gps_booking_idx;
create unique index if not exists gps_locations_booking_uidx
  on public.gps_locations (booking_id);
