-- ============================================
-- SETUP COMPLETO DO LEMBRETE DE 10 MINUTOS
-- Execute este arquivo via: npx supabase db execute --file executar-reminder-setup.sql
-- ============================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Adicionar coluna reminder_sent na tabela appointments
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- 3. Criar índice para consultas mais rápidas
CREATE INDEX IF NOT EXISTS idx_appointments_reminder 
ON appointments(appointment_date, appointment_time, status, reminder_sent)
WHERE status IN ('confirmed', 'pending') AND reminder_sent IS FALSE;

-- 4. Adicionar comentário
COMMENT ON COLUMN appointments.reminder_sent IS 'Indica se o lembrete de 10 minutos antes foi enviado';

-- 5. Criar função para chamar a Edge Function
-- ⚠️ IMPORTANTE: Você precisa editar a linha abaixo e substituir 'YOUR_SERVICE_ROLE_KEY' 
-- pela sua chave real de service_role (encontre em: Supabase Dashboard > Settings > API > service_role key)
CREATE OR REPLACE FUNCTION invoke_whatsapp_reminder()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url TEXT := 'https://wabefmgfsatlusevxyfo.supabase.co';
  function_url TEXT;
  service_role_key TEXT := 'YOUR_SERVICE_ROLE_KEY'; -- ⚠️ SUBSTITUA AQUI!
BEGIN
  function_url := supabase_url || '/functions/v1/whatsapp-reminder';
  
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := '{}'::jsonb
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error invoking reminder function: %', SQLERRM;
END;
$$;

-- 6. Remover job existente se houver (para evitar conflitos)
SELECT cron.unschedule('whatsapp-reminder-every-minute');

-- 7. Agendar o cron job para executar a cada minuto
SELECT cron.schedule(
  'whatsapp-reminder-every-minute',
  '* * * * *', -- A cada minuto
  'SELECT invoke_whatsapp_reminder();'
);

-- 8. Verificar se foi criado
SELECT * FROM cron.job WHERE jobname = 'whatsapp-reminder-every-minute';
