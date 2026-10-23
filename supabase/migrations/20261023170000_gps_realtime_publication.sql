-- Live GPS lesson tracking (Feature 2): the gps_locations table and its RLS
-- (read: both booking parties; write: instructor only) already exist live.
-- Realtime updates to the learner require the table to be in the publication.

alter publication supabase_realtime add table public.gps_locations;
