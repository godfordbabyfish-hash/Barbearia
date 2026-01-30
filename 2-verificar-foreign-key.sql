-- 2. VERIFICAR SE A FOREIGN KEY FOI REMOVIDA
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'profiles' 
AND constraint_name = 'profiles_id_fkey';