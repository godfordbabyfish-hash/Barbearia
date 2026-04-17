-- Verificação rápida do problema de almoço
-- Execute para identificar inconsistências

-- 1. Verificar se campos de almoço existem nos barbeiros
SELECT 
    'BARBERS AVAILABILITY' as source,
    COUNT(*) as total_barbers,
    COUNT(CASE WHEN availability->'saturday'->>'hasLunchBreak' = 'true' THEN 1 END) as has_lunch_configured,
    COUNT(CASE WHEN availability->'saturday'->>'lunchStart' IS NOT NULL THEN 1 END) as has_lunch_start,
    COUNT(CASE WHEN availability->'saturday'->>'lunchEnd' IS NOT NULL THEN 1 END) as has_lunch_end
FROM barbers 
WHERE availability IS NOT NULL;

-- 2. Verificar configuração da barbearia
SELECT 
    'SHOP HOURS' as source,
    config_value->'saturday'->>'hasLunchBreak' as shop_has_lunch,
    config_value->'saturday'->>'lunchStart' as shop_lunch_start,
    config_value->'saturday'->>'lunchEnd' as shop_lunch_end
FROM site_config 
WHERE config_key = 'operating_hours';

-- 3. Verificar agendamentos existentes em 28/02 durante almoço
SELECT 
    'EXISTING APPOINTMENTS' as source,
    COUNT(*) as appointments_during_lunch,
    STRING_AGG(appointment_time, ', ') as lunch_times
FROM appointments 
WHERE appointment_date = '2026-02-28'
AND appointment_time >= '12:00' 
AND appointment_time < '14:00'
AND status != 'cancelled';

-- 4. Testar horários específicos que aparecem no celular
SELECT 
    'TIME SLOT TEST' as source,
    '12:00' as time_slot,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM barbers b
            WHERE b.availability->'saturday'->>'hasLunchBreak' = 'true'
            AND '12:00' >= b.availability->'saturday'->>'lunchStart'
            AND '12:00' < b.availability->'saturday'->>'lunchEnd'
        ) THEN 'SHOULD BE BLOCKED (Barber Lunch)'
        WHEN EXISTS (
            SELECT 1 FROM site_config sc
            WHERE sc.config_key = 'operating_hours'
            AND sc.config_value->'saturday'->>'hasLunchBreak' = 'true'
            AND '12:00' >= sc.config_value->'saturday'->>'lunchStart'
            AND '12:00' < sc.config_value->'saturday'->>'lunchEnd'
        ) THEN 'SHOULD BE BLOCKED (Shop Lunch)'
        ELSE 'SHOULD BE AVAILABLE'
    END as expected_status
UNION ALL
SELECT 
    'TIME SLOT TEST' as source,
    '12:30' as time_slot,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM barbers b
            WHERE b.availability->'saturday'->>'hasLunchBreak' = 'true'
            AND '12:30' >= b.availability->'saturday'->>'lunchStart'
            AND '12:30' < b.availability->'saturday'->>'lunchEnd'
        ) THEN 'SHOULD BE BLOCKED (Barber Lunch)'
        WHEN EXISTS (
            SELECT 1 FROM site_config sc
            WHERE sc.config_key = 'operating_hours'
            AND sc.config_value->'saturday'->>'hasLunchBreak' = 'true'
            AND '12:30' >= sc.config_value->'saturday'->>'lunchStart'
            AND '12:30' < sc.config_value->'saturday'->>'lunchEnd'
        ) THEN 'SHOULD BE BLOCKED (Shop Lunch)'
        ELSE 'SHOULD BE AVAILABLE'
    END as expected_status;
