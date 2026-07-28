-- Protege as automações de WhatsApp, remove chaves do código SQL e alinha
-- os horários do pg_cron (GMT) com America/Sao_Paulo (UTC-3).

do $$
declare
  v_definition text;
  v_match text[];
  v_secret text;
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'usage_sync_internal_key') then
    select pg_get_functiondef('public.invoke_sync_supabase_usage()'::regprocedure)
      into v_definition;
    v_match := regexp_match(v_definition, E'internal_key\\s+text\\s*:=\\s*''([^'']+)''');
    v_secret := v_match[1];
    if nullif(v_secret, '') is null then
      raise exception 'Não foi possível migrar a chave interna do relatório de consumo';
    end if;
    perform vault.create_secret(v_secret, 'usage_sync_internal_key', 'Chave interna do cron do relatório de consumo');
  end if;
end
$$;

create or replace function public.invoke_sync_supabase_usage()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_internal_key text;
begin
  select decrypted_secret into v_internal_key
  from vault.decrypted_secrets
  where name = 'usage_sync_internal_key'
  limit 1;
  if nullif(v_internal_key, '') is null then
    raise exception 'Chave interna do relatório de consumo não configurada';
  end if;

  perform net.http_post(
    url := 'https://wabefmgfsatlusevxyfo.supabase.co/functions/v1/sync-supabase-usage',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('internal', true, 'internal_key', v_internal_key),
    timeout_milliseconds := 30000
  );
end;
$$;

create or replace function public.invoke_whatsapp_daily_report()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  select decrypted_secret into v_token
  from vault.decrypted_secrets
  where name = 'referral_cron_anon_key'
  limit 1;
  if nullif(v_token, '') is null then raise exception 'Token do cron não configurado'; end if;

  perform net.http_post(
    url := 'https://wabefmgfsatlusevxyfo.supabase.co/functions/v1/whatsapp-daily-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_token,
      'Authorization', 'Bearer ' || v_token
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$$;

create or replace function public.invoke_whatsapp_reminder()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  select decrypted_secret into v_token
  from vault.decrypted_secrets
  where name = 'referral_cron_anon_key'
  limit 1;
  if nullif(v_token, '') is null then raise exception 'Token do cron não configurado'; end if;

  perform net.http_post(
    url := 'https://wabefmgfsatlusevxyfo.supabase.co/functions/v1/whatsapp-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_token,
      'Authorization', 'Bearer ' || v_token
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$$;

create or replace function private.invoke_whatsapp_overdue_barber()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  select decrypted_secret into v_token
  from vault.decrypted_secrets
  where name = 'referral_cron_anon_key'
  limit 1;
  if nullif(v_token, '') is null then raise exception 'Token do cron não configurado'; end if;

  perform net.http_post(
    url := 'https://wabefmgfsatlusevxyfo.supabase.co/functions/v1/whatsapp-overdue-barber',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_token,
      'Authorization', 'Bearer ' || v_token
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$$;

revoke all on function public.invoke_sync_supabase_usage() from public, anon, authenticated;
revoke all on function public.invoke_whatsapp_daily_report() from public, anon, authenticated;
revoke all on function public.invoke_whatsapp_reminder() from public, anon, authenticated;
revoke all on function private.invoke_whatsapp_overdue_barber() from public, anon, authenticated;

select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'sync-supabase-usage-daily'),
  schedule := '0 1 * * *'
);
select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'inactive-client-whatsapp-daily'),
  schedule := '0 17 * * *'
);

do $$
declare v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname = 'whatsapp-overdue-barber-every-10-minutes';
  if v_jobid is null then
    perform cron.schedule(
      'whatsapp-overdue-barber-every-10-minutes',
      '*/10 * * * *',
      'select private.invoke_whatsapp_overdue_barber();'
    );
  else
    perform cron.alter_job(job_id := v_jobid, schedule := '*/10 * * * *', active := true);
  end if;
end
$$;

update public.site_config
set config_value = jsonb_set(config_value, '{cron}', '"0 1 * * *"'::jsonb, true)
                 || jsonb_build_object('time', '22:00', 'timezone', 'America/Sao_Paulo')
where config_key = 'supabase_usage_sync_schedule';

update public.site_config
set config_value = jsonb_set(config_value, '{schedule}', '"0 17 * * *"'::jsonb, true)
                 || jsonb_build_object('schedule_time', '14:00', 'timezone', 'America/Sao_Paulo')
where config_key = 'whatsapp_inactive_clients';

update public.site_config
set config_value = jsonb_build_object(
  'enabled', coalesce((config_value->>'enabled')::boolean, true),
  'text', E'💈 *Sentimos sua falta!*\n\nOlá, *{{clientName}}*! Já faz {{inactivityDays}} dias desde sua última visita à Barbearia Raimundos.\n\nQue tal reservar um horário e renovar o visual? Estamos esperando por você! ✂️'
)
where config_key = 'whatsapp_msg_inactive_client';
