-- Migration para adicionar campos de almoço à disponibilidade dos barbeiros
-- Isso corrige o problema onde agendamentos eram permitidos durante horário de almoço

-- Atualizar o valor padrão da coluna availability para incluir campos de almoço
ALTER TABLE public.barbers 
ALTER COLUMN availability SET DEFAULT '{
  "monday": { "open": "09:00", "close": "20:00", "closed": false, "hasLunchBreak": false, "lunchStart": "12:00", "lunchEnd": "13:00" },
  "tuesday": { "open": "09:00", "close": "20:00", "closed": false, "hasLunchBreak": false, "lunchStart": "12:00", "lunchEnd": "13:00" },
  "wednesday": { "open": "09:00", "close": "20:00", "closed": false, "hasLunchBreak": false, "lunchStart": "12:00", "lunchEnd": "13:00" },
  "thursday": { "open": "09:00", "close": "20:00", "closed": false, "hasLunchBreak": false, "lunchStart": "12:00", "lunchEnd": "13:00" },
  "friday": { "open": "09:00", "close": "20:00", "closed": false, "hasLunchBreak": false, "lunchStart": "12:00", "lunchEnd": "13:00" },
  "saturday": { "open": "09:00", "close": "18:00", "closed": false, "hasLunchBreak": false, "lunchStart": "12:00", "lunchEnd": "13:00" },
  "sunday": { "open": "09:00", "close": "18:00", "closed": true, "hasLunchBreak": false, "lunchStart": "12:00", "lunchEnd": "13:00" }
}'::jsonb;

-- Atualizar registros existentes para incluir campos de almoço (mantendo configurações atuais)
UPDATE public.barbers 
SET availability = availability || '{
  "monday": { "hasLunchBreak": false, "lunchStart": "12:00", "lunchEnd": "13:00" },
  "tuesday": { "hasLunchBreak": false, "lunchStart": "12:00", "lunchEnd": "13:00" },
  "wednesday": { "hasLunchBreak": false, "lunchStart": "12:00", "lunchEnd": "13:00" },
  "thursday": { "hasLunchBreak": false, "lunchStart": "12:00", "lunchEnd": "13:00" },
  "friday": { "hasLunchBreak": false, "lunchStart": "12:00", "lunchEnd": "13:00" },
  "saturday": { "hasLunchBreak": false, "lunchStart": "12:00", "lunchEnd": "13:00" },
  "sunday": { "hasLunchBreak": false, "lunchStart": "12:00", "lunchEnd": "13:00" }
}'::jsonb
WHERE availability IS NOT NULL 
AND NOT (availability ? 'monday' AND availability->'monday' ? 'hasLunchBreak');

-- Atualizar o comentário da coluna para documentar os novos campos
COMMENT ON COLUMN public.barbers.availability IS 'Horários de disponibilidade semanal do barbeiro. Inclui configurações de almoço (hasLunchBreak, lunchStart, lunchEnd). Se um dia estiver marcado como closed: true, o barbeiro não aparecerá para agendamentos nesse dia.';
