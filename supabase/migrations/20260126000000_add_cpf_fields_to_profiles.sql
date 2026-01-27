-- Add CPF, WhatsApp and birth_date fields to profiles table
-- This migration adds support for CPF-based authentication

-- Add new columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Create unique index on CPF (after adding column)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_cpf_unique ON public.profiles(cpf) WHERE cpf IS NOT NULL;

-- Add constraint to validate CPF format (11 digits)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS check_cpf_format;

ALTER TABLE public.profiles
ADD CONSTRAINT check_cpf_format 
CHECK (cpf IS NULL OR (LENGTH(REGEXP_REPLACE(cpf, '[^0-9]', '', 'g')) = 11));

-- Update handle_new_user function to include new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, cpf, whatsapp, birth_date)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE(NEW.raw_user_meta_data->>'cpf', NULL),
    COALESCE(NEW.raw_user_meta_data->>'whatsapp', NULL),
    CASE 
      WHEN NEW.raw_user_meta_data->>'birth_date' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'birth_date')::DATE 
      ELSE NULL 
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, profiles.name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    cpf = COALESCE(EXCLUDED.cpf, profiles.cpf),
    whatsapp = COALESCE(EXCLUDED.whatsapp, profiles.whatsapp),
    birth_date = COALESCE(EXCLUDED.birth_date, profiles.birth_date);
  
  -- Assign cliente role by default (se não existir)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'cliente')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Add comments to document the new fields
COMMENT ON COLUMN public.profiles.cpf IS 'CPF do cliente (11 dígitos, único). Usado como identificador para login.';
COMMENT ON COLUMN public.profiles.whatsapp IS 'Número de WhatsApp do cliente (formato: DDD + 8 dígitos, sem o 9).';
COMMENT ON COLUMN public.profiles.birth_date IS 'Data de nascimento do cliente.';
