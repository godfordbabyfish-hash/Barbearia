-- Script simples para corrigir João para Welton Douglas
-- Tabela profiles tem apenas: id, name, phone, created_at, updated_at

-- 1. Ver dados atuais do João
SELECT id, name, phone, created_at FROM profiles WHERE name ILIKE '%joão%';

-- 2. Atualizar nome para Welton Douglas
UPDATE profiles 
SET name = 'Welton Douglas',
    updated_at = NOW()
WHERE name ILIKE '%joão%';

-- 3. Verificar se funcionou
SELECT id, name, phone, created_at, updated_at FROM profiles WHERE name = 'Welton Douglas';

-- 4. Verificar se existe na tabela barbers também
SELECT id, name, specialty, experience FROM barbers WHERE name ILIKE '%joão%';

-- 5. Atualizar na tabela barbers se existir
UPDATE barbers 
SET name = 'Welton Douglas',
    updated_at = NOW()
WHERE name ILIKE '%joão%';

-- 6. Verificar resultado final na tabela barbers
SELECT id, name, specialty, experience FROM barbers WHERE name = 'Welton Douglas';