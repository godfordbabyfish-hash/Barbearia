-- 7. CORRIGIR CONSTRAINT DO PAYMENT_METHOD
-- Primeiro, remover constraint antiga se existir
ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointments_payment_method_check;

-- Adicionar nova constraint com cartão
ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_payment_method_check 
CHECK (payment_method IN ('pix', 'dinheiro', 'cartao'));