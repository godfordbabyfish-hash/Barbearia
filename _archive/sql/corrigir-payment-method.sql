-- Corrigir constraint da coluna payment_method para incluir 'cartao'

-- Primeiro, verificar se a coluna existe
DO $$
BEGIN
    -- Adicionar coluna se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'appointments' 
                   AND column_name = 'payment_method') THEN
        ALTER TABLE public.appointments 
        ADD COLUMN payment_method TEXT;
    END IF;
END $$;

-- Remover constraint antiga se existir
DO $$
BEGIN
    -- Tentar remover constraint existente
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name LIKE '%payment_method%' 
               AND table_name = 'appointments') THEN
        
        -- Encontrar o nome exato da constraint
        DECLARE
            constraint_name_var TEXT;
        BEGIN
            SELECT constraint_name INTO constraint_name_var
            FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%payment_method%' 
            AND table_name = 'appointments'
            LIMIT 1;
            
            IF constraint_name_var IS NOT NULL THEN
                EXECUTE 'ALTER TABLE public.appointments DROP CONSTRAINT ' || constraint_name_var;
            END IF;
        END;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Se houver erro, continuar
        NULL;
END $$;

-- Adicionar nova constraint com todas as opções
ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_payment_method_check 
CHECK (payment_method IN ('pix', 'dinheiro', 'cartao'));

-- Atualizar comentário
COMMENT ON COLUMN public.appointments.payment_method IS 'Forma de pagamento do serviço: pix, dinheiro ou cartao';

-- Criar índice se não existir
CREATE INDEX IF NOT EXISTS idx_appointments_payment_method ON public.appointments(payment_method);

-- Verificar se funcionou
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'appointments' 
AND column_name = 'payment_method';