-- Schedule daily WhatsApp notification to barbers for overdue active appointments
create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.invoke_whatsapp_overdue_barber()
returns void
language plpgsql
security definer
as $$
declare
  supabase_url text := 'https://wabefmgfsatlusevxyfo.supabase.co';
  function_url text;
begin
  function_url := supabase_url || '/functions/v1/whatsapp-overdue-barber';
  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
exception when others then
  raise warning 'Error invoking whatsapp-overdue-barber: %', sqlerrm;
end;
$$;

-- Run every day at 10:00 UTC (~07:00 America/Sao_Paulo)
select cron.unschedule('whatsapp-overdue-barber-daily-0700');
select cron.schedule(
  'whatsapp-overdue-barber-daily-0700',
  '0 10 * * *',
  'select public.invoke_whatsapp_overdue_barber();'
);
