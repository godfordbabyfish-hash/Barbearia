-- Create appointment_payments table to support split payments
CREATE TABLE IF NOT EXISTS public.appointment_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'dinheiro', 'cartao')),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.appointment_payments ENABLE ROW LEVEL SECURITY;

-- Policies

-- Barbers can insert payments for their appointments
DROP POLICY IF EXISTS "Barbers can insert payments for their appointments" ON public.appointment_payments;
CREATE POLICY "Barbers can insert payments for their appointments"
  ON public.appointment_payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.appointments a
      JOIN public.barbers b ON b.id = a.barber_id
      WHERE a.id = appointment_payments.appointment_id
      AND b.user_id = auth.uid()
    )
  );

-- Barbers can view payments for their appointments
DROP POLICY IF EXISTS "Barbers can view payments for their appointments" ON public.appointment_payments;
CREATE POLICY "Barbers can view payments for their appointments"
  ON public.appointment_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      JOIN public.barbers b ON b.id = a.barber_id
      WHERE a.id = appointment_payments.appointment_id
      AND b.user_id = auth.uid()
    )
  );

-- Admins can view all payments
DROP POLICY IF EXISTS "Admins can view all payments" ON public.appointment_payments;
CREATE POLICY "Admins can view all payments"
  ON public.appointment_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_appointment_payments_appointment_id ON public.appointment_payments(appointment_id);
