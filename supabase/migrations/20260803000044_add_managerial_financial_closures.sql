-- Authoritative managerial closing for the whole barbershop.

create table public.managerial_financial_closures (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  revision integer not null default 1 check (revision > 0),
  status text not null default 'closed' check (status in ('closed', 'reopened')),
  service_revenue numeric(14,2) not null default 0,
  product_revenue numeric(14,2) not null default 0,
  gross_revenue numeric(14,2) not null default 0,
  service_commissions numeric(14,2) not null default 0,
  product_commissions numeric(14,2) not null default 0,
  gross_commissions numeric(14,2) not null default 0,
  approved_advances numeric(14,2) not null default 0,
  operational_expenses numeric(14,2) not null default 0,
  supply_consumption_cost numeric(14,2) not null default 0,
  discounts_granted numeric(14,2) not null default 0,
  cash_difference numeric(14,2) not null default 0,
  net_profit numeric(14,2) not null default 0,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  notes text,
  previous_closure_id uuid references public.managerial_financial_closures(id) on delete restrict,
  idempotency_key uuid not null unique,
  closed_by uuid not null references auth.users(id) on delete restrict,
  closed_at timestamptz not null default now(),
  reopened_by uuid references auth.users(id) on delete restrict,
  reopened_at timestamptz,
  reopening_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_start <= period_end),
  check (period_end - period_start <= 366),
  check (
    (status = 'closed' and reopened_by is null and reopened_at is null and reopening_reason is null)
    or
    (status = 'reopened' and reopened_by is not null and reopened_at is not null and length(trim(reopening_reason)) >= 5)
  ),
  unique (period_start, period_end, revision)
);

create unique index managerial_financial_closures_active_period_idx
  on public.managerial_financial_closures (period_start, period_end)
  where status = 'closed';
create index managerial_financial_closures_period_idx
  on public.managerial_financial_closures (period_start desc, period_end desc);
create index managerial_financial_closures_closed_by_idx
  on public.managerial_financial_closures (closed_by);
create index managerial_financial_closures_previous_idx
  on public.managerial_financial_closures (previous_closure_id)
  where previous_closure_id is not null;

create table public.managerial_financial_closure_audit (
  id uuid primary key default gen_random_uuid(),
  closure_id uuid not null references public.managerial_financial_closures(id) on delete restrict,
  event_type text not null check (event_type in ('closed', 'reopened')),
  reason text,
  actor_id uuid not null references auth.users(id) on delete restrict,
  event_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object')
);

create index managerial_financial_closure_audit_closure_idx
  on public.managerial_financial_closure_audit (closure_id, event_at desc);
create index managerial_financial_closure_audit_actor_idx
  on public.managerial_financial_closure_audit (actor_id);

alter table public.managerial_financial_closures enable row level security;
alter table public.managerial_financial_closure_audit enable row level security;

revoke all on table public.managerial_financial_closures from anon, authenticated;
revoke all on table public.managerial_financial_closure_audit from anon, authenticated;
grant select on table public.managerial_financial_closures to authenticated;
grant select on table public.managerial_financial_closure_audit to authenticated;
grant all on table public.managerial_financial_closures to service_role;
grant all on table public.managerial_financial_closure_audit to service_role;

create policy managerial_closures_select_management
on public.managerial_financial_closures for select to authenticated
using (
  (select public.has_role((select auth.uid()), 'admin'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gestor'::public.app_role))
);

create policy managerial_closure_audit_select_management
on public.managerial_financial_closure_audit for select to authenticated
using (
  (select public.has_role((select auth.uid()), 'admin'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gestor'::public.app_role))
);

create or replace function public.preview_managerial_financial_closure(
  p_period_start date,
  p_period_end date
)
returns jsonb
language plpgsql
security definer
stable
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null or not (
    public.has_role(v_user_id, 'admin'::public.app_role)
    or public.has_role(v_user_id, 'gestor'::public.app_role)
  ) then
    raise exception 'Acesso restrito à gestão.';
  end if;
  if p_period_start is null or p_period_end is null or p_period_start > p_period_end
     or p_period_end - p_period_start > 366 then
    raise exception 'Período inválido.';
  end if;

  with service_rows as (
    select
      appointment.id,
      appointment.barber_id,
      barber.name as barber_name,
      coalesce(
        appointment.final_price,
        (select sum(payment.amount) from public.appointment_payments payment where payment.appointment_id = appointment.id),
        appointment.original_price,
        service.price,
        0
      )::numeric as revenue,
      coalesce(appointment.discount_amount, 0)::numeric as discount,
      case when appointment.commission_basis = 'original'
        then coalesce(appointment.original_price, service.price, 0)
        else coalesce(
          appointment.final_price,
          (select sum(payment.amount) from public.appointment_payments payment where payment.appointment_id = appointment.id),
          appointment.original_price,
          service.price,
          0
        )
      end::numeric as commission_base,
      coalesce(
        nullif(individual.commission_percentage, 0),
        fixed.service_commission_percentage,
        0
      )::numeric as commission_percentage
    from public.appointments appointment
    join public.services service on service.id = appointment.service_id
    left join public.barbers barber on barber.id = appointment.barber_id
    left join public.barber_commissions individual
      on individual.barber_id = appointment.barber_id and individual.service_id = appointment.service_id
    left join public.barber_fixed_commissions fixed on fixed.barber_id = appointment.barber_id
    where appointment.appointment_date between p_period_start and p_period_end
      and appointment.status = 'completed'
  ),
  service_totals as (
    select
      coalesce(sum(revenue), 0)::numeric as revenue,
      coalesce(sum(discount), 0)::numeric as discounts,
      coalesce(sum(commission_base * commission_percentage / 100), 0)::numeric as commissions,
      count(*)::integer as count
    from service_rows
  ),
  product_totals as (
    select
      coalesce(sum(sale.total_price), 0)::numeric as revenue,
      coalesce(sum(sale.commission_value), 0)::numeric as commissions,
      count(*)::integer as count
    from public.product_sales sale
    where sale.sale_date between p_period_start and p_period_end
      and sale.status = 'confirmed'
  ),
  expense_totals as (
    select coalesce(sum(expense.amount), 0)::numeric as total, count(*)::integer as count
    from public.operational_expenses expense
    where expense.expense_date between p_period_start and p_period_end
      and expense.status = 'confirmed'
  ),
  advance_totals as (
    select coalesce(sum(advance.amount), 0)::numeric as total, count(*)::integer as count
    from public.barber_advances advance
    where advance.effective_date between p_period_start and p_period_end
      and advance.status = 'approved'
  ),
  supply_totals as (
    select
      coalesce(sum(allocation.quantity * allocation.unit_cost), 0)::numeric as total,
      count(distinct consumption.id)::integer as count
    from public.supply_consumptions consumption
    join public.supply_consumption_allocations allocation on allocation.consumption_id = consumption.id
    where consumption.consumption_date between p_period_start and p_period_end
      and consumption.status = 'active'
  ),
  cash_totals as (
    select
      coalesce(sum(session.cash_difference), 0)::numeric as difference,
      count(*)::integer as closed_days,
      coalesce(sum(abs(session.cash_difference)), 0)::numeric as absolute_difference
    from public.daily_cash_sessions session
    where session.business_date between p_period_start and p_period_end
      and session.status = 'closed'
  ),
  payment_totals as (
    select coalesce(jsonb_object_agg(method, amount), '{}'::jsonb) as breakdown
    from (
      select method, round(sum(amount), 2) as amount
      from (
        select lower(trim(payment.payment_method)) as method, payment.amount::numeric as amount
        from public.appointment_payments payment
        join public.appointments appointment on appointment.id = payment.appointment_id
        where appointment.appointment_date between p_period_start and p_period_end
          and appointment.status = 'completed'
        union all
        select lower(trim(coalesce(appointment.payment_method, 'outros'))),
          coalesce(appointment.final_price, appointment.original_price, service.price, 0)::numeric
        from public.appointments appointment
        join public.services service on service.id = appointment.service_id
        where appointment.appointment_date between p_period_start and p_period_end
          and appointment.status = 'completed'
          and not exists (select 1 from public.appointment_payments payment where payment.appointment_id = appointment.id)
        union all
        select lower(trim(coalesce(sale.payment_method, 'outros'))), sale.total_price::numeric
        from public.product_sales sale
        where sale.sale_date between p_period_start and p_period_end and sale.status = 'confirmed'
      ) payments
      group by method
    ) grouped
  ),
  barber_totals as (
    select coalesce(jsonb_agg(to_jsonb(summary) order by summary.revenue desc), '[]'::jsonb) as items
    from (
      select
        barber_id,
        coalesce(max(barber_name), 'Sem barbeiro') as barber_name,
        count(*)::integer as services,
        round(sum(revenue), 2) as revenue,
        round(sum(commission_base * commission_percentage / 100), 2) as commission
      from service_rows group by barber_id
    ) summary
  )
  select jsonb_build_object(
    'period_start', p_period_start,
    'period_end', p_period_end,
    'generated_at', now(),
    'service_revenue', round(service_totals.revenue, 2),
    'product_revenue', round(product_totals.revenue, 2),
    'gross_revenue', round(service_totals.revenue + product_totals.revenue, 2),
    'service_commissions', round(service_totals.commissions, 2),
    'product_commissions', round(product_totals.commissions, 2),
    'gross_commissions', round(service_totals.commissions + product_totals.commissions, 2),
    'approved_advances', round(advance_totals.total, 2),
    'operational_expenses', round(expense_totals.total, 2),
    'supply_consumption_cost', round(supply_totals.total, 2),
    'discounts_granted', round(service_totals.discounts, 2),
    'cash_difference', round(cash_totals.difference, 2),
    'cash_absolute_difference', round(cash_totals.absolute_difference, 2),
    'net_profit', round(
      service_totals.revenue + product_totals.revenue
      - service_totals.commissions - product_totals.commissions
      - expense_totals.total - supply_totals.total,
      2
    ),
    'service_count', service_totals.count,
    'product_sale_count', product_totals.count,
    'expense_count', expense_totals.count,
    'advance_count', advance_totals.count,
    'supply_consumption_count', supply_totals.count,
    'cash_closed_days', cash_totals.closed_days,
    'payment_breakdown', payment_totals.breakdown,
    'barbers', barber_totals.items
  ) into v_result
  from service_totals, product_totals, expense_totals, advance_totals,
       supply_totals, cash_totals, payment_totals, barber_totals;

  return v_result;
end;
$$;

create or replace function public.close_managerial_financial_period(
  p_period_start date,
  p_period_end date,
  p_notes text,
  p_idempotency_key uuid
)
returns public.managerial_financial_closures
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_snapshot jsonb;
  v_closure public.managerial_financial_closures;
  v_previous public.managerial_financial_closures;
  v_revision integer;
begin
  if v_user_id is null or not (
    public.has_role(v_user_id, 'admin'::public.app_role)
    or public.has_role(v_user_id, 'gestor'::public.app_role)
  ) then raise exception 'Acesso restrito à gestão.'; end if;
  if p_idempotency_key is null then raise exception 'Chave de idempotência obrigatória.'; end if;

  select * into v_closure from public.managerial_financial_closures
  where idempotency_key = p_idempotency_key;
  if found then return v_closure; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_period_start::text || ':' || p_period_end::text, 0));
  if exists (
    select 1 from public.managerial_financial_closures
    where period_start = p_period_start and period_end = p_period_end and status = 'closed'
  ) then raise exception 'Este período já possui um fechamento ativo.'; end if;

  select * into v_previous from public.managerial_financial_closures
  where period_start = p_period_start and period_end = p_period_end
  order by revision desc limit 1;
  v_revision := coalesce(v_previous.revision, 0) + 1;
  v_snapshot := public.preview_managerial_financial_closure(p_period_start, p_period_end);

  insert into public.managerial_financial_closures (
    period_start, period_end, revision, service_revenue, product_revenue, gross_revenue,
    service_commissions, product_commissions, gross_commissions, approved_advances,
    operational_expenses, supply_consumption_cost, discounts_granted, cash_difference,
    net_profit, snapshot, notes, previous_closure_id, idempotency_key, closed_by
  ) values (
    p_period_start, p_period_end, v_revision,
    (v_snapshot->>'service_revenue')::numeric, (v_snapshot->>'product_revenue')::numeric,
    (v_snapshot->>'gross_revenue')::numeric, (v_snapshot->>'service_commissions')::numeric,
    (v_snapshot->>'product_commissions')::numeric, (v_snapshot->>'gross_commissions')::numeric,
    (v_snapshot->>'approved_advances')::numeric, (v_snapshot->>'operational_expenses')::numeric,
    (v_snapshot->>'supply_consumption_cost')::numeric, (v_snapshot->>'discounts_granted')::numeric,
    (v_snapshot->>'cash_difference')::numeric, (v_snapshot->>'net_profit')::numeric,
    v_snapshot, nullif(trim(p_notes), ''), v_previous.id, p_idempotency_key, v_user_id
  ) returning * into v_closure;

  insert into public.managerial_financial_closure_audit (closure_id, event_type, actor_id, metadata)
  values (v_closure.id, 'closed', v_user_id, jsonb_build_object('revision', v_revision));
  return v_closure;
end;
$$;

create or replace function public.reopen_managerial_financial_period(
  p_closure_id uuid,
  p_reason text
)
returns public.managerial_financial_closures
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_closure public.managerial_financial_closures;
begin
  if v_user_id is null or not (
    public.has_role(v_user_id, 'admin'::public.app_role)
    or public.has_role(v_user_id, 'gestor'::public.app_role)
  ) then raise exception 'Acesso restrito à gestão.'; end if;
  if length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Informe uma justificativa com pelo menos 5 caracteres.';
  end if;

  select * into v_closure from public.managerial_financial_closures
  where id = p_closure_id for update;
  if not found then raise exception 'Fechamento não encontrado.'; end if;
  if v_closure.status = 'reopened' then return v_closure; end if;

  update public.managerial_financial_closures set
    status = 'reopened', reopened_by = v_user_id, reopened_at = now(),
    reopening_reason = trim(p_reason), updated_at = now()
  where id = p_closure_id returning * into v_closure;

  insert into public.managerial_financial_closure_audit (closure_id, event_type, reason, actor_id)
  values (v_closure.id, 'reopened', trim(p_reason), v_user_id);
  return v_closure;
end;
$$;

revoke all on function public.preview_managerial_financial_closure(date, date) from public, anon;
revoke all on function public.close_managerial_financial_period(date, date, text, uuid) from public, anon;
revoke all on function public.reopen_managerial_financial_period(uuid, text) from public, anon;
grant execute on function public.preview_managerial_financial_closure(date, date) to authenticated, service_role;
grant execute on function public.close_managerial_financial_period(date, date, text, uuid) to authenticated, service_role;
grant execute on function public.reopen_managerial_financial_period(uuid, text) to authenticated, service_role;

comment on table public.managerial_financial_closures is
  'Snapshot versionado do resultado gerencial da barbearia por período.';
comment on table public.managerial_financial_closure_audit is
  'Auditoria de fechamento e reabertura dos períodos gerenciais.';
