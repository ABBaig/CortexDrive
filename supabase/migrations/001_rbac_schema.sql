-- 001_rbac_schema.sql

-- Create role enum
CREATE TYPE public.user_role AS ENUM ('learner','instructor','vendor','admin');

-- users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  city text,
  language text DEFAULT 'en',
  role public.user_role DEFAULT 'learner',
  hourly_rate numeric,
  onboarded boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- admins table
CREATE TABLE IF NOT EXISTS public.admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- helper is_admin()
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.admins WHERE user_id = uid);
END;
$$ LANGUAGE plpgsql STABLE;

-- Policies for public.users
-- Allow authenticated users to select their own row
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (
  auth.uid() = id OR public.is_admin(auth.uid())
);

-- Allow authenticated users to update their own row but not role
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (
  auth.uid() = id OR public.is_admin(auth.uid())
) WITH CHECK (
  (auth.uid() = id AND role = (SELECT role FROM public.users WHERE id = auth.uid()))
  OR public.is_admin(auth.uid())
);

-- Marketplace roles visible to authenticated users (instructor/vendor)
CREATE POLICY "users_select_marketplace" ON public.users FOR SELECT USING (
  auth.role() IS NOT NULL OR public.is_admin(auth.uid())
) WITH CHECK (true);

-- Admins full access
CREATE POLICY "admins_full_access_users" ON public.users FOR ALL USING (
  public.is_admin(auth.uid())
) WITH CHECK (public.is_admin(auth.uid()));

-- Policies for public.admins
CREATE POLICY "admins_select" ON public.admins FOR SELECT USING (
  user_id = auth.uid() OR public.is_admin(auth.uid())
);

CREATE POLICY "admins_insert" ON public.admins FOR INSERT USING (
  public.is_admin(auth.uid())
);

CREATE POLICY "admins_update" ON public.admins FOR UPDATE USING (
  public.is_admin(auth.uid())
) WITH CHECK (public.is_admin(auth.uid()));
