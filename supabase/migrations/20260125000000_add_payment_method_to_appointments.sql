-- Add payment_method column to appointments table
-- This field stores the payment method used: 'pix', 'dinheiro' (cash), or 'cartao' (card)

ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('pix', 'dinheiro', 'cartao'));

-- Add comment to document the field
COMMENT ON COLUMN public.appointments.payment_method IS 'Forma de pagamento do serviço: pix, dinheiro ou cartao';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_appointments_payment_method ON public.appointments(payment_method);

-- Update existing constraint to include 'cartao' if column already exists
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'appointments_payment_method_check' 
               AND table_name = 'appointments') THEN
        ALTER TABLE public.appointments DROP CONSTRAINT appointments_payment_method_check;
    END IF;
    
    -- Add new constraint with all three options
    ALTER TABLE public.appointments 
    ADD CONSTRAINT appointments_payment_method_check 
    CHECK (payment_method IN ('pix', 'dinheiro', 'cartao'));
EXCEPTION
    WHEN OTHERS THEN
        -- If there's any error, just continue
        NULL;
END $$;
