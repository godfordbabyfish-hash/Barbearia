-- 1. VERIFICAR SE A COLUNA is_temp_user EXISTE
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'is_temp_user';