create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.invoke_cleanup_appointment_photos()
returns void
language plpgsql
security definer
as $$
declare
  supabase_url text := 'https://wabefmgfsatlusevxyfo.supabase.co';
  function_url text;
begin
  function_url := supabase_url || '/functions/v1/cleanup-appointment-photos';

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('retention_days', 90)
  );
exception
  when others then
    raise warning 'Error invoking cleanup-appointment-photos: %', sqlerrm;
end;
$$;

do $$
begin
  perform cron.unschedule('cleanup-appointment-photos-daily');
exception
  when others then
    null;
end;
$$;

select cron.schedule(
  'cleanup-appointment-photos-daily',
  '0 3 * * *',
  'select public.invoke_cleanup_appointment_photos();'
);
