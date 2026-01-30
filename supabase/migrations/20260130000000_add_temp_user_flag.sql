-- Add is_temp_user flag to profiles table
-- This allows creating temporary profiles without auth users

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_temp_user BOOLEAN DEFAULT FALSE;

-- Add comment to document the field
COMMENT ON COLUMN public.profiles.is_temp_user IS 'Indica se é um usuário temporário criado pelo barbeiro (não tem login)';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_temp_user ON public.profiles(is_temp_user);

-- Remove foreign key constraint to auth.users to allow temp profiles
-- First check if constraint exists
DO $$
BEGIN
    -- Try to drop the foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- If there's any error, just continue
        NULL;
END $$;

-- Make id column use gen_random_uuid() as default for temp users
ALTER TABLE public.profiles 
ALTER COLUMN id SET DEFAULT gen_random_uuid();