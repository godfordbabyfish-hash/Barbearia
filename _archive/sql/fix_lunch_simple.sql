-- Versão simplificada para corrigir o problema de almoço
-- Execute este script para resolver a inconsistência mobile/desktop

-- 1. Adicionar campos de almoço aos barbeiros que não têm
UPDATE public.barbers 
SET availability = availability || '{
  "saturday": { "hasLunchBreak": true, "lunchStart": "12:00", "lunchEnd": "14:00" }
}'::jsonb
WHERE availability IS NOT NULL 
AND availability->'saturday'->>'hasLunchBreak' IS NULL;

-- 2. Garantir que a barbearia tenha almoço configurado
UPDATE public.site_config 
SET config_value = config_value || '{
  "saturday": { "hasLunchBreak": true, "lunchStart": "12:00", "lunchEnd": "14:00" }
}'::jsonb
WHERE config_key = 'operating_hours'
AND config_value->'saturday'->>'hasLunchBreak' IS NULL;

-- 3. Verificar se funcionou
SELECT 'BARBERS COM ALMOÇO' as status,
       COUNT(*) as total
FROM barbers 
WHERE availability->'saturday'->>'hasLunchBreak' = 'true'

UNION ALL

SELECT 'BARBEARIA COM ALMOÇO' as status,
       CASE WHEN config_value->'saturday'->>'hasLunchBreak' = 'true' THEN 1 ELSE 0 END as total
FROM site_config 
WHERE config_key = 'operating_hours';

-- 4. Verificar agendamentos problemáticos
SELECT 'AGENDAMENTOS DURANTE ALMOÇO (28/02)' as status,
       COUNT(*) as total,
       STRING_AGG(appointment_time::text, ', ') as horarios
FROM appointments 
WHERE appointment_date = '2026-02-28'
AND appointment_time >= '12:00' 
AND appointment_time < '14:00'
AND status != 'cancelled';

-- 5. Teste simples
SELECT 'TESTE - 12:00' as horario,
       CASE 
           WHEN EXISTS (
               SELECT 1 FROM barbers b
               WHERE b.availability->'saturday'->>'hasLunchBreak' = 'true'
               AND '12:00' >= b.availability->'saturday'->>'lunchStart'
               AND '12:00' < b.availability->'saturday'->>'lunchEnd'
           ) THEN 'BLOQUEADO'
           ELSE 'LIVRE'
       END as resultado

UNION ALL

SELECT 'TESTE - 13:30' as horario,
       CASE 
           WHEN EXISTS (
               SELECT 1 FROM barbers b
               WHERE b.availability->'saturday'->>'hasLunchBreak' = 'true'
               AND '13:30' >= b.availability->'saturday'->>'lunchStart'
               AND '13:30' < b.availability->'saturday'->>'lunchEnd'
           ) THEN 'BLOQUEADO'
           ELSE 'LIVRE'
       END as resultado;
