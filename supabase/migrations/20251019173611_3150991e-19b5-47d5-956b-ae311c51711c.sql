-- Add duration column to services table (in minutes)
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS duration integer DEFAULT 30;

COMMENT ON COLUMN public.services.duration IS 'Duração do serviço em minutos';