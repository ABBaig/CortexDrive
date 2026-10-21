-- 0001_core_app_users.sql (idempotent)
DO $$
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='app_users') THEN
  CREATE TABLE public.app_users (
    id uuid PRIMARY KEY,
    email text,
    full_name text,
    city text,
    language text DEFAULT 'en',
    role text DEFAULT 'learner',
    hourly_rate numeric(10,2),
    onboarded boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
END IF;
END$$;

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_users' AND policyname='app_users_select') THEN
  PERFORM pg_sleep(0); -- placeholder
  CREATE POLICY app_users_select ON public.app_users FOR SELECT USING (
    auth.role() = 'authenticated'::text AND (auth.uid() = id OR role IN ('instructor','vendor'))
  );
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_users' AND policyname='app_users_insert') THEN
  CREATE POLICY app_users_insert ON public.app_users FOR INSERT WITH CHECK (auth.uid() = id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_users' AND policyname='app_users_update') THEN
  CREATE POLICY app_users_update ON public.app_users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
END IF;
END$$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS(SELECT 1 FROM admins a WHERE a.user_id = auth.uid());
$$;

DO $$
BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_users' AND policyname='app_users_admin_select') THEN
  CREATE POLICY app_users_admin_select ON public.app_users FOR SELECT USING (public.is_admin());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_users' AND policyname='app_users_admin_update') THEN
  CREATE POLICY app_users_admin_update ON public.app_users FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
END IF;
END$$;
