-- Future completed appointments keep the service commission rate that was
-- configured when the attendance was completed. Historical rows stay NULL:
-- the previous rate cannot be reconstructed reliably from today's settings.
alter table public.appointments
  add column commission_percentage_applied numeric(5,2)
    check (commission_percentage_applied between 0 and 100),
  add column commission_captured_at timestamptz;

comment on column public.appointments.commission_percentage_applied is
  'Service commission percentage captured at completion; NULL means historical rate unavailable.';

create schema if not exists private;

create or replace function private.capture_appointment_service_commission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_percentage numeric(5,2);
  v_capture boolean;
begin
  -- Never trust a percentage supplied by a client. Preserve an existing
  -- snapshot unless a completed appointment is reassigned to another
  -- barber/service, or the appointment is completed again.
  if tg_op = 'UPDATE' then
    new.commission_percentage_applied := old.commission_percentage_applied;
    new.commission_captured_at := old.commission_captured_at;
    v_capture := new.status = 'completed' and (
      old.status is distinct from 'completed'
      or new.barber_id is distinct from old.barber_id
      or new.service_id is distinct from old.service_id
    );
  else
    new.commission_percentage_applied := null;
    new.commission_captured_at := null;
    v_capture := new.status = 'completed';
  end if;

  if v_capture then
    select coalesce(individual.commission_percentage,
                    fixed.service_commission_percentage, 0)
      into v_percentage
      from (select 1) anchor
      left join public.barber_commissions individual
        on individual.barber_id = new.barber_id
       and individual.service_id = new.service_id
      left join public.barber_fixed_commissions fixed
        on fixed.barber_id = new.barber_id;

    new.commission_percentage_applied := v_percentage;
    new.commission_captured_at := now();
  end if;

  return new;
end;
$$;

revoke all on function private.capture_appointment_service_commission()
  from public, anon, authenticated;

create trigger capture_appointment_service_commission
before insert or update of status, barber_id, service_id,
  commission_percentage_applied, commission_captured_at on public.appointments
for each row execute function private.capture_appointment_service_commission();

-- The authoritative managerial closing must use the same captured rate.
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
      appointment.commission_percentage_applied as captured_percentage,
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
        appointment.commission_percentage_applied,
        individual.commission_percentage,
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
      count(*)::integer as count,
      count(*) filter (where captured_percentage is null)::integer as estimated_rate_count
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
    'estimated_commission_rate_count', service_totals.estimated_rate_count,
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
