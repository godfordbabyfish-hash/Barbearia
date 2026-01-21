-- Migration final para configurar o cron job do reminder
-- Esta migration assume que a função invoke_whatsapp_reminder já foi criada
-- (ela foi criada pela Edge Function setup-reminder-cron)

-- Remover job existente se houver (para evitar conflitos)
SELECT cron.unschedule('whatsapp-reminder-every-minute');

-- Agendar o cron job para executar a cada minuto
SELECT cron.schedule(
  'whatsapp-reminder-every-minute',
  '* * * * *', -- A cada minuto
  'SELECT invoke_whatsapp_reminder();'
);

-- Verificar se foi criado
SELECT * FROM cron.job WHERE jobname = 'whatsapp-reminder-every-minute';
