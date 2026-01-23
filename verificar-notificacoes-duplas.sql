-- Script para verificar se as notificações estão sendo criadas para cliente E barbeiro

-- 1. Verificar estrutura da tabela
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'whatsapp_notifications_queue'
AND column_name IN ('target_type', 'target_phone', 'target_name')
ORDER BY column_name;

-- 2. Verificar se barbeiros têm WhatsApp configurado
SELECT 
  id,
  name,
  whatsapp_phone,
  CASE 
    WHEN whatsapp_phone IS NULL OR whatsapp_phone = '' OR whatsapp_phone = '00000000000' 
    THEN 'Não configurado' 
    ELSE 'Configurado' 
  END as status_whatsapp
FROM barbers
ORDER BY name;

-- 3. Ver últimas notificações (deve ter 2 por agendamento: cliente + barbeiro)
SELECT 
  q.id,
  q.appointment_id,
  q.target_type,
  q.target_name,
  q.target_phone,
  q.message_action,
  q.status,
  q.created_at,
  a.appointment_date,
  a.appointment_time
FROM whatsapp_notifications_queue q
LEFT JOIN appointments a ON a.id = q.appointment_id
ORDER BY q.created_at DESC
LIMIT 20;

-- 4. Verificar se há agendamentos com notificações apenas para cliente (sem barbeiro)
SELECT 
  a.id as appointment_id,
  a.appointment_date,
  a.appointment_time,
  COUNT(CASE WHEN q.target_type = 'client' THEN 1 END) as notificacoes_cliente,
  COUNT(CASE WHEN q.target_type = 'barber' THEN 1 END) as notificacoes_barbeiro,
  b.name as barbeiro,
  b.whatsapp_phone as barbeiro_whatsapp
FROM appointments a
LEFT JOIN whatsapp_notifications_queue q ON q.appointment_id = a.id
LEFT JOIN barbers b ON b.id = a.barber_id
WHERE a.created_at > NOW() - INTERVAL '7 days'
GROUP BY a.id, a.appointment_date, a.appointment_time, b.name, b.whatsapp_phone
HAVING COUNT(CASE WHEN q.target_type = 'barber' THEN 1 END) = 0
ORDER BY a.created_at DESC;

-- 5. Verificar triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%whatsapp%'
ORDER BY trigger_name;
