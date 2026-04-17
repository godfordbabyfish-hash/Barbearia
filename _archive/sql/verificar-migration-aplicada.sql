-- VERIFICAR SE A MIGRATION FOI APLICADA CORRETAMENTE
-- Execute este SQL no Supabase Dashboard para verificar o status

-- 1. Verificar se a coluna is_temp_user existe
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'is_temp_user';

-- 2. Verificar se a foreign key constraint foi removida
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'profiles' 
AND constraint_name = 'profiles_id_fkey';

-- 3. Verificar constraint do payment_method
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%payment_method%';

-- 4. Testar inserção de perfil temporário (TESTE)
-- ATENÇÃO: Este é apenas um teste, pode dar erro se já existir
INSERT INTO public.profiles (id, name, phone, is_temp_user) 
VALUES (gen_random_uuid(), 'TESTE MIGRATION', '+55 11 99999-9999', true)
RETURNING id, name, is_temp_user;

-- 5. Remover o teste (limpar)
DELETE FROM public.profiles WHERE name = 'TESTE MIGRATION';

-- Resultado esperado:
-- - is_temp_user deve existir
-- - profiles_id_fkey NÃO deve existir
-- - payment_method deve permitir 'cartao'
-- - Inserção de teste deve funcionar