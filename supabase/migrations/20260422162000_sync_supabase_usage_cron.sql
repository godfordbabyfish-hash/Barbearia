create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.invoke_sync_supabase_usage()
returns void
language plpgsql
security definer
as $$
declare
  supabase_url text := 'https://wabefmgfsatlusevxyfo.supabase.co';
  function_url text;
  internal_key text := 'CHANGE_ME_USAGE_SYNC_INTERNAL_KEY';
begin
  function_url := supabase_url || '/functions/v1/sync-supabase-usage';

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'internal', true,
      'internal_key', internal_key
    )
  );
exception
  when others then
    raise warning 'Error invoking sync-supabase-usage: %', sqlerrm;
end;
$$;

do $$
begin
  perform cron.unschedule('sync-supabase-usage-daily');
exception
  when others then
    null;
end;
$$;

select cron.schedule(
  'sync-supabase-usage-daily',
  '15 6 * * *',
  'select public.invoke_sync_supabase_usage();'
);
