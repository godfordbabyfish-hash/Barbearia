create or replace function public.get_management_demand_forecast(
  p_reference_date date default current_date,
  p_horizon_days integer default 14
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_result jsonb;
begin
  if p_reference_date is null then raise exception 'Data de referência obrigatória'; end if;
  if p_horizon_days not between 7 and 31 then raise exception 'Horizonte deve ficar entre 7 e 31 dias'; end if;
  if not (public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'gestor')) then
    raise exception 'Acesso negado';
  end if;

  with future_days as (
    select day::date as forecast_date, extract(isodow from day)::integer as weekday
    from generate_series(p_reference_date::timestamp, (p_reference_date+p_horizon_days-1)::timestamp, interval '1 day') day
  ),
  historical as (
    select extract(isodow from appointments.appointment_date)::integer as weekday,
      count(*)::numeric/8 as average_appointments,
      coalesce(sum(services.duration),0)::numeric/8 as average_minutes,
      coalesce(sum(coalesce(appointments.final_price,appointments.original_price,services.price,0)),0)::numeric/8 as average_revenue
    from public.appointments appointments
    join public.services services on services.id=appointments.service_id
    where appointments.status='completed'
      and appointments.appointment_date between p_reference_date-56 and p_reference_date-1
    group by extract(isodow from appointments.appointment_date)
  ),
  booked as (
    select appointments.appointment_date,
      count(*)::numeric as appointments,
      coalesce(sum(services.duration),0)::numeric as minutes
    from public.appointments appointments
    join public.services services on services.id=appointments.service_id
    where appointments.status <> 'cancelled'
      and appointments.appointment_date between p_reference_date and p_reference_date+p_horizon_days-1
    group by appointments.appointment_date
  ),
  schedule_base as (
    select schedules.date,
      sum(greatest(0,case when schedules.closed or schedules.open is null or schedules.close is null
        or schedules.open !~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]'
        or schedules.close !~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]' then 0 else
        extract(epoch from (schedules.close::time-schedules.open::time))/60
        - case when schedules.has_lunch and schedules.lunch_start is not null and schedules.lunch_end is not null
            then greatest(0,extract(epoch from (schedules.lunch_end-schedules.lunch_start))/60) else 0 end
        - case when schedules.has_pause and schedules.pause_start is not null and schedules.pause_end is not null
            then greatest(0,extract(epoch from (schedules.pause_end-schedules.pause_start))/60) else 0 end
      end))::numeric as base_minutes
    from public.barber_schedules schedules
    where schedules.date between p_reference_date and p_reference_date+p_horizon_days-1
    group by schedules.date
  ),
  custom_breaks as (
    select breaks.date, sum(greatest(0,extract(epoch from (breaks.end_time-breaks.start_time))/60))::numeric as minutes
    from public.barber_breaks breaks
    where breaks.date between p_reference_date and p_reference_date+p_horizon_days-1
    group by breaks.date
  ),
  daily_forecast as (
    select future.forecast_date,
      round(greatest(coalesce(history.average_appointments,0),coalesce(booked.appointments,0)),1) as forecast_appointments,
      round(greatest(coalesce(history.average_minutes,0),coalesce(booked.minutes,0)),0) as forecast_minutes,
      round(coalesce(history.average_revenue,0),2) as forecast_revenue,
      round(greatest(0,coalesce(schedule.base_minutes,0)-coalesce(breaks.minutes,0)),0) as capacity_minutes,
      coalesce(booked.appointments,0)::integer as already_booked
    from future_days future
    left join historical history on history.weekday=future.weekday
    left join booked on booked.appointment_date=future.forecast_date
    left join schedule_base schedule on schedule.date=future.forecast_date
    left join custom_breaks breaks on breaks.date=future.forecast_date
  ),
  daily_with_risk as (
    select daily.*,
      round(case when capacity_minutes>0 then least(150,forecast_minutes*100/capacity_minutes) else 0 end,1) as expected_occupancy,
      case when capacity_minutes=0 and forecast_minutes>0 then 'critical'
           when capacity_minutes>0 and forecast_minutes/capacity_minutes>=0.85 then 'high'
           when capacity_minutes>0 and forecast_minutes/capacity_minutes>=0.70 then 'attention'
           else 'normal' end as risk
    from daily_forecast daily
  ),
  service_demand as (
    select services.id,services.title,
      count(*) filter(where appointments.appointment_date>=p_reference_date-30)::integer as last_30_days,
      count(*) filter(where appointments.appointment_date>=p_reference_date-60 and appointments.appointment_date<p_reference_date-30)::integer as previous_30_days,
      round(avg(coalesce(appointments.final_price,appointments.original_price,services.price)),2) as average_value
    from public.services services
    left join public.appointments appointments on appointments.service_id=services.id and appointments.status='completed'
      and appointments.appointment_date between p_reference_date-60 and p_reference_date-1
    where services.visible=true
    group by services.id,services.title
    order by last_30_days desc,services.title
    limit 8
  ),
  visit_sequence as (
    select appointments.client_id,appointments.appointment_date,
      lag(appointments.appointment_date) over(partition by appointments.client_id order by appointments.appointment_date) previous_date
    from public.appointments appointments
    where appointments.status='completed' and appointments.appointment_date>=p_reference_date-365
  ),
  client_stats as (
    select client_id,max(appointment_date) last_visit,
      greatest(14,least(60,round(avg(appointment_date-previous_date))))::integer average_interval,
      count(*)::integer visits
    from visit_sequence where previous_date is not null group by client_id
  ),
  returns_due as (
    select profiles.id,profiles.name,coalesce(profiles.whatsapp,profiles.phone) phone,stats.last_visit,
      stats.average_interval,(stats.last_visit+stats.average_interval) predicted_return,
      (p_reference_date-(stats.last_visit+stats.average_interval))::integer days_overdue,stats.visits+1 visits
    from client_stats stats join public.profiles profiles on profiles.id=stats.client_id
    where profiles.blocked is not true
      and stats.last_visit+stats.average_interval between p_reference_date-21 and p_reference_date+14
      and not exists(select 1 from public.appointments future where future.client_id=stats.client_id
        and future.status in ('pending','confirmed') and future.appointment_date>=p_reference_date)
    order by predicted_return,profiles.name limit 30
  ),
  current_stock as (
    select items.id,items.name,items.unit,items.minimum_stock,
      coalesce(sum(batches.quantity_remaining),0)::numeric current_stock
    from public.supply_items items left join public.supply_batches batches on batches.item_id=items.id and batches.quantity_remaining>0
    where items.active=true group by items.id,items.name,items.unit,items.minimum_stock
  ),
  consumption as (
    select consumptions.item_id,coalesce(sum(consumptions.quantity),0)::numeric/30 as daily_usage
    from public.supply_consumptions consumptions
    where consumptions.status='confirmed' and consumptions.consumption_date between p_reference_date-30 and p_reference_date-1
    group by consumptions.item_id
  ),
  stock_needs as (
    select stock.id,stock.name,stock.unit,round(stock.current_stock,3) current_stock,round(stock.minimum_stock,3) minimum_stock,
      round(coalesce(usage.daily_usage,0),3) average_daily_usage,
      case when coalesce(usage.daily_usage,0)>0 then round(stock.current_stock/usage.daily_usage,1) end days_remaining,
      round(greatest(0,stock.minimum_stock-stock.current_stock,coalesce(usage.daily_usage,0)*30-stock.current_stock),3) suggested_purchase,
      case when stock.current_stock<=0 then 'critical'
           when stock.current_stock<=stock.minimum_stock then 'low'
           when coalesce(usage.daily_usage,0)>0 and stock.current_stock/usage.daily_usage<=15 then 'attention'
           else 'normal' end risk
    from current_stock stock left join consumption usage on usage.item_id=stock.id
    where stock.current_stock<=stock.minimum_stock
       or (coalesce(usage.daily_usage,0)>0 and stock.current_stock/usage.daily_usage<=30)
    order by case when stock.current_stock<=0 then 1 when stock.current_stock<=stock.minimum_stock then 2 else 3 end,days_remaining nulls last
  )
  select jsonb_build_object(
    'generated_at',now(),'reference_date',p_reference_date,'horizon_days',p_horizon_days,
    'summary',jsonb_build_object(
      'forecast_appointments',coalesce((select round(sum(forecast_appointments),0) from daily_with_risk),0),
      'forecast_revenue',coalesce((select round(sum(forecast_revenue),2) from daily_with_risk),0),
      'high_demand_days',(select count(*) from daily_with_risk where risk in('high','critical')),
      'returns_due',(select count(*) from returns_due),
      'stock_attention',(select count(*) from stock_needs)
    ),
    'daily',(select coalesce(jsonb_agg(to_jsonb(daily) order by forecast_date),'[]'::jsonb) from daily_with_risk daily),
    'services',(select coalesce(jsonb_agg(to_jsonb(service)),'[]'::jsonb) from service_demand service),
    'client_returns',(select coalesce(jsonb_agg(to_jsonb(client_return)),'[]'::jsonb) from returns_due client_return),
    'stock_needs',(select coalesce(jsonb_agg(to_jsonb(stock)),'[]'::jsonb) from stock_needs stock)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.get_management_demand_forecast(date,integer) from public,anon;
grant execute on function public.get_management_demand_forecast(date,integer) to authenticated,service_role;

comment on function public.get_management_demand_forecast(date,integer) is
  'Deterministic 8-week demand, client return and 30-day stock runway forecast for management.';
