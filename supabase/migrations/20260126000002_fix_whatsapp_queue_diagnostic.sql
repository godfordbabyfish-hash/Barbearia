-- Script de diagnóstico e correção para mensagens WhatsApp não chegarem

-- 1) Verificar se há mensagens pendentes na fila
-- Execute esta query para ver o status atual:
/*
SELECT 
  id,
  appointment_id,
  client_phone,
  target_phone,
  target_type,
  status,
  error_message,
  attempts,
  created_at,
  processed_at,
  LENGTH(REGEXP_REPLACE(COALESCE(target_phone, client_phone), '[^0-9]', '', 'g')) as phone_length
FROM whatsapp_notifications_queue
WHERE status IN ('pending', 'failed')
ORDER BY created_at DESC
LIMIT 20;
*/

-- 2) Verificar se clientes têm whatsapp preenchido
-- Execute esta query para ver os dados dos clientes:
/*
SELECT 
  id,
  name,
  phone,
  whatsapp,
  cpf,
  CASE 
    WHEN whatsapp IS NOT NULL AND whatsapp <> '' THEN 'Tem whatsapp'
    WHEN phone IS NOT NULL AND phone <> '' THEN 'Só tem phone'
    ELSE 'Sem telefone'
  END as status_telefone
FROM profiles
WHERE id IN (SELECT DISTINCT client_id FROM appointments WHERE created_at > NOW() - INTERVAL '7 days')
ORDER BY created_at DESC
LIMIT 20;
*/

-- 3) Corrigir clientes que não têm whatsapp mas têm phone
-- ATENÇÃO: Execute apenas se necessário
UPDATE profiles
SET whatsapp = phone
WHERE whatsapp IS NULL 
  AND phone IS NOT NULL 
  AND phone <> '' 
  AND phone <> '00000000000'
  AND LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) >= 10;

-- 4) Reprocessar mensagens falhadas (marcar como pending novamente)
-- ATENÇÃO: Execute apenas se quiser tentar reenviar mensagens falhadas
/*
UPDATE whatsapp_notifications_queue
SET status = 'pending',
    attempts = 0,
    error_message = NULL,
    processed_at = NULL
WHERE status = 'failed'
  AND attempts < 3
  AND created_at > NOW() - INTERVAL '7 days';
*/

-- 5) Verificar formato dos números na fila
-- Execute para ver se há números mal formatados:
/*
SELECT 
  id,
  client_phone,
  target_phone,
  REGEXP_REPLACE(COALESCE(target_phone, client_phone), '[^0-9]', '', 'g') as phone_cleaned,
  LENGTH(REGEXP_REPLACE(COALESCE(target_phone, client_phone), '[^0-9]', '', 'g')) as phone_length,
  CASE 
    WHEN LENGTH(REGEXP_REPLACE(COALESCE(target_phone, client_phone), '[^0-9]', '', 'g')) = 12 THEN 'OK (55 + DDD + 8)'
    WHEN LENGTH(REGEXP_REPLACE(COALESCE(target_phone, client_phone), '[^0-9]', '', 'g')) = 13 THEN 'OK (55 + DDD + 9 + 8)'
    WHEN LENGTH(REGEXP_REPLACE(COALESCE(target_phone, client_phone), '[^0-9]', '', 'g')) >= 14 THEN 'OK (com código país)'
    ELSE 'FORMATO INVÁLIDO'
  END as formato_status,
  status,
  error_message
FROM whatsapp_notifications_queue
WHERE status IN ('pending', 'failed')
ORDER BY created_at DESC;
*/

-- 6) Verificar se a função queue_whatsapp_notification está correta
-- Execute para ver o código da função:
/*
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'queue_whatsapp_notification';
*/

-- 7) Testar criação de notificação manualmente
-- Substitua os valores e execute para testar:
/*
-- Primeiro, encontre um appointment_id válido:
SELECT id, client_id, appointment_date, appointment_time 
FROM appointments 
WHERE status = 'confirmed' 
ORDER BY created_at DESC 
LIMIT 1;

-- Depois, insira manualmente na fila (substitua os valores):
INSERT INTO whatsapp_notifications_queue (
  appointment_id,
  client_phone,
  client_name,
  message_action,
  payload,
  target_type,
  target_phone,
  target_name
) VALUES (
  'SUBSTITUA_COM_APPOINTMENT_ID',
  '558282212126', -- Número formatado com 55
  'Cliente Teste',
  'created',
  jsonb_build_object(
    'appointmentId', 'SUBSTITUA_COM_APPOINTMENT_ID',
    'clientName', 'Cliente Teste',
    'phone', '558282212126',
    'action', 'created',
    'appointmentDate', CURRENT_DATE::text,
    'appointmentTime', '14:00',
    'serviceName', 'Corte',
    'barberName', 'Barbeiro Teste',
    'targetType', 'client'
  ),
  'client',
  '558282212126',
  'Cliente Teste'
);
*/
