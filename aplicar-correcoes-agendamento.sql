-- Aplicar todas as correções para o sistema de agendamento

-- 1. Adicionar coluna is_temp_user na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_temp_user BOOLEAN DEFAULT FALSE;

-- Comentário para documentar o campo
COMMENT ON COLUMN public.profiles.is_temp_user IS 'Indica se é um usuário temporário criado pelo barbeiro (não tem login)';

-- Criar índice para consultas mais rápidas
CREATE INDEX IF NOT EXISTS idx_profiles_temp_user ON public.profiles(is_temp_user);

-- 2. Remover constraint de foreign key para auth.users (permitir perfis temporários)
DO $$
BEGIN
    -- Tentar remover a constraint de foreign key se existir
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Se houver erro, continuar
        NULL;
END $$;

-- 3. Definir gen_random_uuid() como padrão para coluna id
ALTER TABLE public.profiles 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 4. Verificar se a correção do payment_method foi aplicada
DO $$
BEGIN
    -- Verificar se a constraint permite 'cartao'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%payment_method%' 
        AND check_clause LIKE '%cartao%'
    ) THEN
        -- Remover constraint antiga se existir
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%payment_method%' 
            AND table_name = 'appointments'
        ) THEN
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
        
        -- Adicionar nova constraint com todas as opções
        ALTER TABLE public.appointments 
        ADD CONSTRAINT appointments_payment_method_check 
        CHECK (payment_method IN ('pix', 'dinheiro', 'cartao'));
    END IF;
END $$;

-- 5. Verificar estrutura final
SELECT 
    'profiles' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('id', 'is_temp_user')

UNION ALL

SELECT 
    'appointments' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'appointments' 
AND column_name = 'payment_method';