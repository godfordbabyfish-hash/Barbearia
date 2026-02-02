-- Atualizar completamente os dados do Welton Douglas
-- Tabela profiles tem apenas: id, name, phone, created_at, updated_at

-- 1. Ver dados atuais do João
SELECT p.id, p.name, p.phone, p.created_at 
FROM profiles p 
WHERE p.name ILIKE '%joão%';

-- 2. Ver dados na tabela auth.users correspondente
SELECT u.id, u.email, u.raw_user_meta_data->>'name' as meta_name
FROM auth.users u
WHERE EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = u.id AND p.name ILIKE '%joão%'
);

-- 3. Corrigir o nome de João para Welton Douglas na tabela profiles
UPDATE profiles 
SET 
    name = 'Welton Douglas',
    phone = '82994296630',
    updated_at = NOW()
WHERE name ILIKE '%joão%';

-- 4. Atualizar o email no auth.users para welton
UPDATE auth.users 
SET 
    email = 'weltondouglas570@gmail.com',
    raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'),
        '{name}',
        '"Welton Douglas"'
    ),
    updated_at = NOW()
WHERE id IN (
    SELECT id FROM profiles WHERE name = 'Welton Douglas'
);

-- 5. Atualizar na tabela barbers se existir
UPDATE barbers 
SET name = 'Welton Douglas',
    updated_at = NOW()
WHERE name ILIKE '%joão%';

-- 6. Verificar o resultado final
SELECT 
    'PROFILES' as tabela,
    p.id,
    p.name,
    p.phone,
    p.updated_at::text
FROM profiles p
WHERE p.name = 'Welton Douglas'
UNION ALL
SELECT 
    'AUTH_USERS' as tabela,
    u.id,
    u.email,
    u.raw_user_meta_data->>'name' as meta_name,
    u.updated_at::text
FROM auth.users u
WHERE EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = u.id AND p.name = 'Welton Douglas'
)
UNION ALL
SELECT 
    'BARBERS' as tabela,
    b.id,
    b.name,
    b.specialty,
    b.updated_at::text
FROM barbers b 
WHERE b.name = 'Welton Douglas';

-- 7. Verificar se não há outros usuários com nome similar
SELECT 
    p.name,
    p.phone,
    u.email
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.name ILIKE '%welton%' OR p.name ILIKE '%joão%'
ORDER BY p.name;