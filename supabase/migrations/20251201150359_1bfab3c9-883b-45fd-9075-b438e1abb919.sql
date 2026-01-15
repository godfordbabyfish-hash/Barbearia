-- Add booking_type column to appointments table to distinguish local vs online bookings
ALTER TABLE public.appointments 
ADD COLUMN booking_type text DEFAULT 'online' CHECK (booking_type IN ('local', 'online'));

-- Create indexes for faster queries
CREATE INDEX idx_appointments_booking_type ON public.appointments(booking_type);
CREATE INDEX idx_appointments_date_time ON public.appointments(appointment_date, appointment_time);