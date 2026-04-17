-- Investigar usuário João
SELECT 
    id,
    email,
    raw_user_meta_data,
    created_at,
    updated_at
FROM auth.users 
WHERE raw_user_meta_data->>'name' ILIKE '%joão%' 
   OR email ILIKE '%joão%';

-- Verificar perfil do João
SELECT 
    p.id,
    p.user_id,
    p.name,
    p.role,
    p.phone,
    p.whatsapp,
    p.created_at,
    u.email
FROM profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE p.name ILIKE '%joão%';

-- Verificar se há agendamentos para o João
SELECT COUNT(*) as total_agendamentos
FROM appointments 
WHERE barber_id IN (
    SELECT id FROM profiles WHERE name ILIKE '%joão%'
);

-- Verificar se há comissões para o João
SELECT COUNT(*) as total_comissoes
FROM barber_commissions 
WHERE barber_id IN (
    SELECT id FROM profiles WHERE name ILIKE '%joão%'
);