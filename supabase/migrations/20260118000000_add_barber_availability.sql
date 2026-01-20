-- Add availability column to barbers table
-- This stores weekly availability as JSON: { "monday": { "open": "09:00", "close": "20:00", "closed": false }, ... }
ALTER TABLE public.barbers
ADD COLUMN IF NOT EXISTS availability JSONB DEFAULT '{
  "monday": { "open": "09:00", "close": "20:00", "closed": false },
  "tuesday": { "open": "09:00", "close": "20:00", "closed": false },
  "wednesday": { "open": "09:00", "close": "20:00", "closed": false },
  "thursday": { "open": "09:00", "close": "20:00", "closed": false },
  "friday": { "open": "09:00", "close": "20:00", "closed": false },
  "saturday": { "open": "09:00", "close": "18:00", "closed": false },
  "sunday": { "open": "09:00", "close": "18:00", "closed": true }
}'::jsonb;

-- Add comment to document the column
COMMENT ON COLUMN public.barbers.availability IS 'Horários de disponibilidade semanal do barbeiro. Se um dia estiver marcado como closed: true, o barbeiro não aparecerá para agendamentos nesse dia.';

-- Create index for faster JSON queries
CREATE INDEX IF NOT EXISTS idx_barbers_availability ON public.barbers USING GIN (availability);
