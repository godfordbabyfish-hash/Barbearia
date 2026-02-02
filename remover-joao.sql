-- Script para remover o usuário João (CUIDADO: Execute apenas se confirmado que deve ser removido)

-- 1. Primeiro, vamos ver os dados do João
SELECT 
    p.id as profile_id,
    p.user_id,
    p.name,
    p.role,
    u.email,
    p.created_at
FROM profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE p.name ILIKE '%joão%';

-- 2. Verificar dependências antes de remover
SELECT 'appointments' as tabela, COUNT(*) as registros
FROM appointments 
WHERE barber_id IN (SELECT id FROM profiles WHERE name ILIKE '%joão%')

UNION ALL

SELECT 'barber_commissions' as tabela, COUNT(*) as registros
FROM barber_commissions 
WHERE barber_id IN (SELECT id FROM profiles WHERE name ILIKE '%joão%')

UNION ALL

SELECT 'barber_advances' as tabela, COUNT(*) as registros
FROM barber_advances 
WHERE barber_id IN (SELECT id FROM profiles WHERE name ILIKE '%joão%');

-- 3. Se não houver dependências, remover (DESCOMENTE APENAS SE NECESSÁRIO):

/*
-- Remover comissões do João (se existirem)
DELETE FROM barber_commissions 
WHERE barber_id IN (SELECT id FROM profiles WHERE name ILIKE '%joão%');

-- Remover vales do João (se existirem)
DELETE FROM barber_advances 
WHERE barber_id IN (SELECT id FROM profiles WHERE name ILIKE '%joão%');

-- Remover agendamentos do João (se existirem)
DELETE FROM appointments 
WHERE barber_id IN (SELECT id FROM profiles WHERE name ILIKE '%joão%');

-- Remover perfil do João
DELETE FROM profiles WHERE name ILIKE '%joão%';

-- Remover usuário do auth (se necessário)
-- DELETE FROM auth.users WHERE id IN (
--     SELECT user_id FROM profiles WHERE name ILIKE '%joão%'
-- );
*/