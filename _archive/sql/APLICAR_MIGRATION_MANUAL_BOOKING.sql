-- Add 'manual' to booking_type enum values for retroactive appointments
-- This allows barbers to create past appointments manually

-- First, drop the existing check constraint
ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointments_booking_type_check;

-- Add new check constraint that includes 'manual'
ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_booking_type_check 
CHECK (booking_type IN ('local', 'online', 'api', 'manual'));

-- Add a comment to explain the booking_type values
COMMENT ON COLUMN public.appointments.booking_type IS 
'Type of booking: online (web booking), local (in-person booking), api (external API), manual (retroactive manual entry by barber)';
