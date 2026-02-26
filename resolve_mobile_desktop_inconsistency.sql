-- Script completo para resolver inconsistência entre mobile e desktop
-- Execute este script para garantir que o almoço seja bloqueado em todos os ambientes

-- 1. Primeiro, aplicar a correção do schema se ainda não foi aplicada
UPDATE public.barbers 
SET availability = availability || '{
  "monday": { "hasLunchBreak": false, "lunchStart": "12:00", "lunchEnd": "13:00" },
  "tuesday": { "hasLunchBreak": false, "lunchStart": "12:00", "lunchEnd": "13:00" },
  "wednesday": { "hasLunchBreak": false, "lunchStart": "12:00", "lunchEnd": "13:00" },
  "thursday": { "hasLunchBreak": false, "lunchStart": "12:00", "lunchEnd": "13:00" },
  "friday": { "hasLunchBreak": false, "lunchStart": "12:00", "lunchEnd": "13:00" },
  "saturday": { "hasLunchBreak": true, "lunchStart": "12:00", "lunchEnd": "14:00" },
  "sunday": { "hasLunchBreak": false, "lunchStart": "12:00", "lunchEnd": "13:00" }
}'::jsonb
WHERE availability IS NOT NULL 
AND (availability->'saturday'->>'hasLunchBreak' IS NULL OR availability->'saturday'->>'hasLunchBreak' = 'false');

-- 2. Garantir que a barbearia também tenha almoço configurado para sábado
UPDATE public.site_config 
SET config_value = config_value || '{
  "saturday": { "hasLunchBreak": true, "lunchStart": "12:00", "lunchEnd": "14:00" }
}'::jsonb
WHERE config_key = 'operating_hours'
AND (config_value->'saturday'->>'hasLunchBreak' IS NULL OR config_value->'saturday'->>'hasLunchBreak' = 'false');

-- 3. Verificar resultado
SELECT 'BARBERS - SÁBADO' as source,
       COUNT(*) as total,
       COUNT(CASE WHEN availability->'saturday'->>'hasLunchBreak' = 'true' THEN 1 END) as with_lunch,
       STRING_AGG(DISTINCT (availability->'saturday'->>'lunchStart') || '-' || (availability->'saturday'->>'lunchEnd'), ', ') as lunch_times
FROM barbers 
WHERE availability IS NOT NULL

UNION ALL

SELECT 'SHOP - SÁBADO' as source,
       1 as total,
       CASE WHEN config_value->'saturday'->>'hasLunchBreak' = 'true' THEN 1 ELSE 0 END as with_lunch,
       (config_value->'saturday'->>'lunchStart') || '-' || (config_value->'saturday'->>'lunchEnd') as lunch_times
FROM site_config 
WHERE config_key = 'operating_hours';

-- 4. Identificar e marcar agendamentos problemáticos em 28/02 durante almoço
SELECT 'PROBLEMATIC APPOINTMENTS' as source,
       appointment_time,
       client_name,
       barber_id,
       'SHOULD BE BLOCKED - LUNCH TIME' as issue
FROM appointments 
WHERE appointment_date = '2026-02-28'
AND appointment_time >= '12:00' 
AND appointment_time < '14:00'
AND status != 'cancelled'
ORDER BY appointment_time;

-- 5. Teste final - verificar se horários seriam bloqueados
SELECT 'FINAL TEST - 12:00' as test_time,
       CASE 
           WHEN EXISTS (
               SELECT 1 FROM barbers b
               WHERE b.availability->'saturday'->>'hasLunchBreak' = 'true'
               AND '12:00' >= b.availability->'saturday'->>'lunchStart'
               AND '12:00' < b.availability->'saturday'->>'lunchEnd'
           ) OR EXISTS (
               SELECT 1 FROM site_config sc
               WHERE sc.config_key = 'operating_hours'
               AND sc.config_value->'saturday'->>'hasLunchBreak' = 'true'
               AND '12:00' >= sc.config_value->'saturday'->>'lunchStart'
               AND '12:00' < sc.config_value->'saturday'->>'lunchEnd'
           ) THEN 'BLOCKED ✓'
           ELSE 'AVAILABLE ✗'
       END as status

UNION ALL

SELECT 'FINAL TEST - 12:30' as test_time,
       CASE 
           WHEN EXISTS (
               SELECT 1 FROM barbers b
               WHERE b.availability->'saturday'->>'hasLunchBreak' = 'true'
               AND '12:30' >= b.availability->'saturday'->>'lunchStart'
               AND '12:30' < b.availability->'saturday'->>'lunchEnd'
           ) OR EXISTS (
               SELECT 1 FROM site_config sc
               WHERE sc.config_key = 'operating_hours'
               AND sc.config_value->'saturday'->>'hasLunchBreak' = 'true'
               AND '12:30' >= sc.config_value->'saturday'->>'lunchStart'
               AND '12:30' < sc.config_value->'saturday'->>'lunchEnd'
           ) THEN 'BLOCKED ✓'
           ELSE 'AVAILABLE ✗'
       END as status

UNION ALL

SELECT 'FINAL TEST - 13:30' as test_time,
       CASE 
           WHEN EXISTS (
               SELECT 1 FROM barbers b
               WHERE b.availability->'saturday'->>'hasLunchBreak' = 'true'
               AND '13:30' >= b.availability->'saturday'->>'lunchStart'
               AND '13:30' < b.availability->'saturday'->>'lunchEnd'
           ) OR EXISTS (
               SELECT 1 FROM site_config sc
               WHERE sc.config_key = 'operating_hours'
               AND sc.config_value->'saturday'->>'hasLunchBreak' = 'true'
               AND '13:30' >= sc.config_value->'saturday'->>'lunchStart'
               AND '13:30' < sc.config_value->'saturday'->>'lunchEnd'
           ) THEN 'BLOCKED ✓'
           ELSE 'AVAILABLE ✗'
       END as status;
