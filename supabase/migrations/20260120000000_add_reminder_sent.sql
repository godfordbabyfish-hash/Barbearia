-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Add reminder_sent column to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Create index for faster reminder queries
CREATE INDEX IF NOT EXISTS idx_appointments_reminder 
ON appointments(appointment_date, appointment_time, status, reminder_sent)
WHERE status IN ('confirmed', 'pending') AND reminder_sent IS FALSE;

-- Add comment
COMMENT ON COLUMN appointments.reminder_sent IS 'Indica se o lembrete de 10 minutos antes foi enviado';

-- Function to invoke the reminder Edge Function
-- IMPORTANTE: Você precisa editar esta função e substituir 'YOUR_SERVICE_ROLE_KEY' pela sua chave real
-- Encontre em: Supabase Dashboard > Settings > API > service_role key
CREATE OR REPLACE FUNCTION invoke_whatsapp_reminder()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url TEXT := 'https://wabefmgfsatlusevxyfo.supabase.co';
  function_url TEXT;
  service_role_key TEXT := 'YOUR_SERVICE_ROLE_KEY'; -- ⚠️ SUBSTITUA AQUI pela sua service_role key!
BEGIN
  function_url := supabase_url || '/functions/v1/whatsapp-reminder';
  
  -- Call the Edge Function via HTTP
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

-- Note: To update the cron job later, use:
-- SELECT cron.unschedule('whatsapp-reminder-every-minute');
-- Then recreate with new schedule

-- View scheduled jobs (for verification)
-- SELECT * FROM cron.job WHERE jobname = 'whatsapp-reminder-every-minute';
