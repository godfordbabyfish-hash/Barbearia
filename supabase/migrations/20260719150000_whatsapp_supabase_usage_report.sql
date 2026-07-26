
-- Enable pg_net if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;

-- Function to invoke the whatsapp-supabase-usage-report Edge Function
CREATE OR REPLACE FUNCTION public.invoke_whatsapp_supabase_usage_report()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text := 'https://wabefmgfsatlusevxyfo.supabase.co'; -- Use your actual Supabase URL
  function_url text;
  internal_key text := 'CHANGE_ME_SUPABASE_USAGE_REPORT_INTERNAL_KEY'; -- Change this to match your function's key
BEGIN
  function_url := supabase_url || '/functions/v1/whatsapp-supabase-usage-report';

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'internal', true,
      'internal_key', internal_key
    )
  );
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error invoking whatsapp-supabase-usage-report: %', SQLERRM;
END;
$$;

-- Try to drop existing cron job if exists (ignore errors)
DO $$
BEGIN
  PERFORM cron.unschedule('whatsapp-supabase-usage-report-daily');
EXCEPTION
  WHEN others THEN
    NULL;
END;
$$;

-- Schedule the cron job (run every day at 12:00)
SELECT cron.schedule(
  'whatsapp-supabase-usage-report-daily',
  '0 12 * * *',
  'SELECT public.invoke_whatsapp_supabase_usage_report();'
);
