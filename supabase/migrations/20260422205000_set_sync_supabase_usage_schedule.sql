create or replace function public.set_sync_supabase_usage_schedule(p_time text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_time text;
  hour_part int;
  minute_part int;
  cron_expr text;
  is_authorized boolean;
begin
  normalized_time := trim(coalesce(p_time, ''));

  if normalized_time !~ '^([01][0-9]|2[0-3]):([0-5][0-9])$' then
    raise exception 'Horário inválido. Use HH:MM (24h).';
  end if;

  select exists(
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'gestor')
  ) into is_authorized;

  if not is_authorized then
    raise exception 'Apenas admin/gestor pode atualizar o cron de uso.';
  end if;

  hour_part := split_part(normalized_time, ':', 1)::int;
  minute_part := split_part(normalized_time, ':', 2)::int;
  cron_expr := format('%s %s * * *', minute_part, hour_part);

  perform cron.unschedule('sync-supabase-usage-daily');

  perform cron.schedule(
    'sync-supabase-usage-daily',
    cron_expr,
    'select public.invoke_sync_supabase_usage();'
  );

  insert into public.site_config (config_key, config_value)
  values (
    'supabase_usage_sync_schedule',
    jsonb_build_object('time', normalized_time, 'cron', cron_expr, 'updated_at', now())
  )
  on conflict (config_key)
  do update
    set config_value = excluded.config_value,
        updated_at = now();

  return jsonb_build_object(
    'success', true,
    'time', normalized_time,
    'cron', cron_expr
  );
end;
$$;

revoke all on function public.set_sync_supabase_usage_schedule(text) from public;
grant execute on function public.set_sync_supabase_usage_schedule(text) to authenticated;
