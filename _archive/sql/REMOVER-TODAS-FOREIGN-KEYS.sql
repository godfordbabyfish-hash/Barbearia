-- REMOVER TODAS AS FOREIGN KEYS PROBLEMÁTICAS
-- Execute este SQL para remover TODAS as constraints que impedem perfis temporários

-- 1. Remover foreign key de appointments.client_id -> profiles.id
ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointments_client_id_fkey;

-- 2. Remover foreign key de profiles.id -> auth.users.id (se ainda existir)
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3. Verificar se há outras constraints relacionadas
-- Remover qualquer constraint que referencie auth.users
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Buscar todas as constraints que referenciam auth.users
    FOR constraint_record IN
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_name = 'users'
            AND tc.table_schema = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || constraint_record.table_name || 
                ' DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
        RAISE NOTICE 'Removed constraint: % from table: %', 
                     constraint_record.constraint_name, constraint_record.table_name;
    END LOOP;
END $$;

-- Mensagem de confirmação
SELECT 'Todas as foreign keys problemáticas foram removidas!' as status;