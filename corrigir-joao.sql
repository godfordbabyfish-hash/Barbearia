-- Script para corrigir o usuário João

-- Opção 1: Alterar o role do João de 'barbeiro' para 'cliente' (se ele não for realmente barbeiro)
UPDATE profiles 
SET role = 'cliente',
    updated_at = NOW()
WHERE name ILIKE '%joão%' AND role = 'barbeiro';

-- Opção 2: Renomear o João para um nome mais específico (se for um usuário de teste)
-- UPDATE profiles 
-- SET name = 'João (Teste)',
--     updated_at = NOW()
-- WHERE name ILIKE '%joão%' AND name NOT ILIKE '%teste%';

-- Opção 3: Desativar o usuário João (marcar como inativo)
-- UPDATE profiles 
-- SET active = false,
--     updated_at = NOW()
-- WHERE name ILIKE '%joão%';

-- Verificar o resultado
SELECT 
    p.id,
    p.name,
    p.role,
    p.phone,
    p.whatsapp,
    u.email,
    p.updated_at
FROM profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE p.name ILIKE '%joão%';