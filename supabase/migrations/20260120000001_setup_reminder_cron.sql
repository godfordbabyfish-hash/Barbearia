-- Setup cron job for WhatsApp reminders
-- IMPORTANTE: Antes de executar, edite a função invoke_whatsapp_reminder() no arquivo anterior
-- e substitua 'YOUR_SERVICE_ROLE_KEY' pela sua chave real de service_role
-- Você encontra em: Supabase Dashboard > Settings > API > service_role key

-- Habilitar extensões (se ainda não estiverem habilitadas)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remover job existente se houver (para evitar conflitos)
SELECT cron.unschedule('whatsapp-reminder-every-minute');

-- Agendar o cron job para executar a cada minuto
-- IMPORTANTE: Certifique-se de que a função invoke_whatsapp_reminder() 
-- já foi criada e tem a service_role_key correta configurada!
SELECT cron.schedule(
  'whatsapp-reminder-every-minute',
  '* * * * *', -- A cada minuto (formato cron: minuto hora dia mês dia-da-semana)
  'SELECT invoke_whatsapp_reminder();'
);

-- Verificar se o job foi criado
SELECT * FROM cron.job WHERE jobname = 'whatsapp-reminder-every-minute';
