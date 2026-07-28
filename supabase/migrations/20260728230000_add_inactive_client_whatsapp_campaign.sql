create schema if not exists private;

create table if not exists public.whatsapp_inactive_client_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  activity_date date not null,
  cycle_number integer not null check (cycle_number >= 0),
  inactivity_days integer not null check (inactivity_days >= 30),
  queued_at timestamptz not null default now(),
  unique (client_id, activity_date, cycle_number)
);

alter table public.whatsapp_inactive_client_logs enable row level security;
revoke all on public.whatsapp_inactive_client_logs from public, anon, authenticated;
create index if not exists whatsapp_inactive_client_logs_client_idx
  on public.whatsapp_inactive_client_logs(client_id, queued_at desc);
create index if not exists appointments_completed_client_date_idx
  on public.appointments(client_id, appointment_date desc)
  where status = 'completed';
create index if not exists appointments_active_client_date_idx
  on public.appointments(client_id, appointment_date)
  where status in ('pending', 'confirmed');

insert into public.site_config(config_key, config_value)
values (
  'whatsapp_inactive_clients',
  '{"enabled":true,"inactivity_days":30,"repeat_days":15,"batch_size":50,"schedule":"0 14 * * *"}'::jsonb
)
on conflict (config_key) do update set config_value = excluded.config_value;

insert into public.site_config(config_key, config_value)
values (
  'whatsapp_msg_inactive_client',
  jsonb_build_object('text', E'💈 *Sentimos sua falta!*\n\nOlá, *{{clientName}}*! Já faz {{inactivityDays}} dias desde sua última visita à Barbearia Raimundos.\n\nQue tal reservar um horário e renovar o visual? Estamos esperando por você! ✂️')
)
on conflict (config_key) do nothing;

alter table public.whatsapp_notifications_queue
  drop constraint if exists whatsapp_notifications_queue_message_action_check;
alter table public.whatsapp_notifications_queue
  add constraint whatsapp_notifications_queue_message_action_check
  check (message_action in ('created','updated','cancelled','completed','inactive_client'));

create or replace function private.enqueue_inactive_client_messages()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cfg jsonb;
  v_inactivity_days integer;
  v_repeat_days integer;
  v_batch_size integer;
  v_count integer;
begin
  select config_value into v_cfg
  from public.site_config
  where config_key = 'whatsapp_inactive_clients';

  if coalesce((v_cfg->>'enabled')::boolean, false) is not true then
    return 0;
  end if;

  v_inactivity_days := greatest(coalesce((v_cfg->>'inactivity_days')::integer, 30), 30);
  v_repeat_days := greatest(coalesce((v_cfg->>'repeat_days')::integer, 15), 1);
  v_batch_size := least(greatest(coalesce((v_cfg->>'batch_size')::integer, 50), 1), 200);

  with activity as (
    select
      p.id,
      p.name,
      regexp_replace(coalesce(nullif(p.whatsapp, ''), p.phone, ''), '[^0-9]', '', 'g') as raw_phone,
      coalesce(max(a.appointment_date) filter (where a.status = 'completed'), p.created_at::date) as activity_date
    from public.profiles p
    join public.user_roles ur on ur.user_id = p.id and ur.role::text = 'cliente'
    left join public.appointments a on a.client_id = p.id
    where coalesce(p.blocked, false) = false
    group by p.id, p.name, p.whatsapp, p.phone, p.created_at
  ), eligible as (
    select
      a.*,
      current_date - a.activity_date as inactive_days,
      floor(((current_date - a.activity_date) - v_inactivity_days)::numeric / v_repeat_days)::integer as cycle_number,
      case
        when a.raw_phone like '55%' and length(a.raw_phone) between 12 and 13 then a.raw_phone
        when length(a.raw_phone) in (10, 11) then '55' || a.raw_phone
        else null
      end as formatted_phone
    from activity a
    where a.activity_date is not null
      and current_date - a.activity_date >= v_inactivity_days
      and not exists (
        select 1 from public.appointments future
        where future.client_id = a.id
          and future.status in ('pending', 'confirmed')
          and future.appointment_date >= current_date
      )
  ), candidates as (
    select e.*
    from eligible e
    where e.formatted_phone is not null
      and not exists (
        select 1 from public.whatsapp_inactive_client_logs l
        where l.client_id = e.id
          and l.activity_date = e.activity_date
          and l.cycle_number = e.cycle_number
      )
    order by e.activity_date, e.id
    limit v_batch_size
  ), claimed as (
    insert into public.whatsapp_inactive_client_logs(client_id, activity_date, cycle_number, inactivity_days)
    select id, activity_date, cycle_number, inactive_days
    from candidates
    on conflict (client_id, activity_date, cycle_number) do nothing
    returning client_id, inactivity_days
  )
  insert into public.whatsapp_notifications_queue(
    appointment_id, client_phone, client_name, message_action, payload,
    target_type, target_phone, target_name
  )
  select
    null,
    c.formatted_phone,
    c.name,
    'inactive_client',
    jsonb_build_object(
      'appointmentId', c.id::text,
      'clientName', c.name,
      'phone', c.formatted_phone,
      'action', 'inactive_client',
      'targetType', 'client',
      'inactivityDays', cl.inactivity_days::text
    ),
    'client',
    c.formatted_phone,
    c.name
  from claimed cl
  join candidates c on c.id = cl.client_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function private.enqueue_inactive_client_messages() from public, anon, authenticated;

create or replace function private.run_inactive_client_campaign()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_queued integer;
  v_token text;
begin
  v_queued := private.enqueue_inactive_client_messages();
  if v_queued <= 0 then return; end if;

  select decrypted_secret into v_token
  from vault.decrypted_secrets
  where name = 'referral_cron_anon_key'
  limit 1;

  perform net.http_post(
    url := 'https://wabefmgfsatlusevxyfo.supabase.co/functions/v1/whatsapp-process-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_token,
      'Authorization', 'Bearer ' || v_token
    ),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function private.run_inactive_client_campaign() from public, anon, authenticated;

do $$
declare v_job bigint;
begin
  select jobid into v_job from cron.job where jobname = 'inactive-client-whatsapp-daily';
  if v_job is not null then perform cron.unschedule(v_job); end if;
  perform cron.schedule(
    'inactive-client-whatsapp-daily',
    '0 14 * * *',
    'select private.run_inactive_client_campaign();'
  );
end
$$;
