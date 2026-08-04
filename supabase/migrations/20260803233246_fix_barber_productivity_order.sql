create or replace function public.get_barber_productivity_metrics(p_start date, p_end date)
returns table (
  barber_id uuid,
  barber_name text,
  image_url text,
  available_minutes numeric,
  booked_minutes numeric,
  productive_minutes numeric,
  idle_minutes numeric,
  total_appointments bigint,
  completed_appointments bigint,
  cancelled_appointments bigint,
  pending_finalizations bigint,
  distinct_clients bigint,
  service_revenue numeric,
  product_revenue numeric,
  product_sales bigint,
  average_ticket numeric,
  occupancy_rate numeric,
  productive_rate numeric,
  completion_rate numeric,
  cancellation_rate numeric,
  revenue_per_available_hour numeric
)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_start is null or p_end is null or p_end < p_start then
    raise exception 'PerÃ­odo invÃ¡lido';
  end if;
  if p_end - p_start > 366 then raise exception 'O perÃ­odo mÃ¡ximo Ã© de 367 dias'; end if;
  if not (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'gestor')
  ) then raise exception 'Acesso negado'; end if;

  return query
  with schedule_base as (
    select schedules.barber_id, schedules.date,
      greatest(0,
        case when coalesce(schedules.closed, false)
          or schedules.open is null or schedules.close is null
          or schedules.open !~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]'
          or schedules.close !~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]'
        then 0 else
          extract(epoch from (schedules.close::time - schedules.open::time)) / 60
          - case when schedules.has_lunch and schedules.lunch_start is not null and schedules.lunch_end is not null
              then greatest(0, extract(epoch from (schedules.lunch_end - schedules.lunch_start)) / 60) else 0 end
          - case when schedules.has_pause and schedules.pause_start is not null and schedules.pause_end is not null
              then greatest(0, extract(epoch from (schedules.pause_end - schedules.pause_start)) / 60) else 0 end
        end
      )::numeric as base_minutes
    from public.barber_schedules schedules
    where schedules.date between p_start and p_end
  ),
  custom_breaks as (
    select breaks.barber_id, breaks.date,
      sum(greatest(0, extract(epoch from (breaks.end_time - breaks.start_time)) / 60))::numeric as break_minutes
    from public.barber_breaks breaks
    where breaks.date between p_start and p_end
    group by breaks.barber_id, breaks.date
  ),
  schedule_totals as (
    select schedule.barber_id,
      sum(greatest(0, schedule.base_minutes - coalesce(custom.break_minutes, 0)))::numeric as available_minutes
    from schedule_base schedule
    left join custom_breaks custom on custom.barber_id=schedule.barber_id and custom.date=schedule.date
    group by schedule.barber_id
  ),
  appointment_totals as (
    select appointments.barber_id,
      coalesce(sum(services.duration) filter (where appointments.status <> 'cancelled'), 0)::numeric as booked_minutes,
      coalesce(sum(services.duration) filter (where appointments.status = 'completed'), 0)::numeric as productive_minutes,
      count(*)::bigint as total_appointments,
      count(*) filter (where appointments.status = 'completed')::bigint as completed_appointments,
      count(*) filter (where appointments.status = 'cancelled')::bigint as cancelled_appointments,
      count(*) filter (
        where appointments.status in ('pending','confirmed')
          and (appointments.appointment_date + appointments.appointment_time) < (now() at time zone 'America/Sao_Paulo')
      )::bigint as pending_finalizations,
      count(distinct appointments.client_id) filter (where appointments.status = 'completed')::bigint as distinct_clients,
      coalesce(sum(coalesce(appointments.final_price, appointments.original_price, services.price, 0))
        filter (where appointments.status = 'completed'), 0)::numeric as service_revenue
    from public.appointments appointments
    join public.services services on services.id=appointments.service_id
    where appointments.appointment_date between p_start and p_end
    group by appointments.barber_id
  ),
  product_totals as (
    select sales.barber_id, coalesce(sum(sales.total_price),0)::numeric as product_revenue,
      count(*)::bigint as product_sales
    from public.product_sales sales
    where sales.status='confirmed' and sales.sale_date between p_start and p_end
    group by sales.barber_id
  )
  select barbers.id, barbers.name, barbers.image_url,
    round(coalesce(schedule.available_minutes,0),2),
    round(coalesce(appointments.booked_minutes,0),2),
    round(coalesce(appointments.productive_minutes,0),2),
    round(greatest(0,coalesce(schedule.available_minutes,0)-coalesce(appointments.booked_minutes,0)),2),
    coalesce(appointments.total_appointments,0), coalesce(appointments.completed_appointments,0),
    coalesce(appointments.cancelled_appointments,0), coalesce(appointments.pending_finalizations,0),
    coalesce(appointments.distinct_clients,0), round(coalesce(appointments.service_revenue,0),2),
    round(coalesce(products.product_revenue,0),2), coalesce(products.product_sales,0),
    round(case when coalesce(appointments.completed_appointments,0)>0
      then (coalesce(appointments.service_revenue,0)+coalesce(products.product_revenue,0))/appointments.completed_appointments else 0 end,2),
    round(case when coalesce(schedule.available_minutes,0)>0
      then least(100,coalesce(appointments.booked_minutes,0)*100/schedule.available_minutes) else 0 end,2),
    round(case when coalesce(schedule.available_minutes,0)>0
      then least(100,coalesce(appointments.productive_minutes,0)*100/schedule.available_minutes) else 0 end,2),
    round(case when coalesce(appointments.total_appointments,0)>0
      then appointments.completed_appointments*100.0/appointments.total_appointments else 0 end,2),
    round(case when coalesce(appointments.total_appointments,0)>0
      then appointments.cancelled_appointments*100.0/appointments.total_appointments else 0 end,2),
    round(case when coalesce(schedule.available_minutes,0)>0
      then (coalesce(appointments.service_revenue,0)+coalesce(products.product_revenue,0))*60/schedule.available_minutes else 0 end,2)
  from public.barbers barbers
  left join schedule_totals schedule on schedule.barber_id=barbers.id
  left join appointment_totals appointments on appointments.barber_id=barbers.id
  left join product_totals products on products.barber_id=barbers.id
  where barbers.visible=true
  order by 16 desc, (13 + 14) desc, 2;
end;
$$;

revoke all on function public.get_barber_productivity_metrics(date,date) from public, anon;
grant execute on function public.get_barber_productivity_metrics(date,date) to authenticated, service_role;

comment on function public.get_barber_productivity_metrics(date,date) is
  'Management-only productivity metrics based on programmed availability minus breaks and service duration.';
