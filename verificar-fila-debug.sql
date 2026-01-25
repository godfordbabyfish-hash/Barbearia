-- =====================================================
-- SCRIPT DE DIAGNÓSTICO: Fila de Notificações WhatsApp
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1) Verificar as últimas 10 notificações na fila
SELECT 
  id,
  appointment_id,
  client_phone,
  target_phone,
  target_type,
  target_name,
  message_action,
  status,
  attempts,
  error_message,
  created_at,
  processed_at
FROM whatsapp_notifications_queue
ORDER BY created_at DESC
LIMIT 10;

-- 2) Contar notificações por status
SELECT 
  status,
  COUNT(*) as total
FROM whatsapp_notifications_queue
GROUP BY status;

-- 3) Verificar se o trigger existe
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_name LIKE '%whatsapp%' 
   OR trigger_name LIKE '%notification%'
ORDER BY trigger_name;

-- 4) Verificar últimos agendamentos (devem ter notificações correspondentes)
SELECT 
  a.id as appointment_id,
  a.client_id,
  a.appointment_date,
  a.appointment_time,
  a.status as appointment_status,
  a.created_at as appointment_created,
  p.name as client_name,
  p.phone as client_phone,
  b.name as barber_name,
  b.whatsapp_phone as barber_whatsapp
FROM appointments a
LEFT JOIN profiles p ON p.id = a.client_id
LEFT JOIN barbers b ON b.id = a.barber_id
ORDER BY a.created_at DESC
LIMIT 5;

-- 5) Verificar se há notificações pendentes que falharam
SELECT 
  id,
  appointment_id,
  target_phone,
  target_type,
  status,
  attempts,
  error_message,
  created_at
FROM whatsapp_notifications_queue
WHERE status IN ('pending', 'failed')
ORDER BY created_at DESC
LIMIT 10;

-- 6) Verificar variável de configuração da instância WhatsApp
SELECT 
  config_key,
  config_value
FROM site_config
WHERE config_key IN ('whatsapp_active_instance', 'evolution_api_url', 'evolution_api_key');
