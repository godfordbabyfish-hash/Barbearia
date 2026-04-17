-- ============================================
-- CONFIGURAR CRON JOB PARA LEMBRETES - VERSÃO SIMPLIFICADA
-- ============================================
-- Execute este SQL no Supabase SQL Editor
-- IMPORTANTE: Substitua 'YOUR_SERVICE_ROLE_KEY' pela sua chave real!

-- 1. Primeiro, edite a função para adicionar sua service_role_key
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

-- 2. Remover job existente se houver
SELECT cron.unschedule('whatsapp-reminder-every-minute');

-- 3. Agendar o cron job (executa a cada minuto)
SELECT cron.schedule(
  'whatsapp-reminder-every-minute',
  '* * * * *',
  'SELECT invoke_whatsapp_reminder();'
);

-- 4. Verificar se foi criado
SELECT * FROM cron.job WHERE jobname = 'whatsapp-reminder-every-minute';
