-- Add photo_url column to appointments table for storing client haircut photos
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add comment to document the field
COMMENT ON COLUMN public.appointments.photo_url IS 'URL da foto do corte do cliente após conclusão do serviço';
