-- Add payment_method column to appointments table
-- This field stores the payment method used: 'pix' or 'dinheiro' (cash)

ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('pix', 'dinheiro'));

-- Add comment to document the field
COMMENT ON COLUMN public.appointments.payment_method IS 'Forma de pagamento do serviço: pix ou dinheiro';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_appointments_payment_method ON public.appointments(payment_method);
