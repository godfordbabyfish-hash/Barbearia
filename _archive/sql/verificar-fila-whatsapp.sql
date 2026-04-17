-- Verificar fila de notificações WhatsApp

-- Ver mensagens pendentes
SELECT 
  id,
  appointment_id,
  client_phone,
  client_name,
  message_action,
  status,
  attempts,
  error_message,
  created_at,
  processed_at
FROM whatsapp_notifications_queue
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 20;

-- Ver mensagens falhadas
SELECT 
  id,
  appointment_id,
  client_phone,
  client_name,
  message_action,
  status,
  attempts,
  error_message,
  created_at,
  processed_at
FROM whatsapp_notifications_queue
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;

-- Ver mensagens enviadas (últimas 10)
SELECT 
  id,
  appointment_id,
  client_phone,
  client_name,
  message_action,
  status,
  attempts,
  created_at,
  processed_at
FROM whatsapp_notifications_queue
WHERE status = 'sent'
ORDER BY created_at DESC
LIMIT 10;

-- Estatísticas gerais
SELECT 
  status,
  COUNT(*) as total,
  AVG(attempts) as avg_attempts,
  MAX(created_at) as last_created
FROM whatsapp_notifications_queue
GROUP BY status;
