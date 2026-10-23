-- Create vehicles table for per-user vehicles and link logs to vehicles
CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text,
  registration text,
  make text,
  model text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS and create policies for per-user access
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'vehicles_select_self') THEN
    EXECUTE 'DROP POLICY vehicles_select_self ON public.vehicles';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'vehicles_insert_self') THEN
    EXECUTE 'DROP POLICY vehicles_insert_self ON public.vehicles';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'vehicles_update_self') THEN
    EXECUTE 'DROP POLICY vehicles_update_self ON public.vehicles';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'vehicles_delete_self_or_admin') THEN
    EXECUTE 'DROP POLICY vehicles_delete_self_or_admin ON public.vehicles';
  END IF;
END$$;

CREATE POLICY vehicles_select_self ON public.vehicles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY vehicles_insert_self ON public.vehicles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY vehicles_update_self ON public.vehicles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY vehicles_delete_self_or_admin ON public.vehicles
  FOR DELETE USING ((auth.uid() = user_id) OR is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON public.vehicles (user_id);

-- Add vehicle_id to vehicle_logs (idempotent)
ALTER TABLE public.vehicle_logs
  ADD COLUMN IF NOT EXISTS vehicle_id uuid;

-- Add foreign key constraint linking to vehicles (if vehicles table exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.vehicle_logs'::regclass AND conname = 'vehicle_logs_vehicle_id_fkey'
  ) THEN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'vehicles') THEN
      ALTER TABLE public.vehicle_logs
        ADD CONSTRAINT vehicle_logs_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles (id) ON DELETE SET NULL;
    END IF;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_vehicle_logs_vehicle_id ON public.vehicle_logs (vehicle_id);

-- Ensure vehicle_logs RLS remains enabled
ALTER TABLE public.vehicle_logs ENABLE ROW LEVEL SECURITY;
