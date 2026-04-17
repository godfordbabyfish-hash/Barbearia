-- Allow barbers, admins, and gestors to create client profiles
-- This is needed when barbers create appointments manually for clients

-- Drop existing restrictive INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

-- Create policy that allows:
-- 1. Users to insert their own profile (auth.uid() = id)
-- 2. Barbers, admins, and gestors to insert any profile (for creating client profiles)
CREATE POLICY "profiles_insert_own_or_staff"
  ON public.profiles FOR INSERT
  WITH CHECK (
    -- User can insert their own profile
    auth.uid() = id
    OR
    -- Staff (barber, admin, gestor) can insert any profile
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('barbeiro', 'admin', 'gestor')
    )
  );

-- Keep the existing SELECT policy (everyone can view)
-- Keep the existing UPDATE policy (users can update their own)
