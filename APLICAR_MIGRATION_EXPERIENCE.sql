-- Migration para permitir campo experience NULL
-- Execute este SQL no Supabase Dashboard → SQL Editor

-- Allow experience field to be NULL (make it optional)
ALTER TABLE public.barbers
ALTER COLUMN experience DROP NOT NULL;

-- Update comment to reflect that it's optional
COMMENT ON COLUMN public.barbers.experience IS 'Anos de experiência do barbeiro (opcional). Pode ser NULL ou string vazia.';

-- Verificar se funcionou
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'barbers' 
AND column_name = 'experience';

-- Deve mostrar: is_nullable = 'YES'
