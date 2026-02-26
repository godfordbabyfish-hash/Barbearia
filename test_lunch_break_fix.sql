-- Script para testar se a correção do almoço está funcionando
-- Execute este script após aplicar a migration fix_lunch_break_schema.sql

-- 1. Verificar se os campos de almoço existem no schema
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'barbers' 
AND column_name = 'availability';

-- 2. Verificar estrutura atual da disponibilidade dos barbeiros
SELECT 
    id,
    name,
    availability->'friday' as friday_availability,
    availability->'saturday' as saturday_availability
FROM barbers 
WHERE availability IS NOT NULL
LIMIT 3;

-- 3. Testar se campos de almoço estão presentes
SELECT 
    id,
    name,
    availability->'friday'->>'hasLunchBreak' as friday_has_lunch,
    availability->'friday'->>'lunchStart' as friday_lunch_start,
    availability->'friday'->>'lunchEnd' as friday_lunch_end,
    availability->'saturday'->>'hasLunchBreak' as saturday_has_lunch,
    availability->'saturday'->>'lunchStart' as saturday_lunch_start,
    availability->'saturday'->>'lunchEnd' as saturday_lunch_end
FROM barbers 
WHERE availability IS NOT NULL
LIMIT 3;

-- 4. Verificar configuração de horário de almoço da barbearia
SELECT 
    config_value->'friday' as shop_friday,
    config_value->'saturday' as shop_saturday
FROM site_config 
WHERE config_key = 'operating_hours';

-- 5. Simular um agendamento no dia 28/02 (sexta-feira) durante o almoço
-- Verificar se o sistema bloquearia corretamente
SELECT 
    'Teste - 28/02/2025 (Sexta-feira) 13:30' as test_case,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM barbers b
            WHERE b.availability->'friday'->>'hasLunchBreak' = 'true'
            AND '13:30' >= b.availability->'friday'->>'lunchStart'
            AND '13:30' < b.availability->'friday'->>'lunchEnd'
        ) THEN 'BLOQUEADO - Almoço do barbeiro'
        WHEN EXISTS (
            SELECT 1 FROM site_config sc
            WHERE sc.config_key = 'operating_hours'
            AND sc.config_value->'friday'->>'hasLunchBreak' = 'true'
            AND '13:30' >= sc.config_value->'friday'->>'lunchStart'
            AND '13:30' < sc.config_value->'friday'->>'lunchEnd'
        ) THEN 'BLOQUEADO - Almoço da barbearia'
        ELSE 'PERMITIDO'
    END as result;

-- 6. Verificar agendamentos existentes no dia 28/02 durante horário de almoço
SELECT 
    appointment_time,
    client_name,
    barber_id,
    'AGENDAMENTO EXISTENTE DURANTE ALMOÇO' as issue
FROM appointments 
WHERE appointment_date = '2025-02-28'
AND (
    (appointment_time >= '12:00' AND appointment_time < '14:00') -- Horário típico de almoço
)
ORDER BY appointment_time;
