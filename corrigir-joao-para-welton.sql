-- Corrigir o usuário João para Welton Douglas

-- 1. Primeiro, vamos ver os dados atuais do João
SELECT 
    p.id,
    p.name,
    p.role,
    p.phone,
    p.whatsapp,
    u.email
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.name ILIKE '%joão%';

-- 2. Atualizar o nome de João para Welton Douglas
UPDATE profiles 
SET 
    name = 'Welton Douglas',
    updated_at = NOW()
WHERE name ILIKE '%joão%';

-- 3. Atualizar também o email se necessário (opcional)
-- UPDATE auth.users 
-- SET email = 'welton.douglas@gmail.com',
--     raw_user_meta_data = jsonb_set(
--         COALESCE(raw_user_meta_data, '{}'),
--         '{name}',
--         '"Welton Douglas"'
--     ),
--     updated_at = NOW()
-- WHERE id IN (
--     SELECT id FROM profiles WHERE name = 'Welton Douglas'
-- );

-- 4. Verificar se a correção foi aplicada
SELECT 
    p.id,
    p.name,
    p.role,
    p.phone,
    p.whatsapp,
    u.email,
    p.updated_at
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.name = 'Welton Douglas';

-- 5. Verificar se não há duplicatas de Welton
SELECT 
    COUNT(*) as total_weltons,
    string_agg(name, ', ') as nomes
FROM profiles 
WHERE name ILIKE '%welton%';