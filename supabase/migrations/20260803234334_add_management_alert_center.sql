-- Central de alertas acionaveis para administradores e gestores.

create table public.management_alert_states (
  fingerprint text primary key,
  alert_key text not null,
  status text not null default 'active' check (status in ('active', 'acknowledged', 'snoozed')),
  acknowledged_by uuid references auth.users(id) on delete set null,
  acknowledged_at timestamptz,
  snoozed_until timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'acknowledged' and acknowledged_by is not null and acknowledged_at is not null and snoozed_until is null)
    or (status = 'snoozed' and snoozed_until is not null and acknowledged_by is null and acknowledged_at is null)
    or (status = 'active' and snoozed_until is null and acknowledged_by is null and acknowledged_at is null)
  )
);

create index management_alert_states_status_updated_idx
  on public.management_alert_states (status, updated_at desc);
create index management_alert_states_acknowledged_by_idx
  on public.management_alert_states (acknowledged_by)
  where acknowledged_by is not null;

alter table public.management_alert_states enable row level security;
revoke all on table public.management_alert_states from public, anon, authenticated;
grant select, insert, update on table public.management_alert_states to authenticated;
grant all on table public.management_alert_states to service_role;

create policy management_alert_states_management_select
on public.management_alert_states for select to authenticated
using (
  (select public.has_role((select auth.uid()), 'admin'))
  or (select public.has_role((select auth.uid()), 'gestor'))
);

create policy management_alert_states_management_insert
on public.management_alert_states for insert to authenticated
with check (
  (select public.has_role((select auth.uid()), 'admin'))
  or (select public.has_role((select auth.uid()), 'gestor'))
);

create policy management_alert_states_management_update
on public.management_alert_states for update to authenticated
using (
  (select public.has_role((select auth.uid()), 'admin'))
  or (select public.has_role((select auth.uid()), 'gestor'))
)
with check (
  (select public.has_role((select auth.uid()), 'admin'))
  or (select public.has_role((select auth.uid()), 'gestor'))
);

create or replace function public.get_management_alerts(p_include_handled boolean default false)
returns table (
  fingerprint text,
  alert_key text,
  severity text,
  module text,
  title text,
  message text,
  item_count bigint,
  amount numeric,
  target_tab text,
  action_label text,
  state_status text,
  snoozed_until timestamptz,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  source_updated_at timestamptz
)
language plpgsql
security invoker
stable
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null or not (
    public.has_role(v_user_id, 'admin') or public.has_role(v_user_id, 'gestor')
  ) then
    raise exception 'Acesso restrito a administradores e gestores.';
  end if;

  return query
  with
  local_clock as (
    select
      (now() at time zone 'America/Sao_Paulo')::date as today,
      now() at time zone 'America/Sao_Paulo' as local_now
  ),
  pending_appointments as (
    select appointment.id, appointment.updated_at
    from public.appointments appointment cross join local_clock clock
    where appointment.status = 'confirmed'
      and (appointment.appointment_date + appointment.appointment_time) < clock.local_now
  ),
  failed_whatsapp as (
    select queue.id, coalesce(queue.processed_at, queue.created_at) as updated_at
    from public.whatsapp_notifications_queue queue
    where queue.status = 'failed'
  ),
  overdue_expenses as (
    select expense.id, expense.amount, expense.updated_at
    from public.operational_expenses expense cross join local_clock clock
    where expense.status = 'pending' and expense.due_date < clock.today
  ),
  item_stock as (
    select item.id, item.name, item.minimum_stock, item.updated_at,
      coalesce(sum(batch.quantity_remaining), 0)::numeric as stock
    from public.supply_items item
    left join public.supply_batches batch on batch.item_id = item.id and batch.quantity_remaining > 0
    where item.active
    group by item.id, item.name, item.minimum_stock, item.updated_at
  ),
  low_stock as (
    select stock.id, stock.updated_at
    from item_stock stock
    where stock.stock <= stock.minimum_stock
  ),
  expiring_batches as (
    select batch.id, batch.created_at as updated_at
    from public.supply_batches batch
    join public.supply_items item on item.id = batch.item_id
    cross join local_clock clock
    where item.active and batch.quantity_remaining > 0 and batch.expires_on is not null
      and batch.expires_on <= clock.today + item.expiry_warning_days
  ),
  open_cash as (
    select session.id, session.updated_at
    from public.daily_cash_sessions session cross join local_clock clock
    where session.status = 'open' and session.business_date < clock.today
  ),
  missing_schedules as (
    select barber.id::text || ':' || calendar.day::text as id, barber.updated_at
    from public.barbers barber
    cross join local_clock clock
    cross join lateral generate_series(clock.today, clock.today + 13, interval '1 day') calendar(day)
    where coalesce(barber.visible, true)
      and extract(isodow from calendar.day) between 1 and 6
      and not exists (
        select 1 from public.barber_schedules schedule
        where schedule.barber_id = barber.id and schedule.date = calendar.day::date
      )
  ),
  raw_alerts as (
    select
      'pending_finalizations:' || md5(string_agg(id::text, ',' order by id::text)) as fingerprint,
      'pending_finalizations'::text as alert_key, 'critical'::text as severity,
      'Agendamentos'::text as module, 'Servicos aguardando finalizacao'::text as title,
      format('%s atendimento(s) passaram do horario e ainda nao foram concluidos ou cancelados.', count(*))::text as message,
      count(*)::bigint as item_count, null::numeric as amount,
      'historico-cp'::text as target_tab, 'Revisar atendimentos'::text as action_label,
      max(updated_at)::timestamptz as source_updated_at
    from pending_appointments having count(*) > 0
    union all
    select 'whatsapp_failures:' || md5(string_agg(id::text, ',' order by id::text)),
      'whatsapp_failures', 'critical', 'WhatsApp', 'Mensagens com falha',
      format('%s mensagem(ns) nao foram entregues e precisam de revisao.', count(*)),
      count(*), null::numeric, 'whatsapp', 'Reprocessar mensagens', max(updated_at)
    from failed_whatsapp having count(*) > 0
    union all
    select 'overdue_expenses:' || md5(string_agg(id::text, ',' order by id::text)),
      'overdue_expenses', 'critical', 'Financeiro', 'Contas vencidas',
      format('%s conta(s) vencidas totalizam R$ %s.', count(*), to_char(sum(overdue.amount), 'FM999G999G990D00')),
      count(*), sum(overdue.amount), 'financial', 'Ver contas a pagar', max(overdue.updated_at)
    from overdue_expenses overdue having count(*) > 0
    union all
    select 'low_stock:' || md5(string_agg(id::text, ',' order by id::text)),
      'low_stock', 'warning', 'Estoque', 'Insumos no estoque minimo',
      format('%s item(ns) precisam de reposicao.', count(*)),
      count(*), null::numeric, 'supplies', 'Ver estoque', max(updated_at)
    from low_stock having count(*) > 0
    union all
    select 'expiring_batches:' || md5(string_agg(id::text, ',' order by id::text)),
      'expiring_batches', 'warning', 'Estoque', 'Lotes vencidos ou proximos do vencimento',
      format('%s lote(s) precisam de atencao.', count(*)),
      count(*), null::numeric, 'supplies', 'Revisar lotes', max(updated_at)
    from expiring_batches having count(*) > 0
    union all
    select 'open_cash:' || md5(string_agg(id::text, ',' order by id::text)),
      'open_cash', 'critical', 'Financeiro', 'Caixa anterior ainda aberto',
      format('%s caixa(s) de dias anteriores aguardam fechamento.', count(*)),
      count(*), null::numeric, 'financial', 'Fechar caixa', max(updated_at)
    from open_cash having count(*) > 0
    union all
    select 'missing_schedules:' || md5(string_agg(id, ',' order by id)),
      'missing_schedules', 'warning', 'Equipe', 'Agenda futura nao programada',
      format('%s dia(s) de barbeiros ainda nao foram configurados nos proximos 14 dias.', count(*)),
      count(*), null::numeric, 'users', 'Programar horarios', max(updated_at)
    from missing_schedules having count(*) > 0
  ),
  merged as (
    select alert.*, coalesce(state.status, 'active') as stored_status,
      state.snoozed_until, state.acknowledged_by, state.acknowledged_at,
      case
        when state.status = 'snoozed' and state.snoozed_until <= now() then 'active'
        else coalesce(state.status, 'active')
      end as effective_status
    from raw_alerts alert
    left join public.management_alert_states state on state.fingerprint = alert.fingerprint
  )
  select merged.fingerprint, merged.alert_key, merged.severity, merged.module,
    merged.title, merged.message, merged.item_count, merged.amount,
    merged.target_tab, merged.action_label, merged.effective_status,
    merged.snoozed_until, merged.acknowledged_by, merged.acknowledged_at,
    merged.source_updated_at
  from merged
  where p_include_handled or merged.effective_status = 'active'
  order by case merged.effective_status when 'active' then 1 when 'snoozed' then 2 else 3 end,
    case merged.severity when 'critical' then 1 when 'warning' then 2 else 3 end,
    merged.source_updated_at desc nulls last;
end;
$$;

create or replace function public.set_management_alert_state(
  p_fingerprint text,
  p_alert_key text,
  p_status text,
  p_snoozed_until timestamptz default null,
  p_note text default null
)
returns public.management_alert_states
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_state public.management_alert_states;
begin
  if v_user_id is null or not (
    public.has_role(v_user_id, 'admin') or public.has_role(v_user_id, 'gestor')
  ) then
    raise exception 'Acesso restrito a administradores e gestores.';
  end if;
  if nullif(trim(coalesce(p_fingerprint, '')), '') is null
    or nullif(trim(coalesce(p_alert_key, '')), '') is null then
    raise exception 'Alerta invalido.';
  end if;
  if p_status not in ('active', 'acknowledged', 'snoozed') then
    raise exception 'Estado de alerta invalido.';
  end if;
  if p_status = 'snoozed' and (p_snoozed_until is null or p_snoozed_until <= now()) then
    raise exception 'Informe uma data futura para adiar o alerta.';
  end if;

  insert into public.management_alert_states (
    fingerprint, alert_key, status, acknowledged_by, acknowledged_at,
    snoozed_until, note, updated_at
  ) values (
    trim(p_fingerprint), trim(p_alert_key), p_status,
    case when p_status = 'acknowledged' then v_user_id end,
    case when p_status = 'acknowledged' then now() end,
    case when p_status = 'snoozed' then p_snoozed_until end,
    nullif(trim(coalesce(p_note, '')), ''), now()
  )
  on conflict (fingerprint) do update set
    alert_key = excluded.alert_key,
    status = excluded.status,
    acknowledged_by = excluded.acknowledged_by,
    acknowledged_at = excluded.acknowledged_at,
    snoozed_until = excluded.snoozed_until,
    note = excluded.note,
    updated_at = now()
  returning * into v_state;
  return v_state;
end;
$$;

revoke all on function public.get_management_alerts(boolean) from public, anon;
revoke all on function public.set_management_alert_state(text, text, text, timestamptz, text) from public, anon;
grant execute on function public.get_management_alerts(boolean) to authenticated, service_role;
grant execute on function public.set_management_alert_state(text, text, text, timestamptz, text) to authenticated, service_role;

create trigger admin_audit_management_alert_states
after insert or update or delete on public.management_alert_states
for each row execute function public.capture_admin_audit('Alertas');

alter publication supabase_realtime add table public.management_alert_states;

comment on table public.management_alert_states is 'Decisoes persistidas da gestao sobre alertas operacionais dinamicos.';
comment on function public.get_management_alerts(boolean) is 'Consolida pendencias acionaveis da gestao sem duplicar regras operacionais.';
