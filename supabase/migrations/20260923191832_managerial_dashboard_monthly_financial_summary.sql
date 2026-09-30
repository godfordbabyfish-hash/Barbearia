-- Read-only monthly dashboard series, reusing the authoritative financial
-- closure preview so commissions, paid expenses and allocated supply costs
-- follow the same calculation used by managerial closing.
create or replace function public.get_managerial_monthly_financial_summary(
  p_year integer
)
returns table (
  month_start date,
  service_revenue numeric,
  product_revenue numeric,
  gross_revenue numeric,
  service_commissions numeric,
  product_commissions numeric,
  operational_expenses numeric,
  supply_consumption_cost numeric,
  net_profit numeric,
  estimated_commission_rate_count integer
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_year_start date;
  v_year_end date;
begin
  if v_user_id is null or not (
    public.has_role(v_user_id, 'admin'::public.app_role)
    or public.has_role(v_user_id, 'gestor'::public.app_role)
  ) then
    raise exception 'Acesso restrito à gestão.';
  end if;

  if p_year is null or p_year < 2000 or p_year > extract(year from v_today)::integer then
    raise exception 'Ano inválido.';
  end if;

  v_year_start := make_date(p_year, 1, 1);
  v_year_end := least(make_date(p_year, 12, 31), v_today - 1);

  return query
  with all_periods as (
    select month_date::date as month_start
    from generate_series(
      v_year_start::timestamp,
      make_date(p_year, 12, 1)::timestamp,
      interval '1 month'
    ) as generated(month_date)
  ), payment_totals as (
    select
      payment.appointment_id,
      sum(payment.amount)::numeric as amount
    from public.appointment_payments payment
    join public.appointments appointment on appointment.id = payment.appointment_id
    where appointment.appointment_date between v_year_start and v_year_end
      and appointment.status = 'completed'
    group by payment.appointment_id
  ), service_monthly as (
    select
      date_trunc('month', appointment.appointment_date)::date as month_start,
      sum(coalesce(
        appointment.final_price,
        payment.amount,
        appointment.original_price,
        service.price,
        0
      ))::numeric as revenue,
      sum(
        (case when appointment.commission_basis = 'original'
          then coalesce(appointment.original_price, service.price, 0)
          else coalesce(
            appointment.final_price,
            payment.amount,
            appointment.original_price,
            service.price,
            0
          )
        end)
        * coalesce(
          appointment.commission_percentage_applied,
          individual.commission_percentage,
          fixed.service_commission_percentage,
          0
        ) / 100
      )::numeric as commissions,
      count(*) filter (
        where appointment.commission_percentage_applied is null
      )::integer as estimated_rate_count
    from public.appointments appointment
    join public.services service on service.id = appointment.service_id
    left join payment_totals payment on payment.appointment_id = appointment.id
    left join public.barber_commissions individual
      on individual.barber_id = appointment.barber_id
     and individual.service_id = appointment.service_id
    left join public.barber_fixed_commissions fixed
      on fixed.barber_id = appointment.barber_id
    where appointment.appointment_date between v_year_start and v_year_end
      and appointment.status = 'completed'
    group by date_trunc('month', appointment.appointment_date)::date
  ), product_monthly as (
    select
      date_trunc('month', sale.sale_date)::date as month_start,
      sum(sale.total_price)::numeric as revenue,
      sum(sale.commission_value)::numeric as commissions
    from public.product_sales sale
    where sale.sale_date between v_year_start and v_year_end
      and sale.status = 'confirmed'
    group by date_trunc('month', sale.sale_date)::date
  ), expense_monthly as (
    select
      date_trunc('month', expense.expense_date)::date as month_start,
      sum(expense.amount)::numeric as total
    from public.operational_expenses expense
    where expense.expense_date between v_year_start and v_year_end
      and expense.status = 'confirmed'
    group by date_trunc('month', expense.expense_date)::date
  ), supply_monthly as (
    select
      date_trunc('month', consumption.consumption_date)::date as month_start,
      sum(allocation.quantity * allocation.unit_cost)::numeric as total
    from public.supply_consumptions consumption
    join public.supply_consumption_allocations allocation
      on allocation.consumption_id = consumption.id
    where consumption.consumption_date between v_year_start and v_year_end
      and consumption.status = 'active'
    group by date_trunc('month', consumption.consumption_date)::date
  )
  select
    period.month_start,
    round(coalesce(service.revenue, 0), 2),
    round(coalesce(product.revenue, 0), 2),
    round(coalesce(service.revenue, 0) + coalesce(product.revenue, 0), 2),
    round(coalesce(service.commissions, 0), 2),
    round(coalesce(product.commissions, 0), 2),
    round(coalesce(expense.total, 0), 2),
    round(coalesce(supply.total, 0), 2),
    round(
      coalesce(service.revenue, 0) + coalesce(product.revenue, 0)
      - coalesce(service.commissions, 0) - coalesce(product.commissions, 0)
      - coalesce(expense.total, 0) - coalesce(supply.total, 0),
      2
    ),
    coalesce(service.estimated_rate_count, 0)::integer
  from all_periods period
  left join service_monthly service using (month_start)
  left join product_monthly product using (month_start)
  left join expense_monthly expense using (month_start)
  left join supply_monthly supply using (month_start)
  order by period.month_start;
end;
$$;

revoke all on function public.get_managerial_monthly_financial_summary(integer) from public, anon;
grant execute on function public.get_managerial_monthly_financial_summary(integer) to authenticated, service_role;

comment on function public.get_managerial_monthly_financial_summary(integer) is
  'Read-only monthly dashboard summary using the same financial rules as managerial closing, aggregated in one pass per source table.';

notify pgrst, 'reload schema';
