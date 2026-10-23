-- Add backward-compatible columns and RLS policies for vehicle_logs
ALTER TABLE public.vehicle_logs
  ADD COLUMN IF NOT EXISTS type text;

ALTER TABLE public.vehicle_logs
  ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

-- Backfill type from existing event_type if present
UPDATE public.vehicle_logs
SET type = event_type
WHERE type IS NULL AND event_type IS NOT NULL;

-- Ensure row level security is enabled (idempotent)
ALTER TABLE public.vehicle_logs ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to make this migration re-runnable, then create the desired policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'vehicle_logs_select_self') THEN
    EXECUTE 'DROP POLICY vehicle_logs_select_self ON public.vehicle_logs';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'vehicle_logs_insert_self') THEN
    EXECUTE 'DROP POLICY vehicle_logs_insert_self ON public.vehicle_logs';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'vehicle_logs_update_self') THEN
    EXECUTE 'DROP POLICY vehicle_logs_update_self ON public.vehicle_logs';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'vehicle_logs_delete_self_or_admin') THEN
    EXECUTE 'DROP POLICY vehicle_logs_delete_self_or_admin ON public.vehicle_logs';
  END IF;
END$$;

CREATE POLICY vehicle_logs_select_self ON public.vehicle_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY vehicle_logs_insert_self ON public.vehicle_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY vehicle_logs_update_self ON public.vehicle_logs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Allow users or admins to delete their logs; relies on is_admin(uid) helper present in DB
CREATE POLICY vehicle_logs_delete_self_or_admin ON public.vehicle_logs
  FOR DELETE USING ((auth.uid() = user_id) OR is_admin(auth.uid()));

-- Add index to help queries by user
CREATE INDEX IF NOT EXISTS idx_vehicle_logs_user_id_created_at ON public.vehicle_logs (user_id, created_at);
