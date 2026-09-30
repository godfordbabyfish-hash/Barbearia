create or replace function public.get_barber_revenue_evolution(
  p_start date,
  p_end date,
  p_granularity text,
  p_barber_id uuid default null
)
returns table (
  period_start date,
  barber_id uuid,
  barber_name text,
  image_url text,
  service_revenue numeric,
  productive_minutes numeric,
  available_minutes numeric,
  booked_minutes numeric,
  idle_minutes numeric
)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_start is null or p_end is null or p_end < p_start then
    raise exception 'Período inválido';
  end if;
  if p_end - p_start > 366 then
    raise exception 'O período máximo é de 367 dias';
  end if;
  if p_granularity is null or p_granularity not in ('day', 'month') then
    raise exception 'Granularidade inválida';
  end if;
  if p_granularity = 'day' and p_end - p_start > 30 then
    raise exception 'A visualização diária aceita no máximo 31 dias';
  end if;
  if not (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'gestor')
  ) then
    raise exception 'Acesso negado';
  end if;
  if p_barber_id is not null and not exists (
    select 1 from public.barbers b where b.id = p_barber_id and b.visible = true
  ) then
    raise exception 'Barbeiro não encontrado ou indisponível';
  end if;

  return query
  with calendar_days as (
    select generated.day::date as work_date
    from generate_series(p_start::timestamp, p_end::timestamp, interval '1 day') generated(day)
  ),
  selected_barbers as (
    select b.id, b.name, b.image_url, b.availability
    from public.barbers b
    where b.visible = true
      and (p_barber_id is null or b.id = p_barber_id)
  ),
  shop_hours as (
    select config.config_value as availability
    from public.site_config config
    where config.config_key = 'operating_hours'
    limit 1
  ),
  schedule_source as (
    select calendar.work_date as date, barber.id as barber_id,
      case extract(dow from calendar.work_date)::integer
        when 0 then 'sunday'
        when 1 then 'monday'
        when 2 then 'tuesday'
        when 3 then 'wednesday'
        when 4 then 'thursday'
        when 5 then 'friday'
        when 6 then 'saturday'
      end as day_key,
      schedules.barber_id is not null as has_date_override,
      schedules.closed as override_closed,
      schedules.open as override_open,
      schedules.close as override_close,
      schedules.has_lunch as override_has_lunch,
      schedules.lunch_start as override_lunch_start,
      schedules.lunch_end as override_lunch_end,
      schedules.has_pause as override_has_pause,
      schedules.pause_start as override_pause_start,
      schedules.pause_end as override_pause_end,
      barber.availability as barber_availability,
      shop.availability as shop_availability
    from calendar_days calendar
    cross join selected_barbers barber
    left join public.barber_schedules schedules
      on schedules.barber_id = barber.id and schedules.date = calendar.work_date
    left join shop_hours shop on true
  ),
  effective_schedule as (
    select source.date, source.barber_id,
      case when source.has_date_override then coalesce(source.override_closed, false)
           when source.barber_availability ? source.day_key
             then coalesce((source.barber_availability -> source.day_key ->> 'closed')::boolean, false)
           else coalesce((source.shop_availability -> source.day_key ->> 'closed')::boolean,
             extract(dow from source.date)::integer = 0)
      end as closed,
      case when source.has_date_override then coalesce(nullif(source.override_open, '')::time, time '09:00')
           when source.barber_availability ? source.day_key
             then coalesce(nullif(source.barber_availability -> source.day_key ->> 'open', '')::time, time '09:00')
           else coalesce(nullif(source.shop_availability -> source.day_key ->> 'open', '')::time, time '09:00')
      end as open_time,
      case when source.has_date_override then coalesce(nullif(source.override_close, '')::time, time '20:00')
           when source.barber_availability ? source.day_key
             then coalesce(nullif(source.barber_availability -> source.day_key ->> 'close', '')::time, time '20:00')
           else coalesce(nullif(source.shop_availability -> source.day_key ->> 'close', '')::time,
             case when extract(dow from source.date)::integer in (0, 6) then time '18:00' else time '20:00' end)
      end as close_time,
      case when source.has_date_override then coalesce(source.override_has_lunch, false)
           when source.barber_availability ? source.day_key
             then coalesce((source.barber_availability -> source.day_key ->> 'hasLunchBreak')::boolean, false)
           else coalesce((source.shop_availability -> source.day_key ->> 'hasLunchBreak')::boolean, false)
      end as has_lunch,
      case when source.has_date_override then source.override_lunch_start
           when source.barber_availability ? source.day_key
             then nullif(source.barber_availability -> source.day_key ->> 'lunchStart', '')::time
           else nullif(source.shop_availability -> source.day_key ->> 'lunchStart', '')::time
      end as lunch_start,
      case when source.has_date_override then source.override_lunch_end
           when source.barber_availability ? source.day_key
             then nullif(source.barber_availability -> source.day_key ->> 'lunchEnd', '')::time
           else nullif(source.shop_availability -> source.day_key ->> 'lunchEnd', '')::time
      end as lunch_end,
      case when source.has_date_override then source.override_has_pause else false end as has_pause,
      source.override_pause_start as pause_start,
      source.override_pause_end as pause_end
    from schedule_source source
  ),
  schedule_blocks as (
    select effective.barber_id, effective.date,
      tsrange(effective.date + effective.lunch_start, effective.date + effective.lunch_end, '[)') as blocked_range
    from effective_schedule effective
    where not effective.closed
      and effective.has_lunch
      and effective.lunch_start is not null
      and effective.lunch_end > effective.lunch_start
    union all
    select effective.barber_id, effective.date,
      tsrange(effective.date + effective.pause_start, effective.date + effective.pause_end, '[)') as blocked_range
    from effective_schedule effective
    where not effective.closed
      and effective.has_pause
      and effective.pause_start is not null
      and effective.pause_end > effective.pause_start
    union all
    select breaks.barber_id, breaks.date,
      tsrange(breaks.date + breaks.start_time, breaks.date + breaks.end_time, '[)') as blocked_range
    from public.barber_breaks breaks
    where breaks.date between p_start and p_end
      and (p_barber_id is null or breaks.barber_id = p_barber_id)
      and breaks.end_time > breaks.start_time
  ),
  merged_schedule_blocks as (
    select blocks.barber_id, blocks.date, range_agg(blocks.blocked_range) as blocked_ranges
    from schedule_blocks blocks
    group by blocks.barber_id, blocks.date
  ),
  schedule_base as (
    select effective.barber_id, effective.date,
      (effective.date + effective.open_time)::timestamp as work_start,
      (effective.date + effective.close_time)::timestamp as work_end,
      greatest(0,
        case when effective.closed then 0
             else extract(epoch from (effective.close_time - effective.open_time)) / 60
        end
      )::numeric as base_minutes
    from effective_schedule effective
  ),
  schedule_available as (
    select schedule.barber_id, schedule.date,
      greatest(0, schedule.base_minutes - coalesce(blocked.blocked_minutes, 0))::numeric as available_minutes
    from schedule_base schedule
    left join merged_schedule_blocks blocks
      on blocks.barber_id = schedule.barber_id and blocks.date = schedule.date
    left join lateral (
      select sum(
        extract(epoch from (
          least(upper(intervals.blocked_range), schedule.work_end)
          - greatest(lower(intervals.blocked_range), schedule.work_start)
        )) / 60
      )::numeric as blocked_minutes
      from unnest(blocks.blocked_ranges) as intervals(blocked_range)
      where intervals.blocked_range && tsrange(schedule.work_start, schedule.work_end, '[)')
    ) blocked on true
  ),
  appointment_daily as (
    select appointments.barber_id, appointments.appointment_date as work_date,
      coalesce(sum(services.duration) filter (where appointments.status <> 'cancelled'), 0)::numeric as booked_minutes,
      coalesce(sum(services.duration) filter (where appointments.status = 'completed'), 0)::numeric as productive_minutes,
      coalesce(sum(coalesce(appointments.final_price, appointments.original_price, services.price, 0))
        filter (where appointments.status = 'completed'), 0)::numeric as service_revenue
    from public.appointments appointments
    join public.services services on services.id = appointments.service_id
    where appointments.appointment_date between p_start and p_end
      and (p_barber_id is null or appointments.barber_id = p_barber_id)
    group by appointments.barber_id, appointments.appointment_date
  ),
  daily_by_barber as (
    select calendar.work_date, barber.id as barber_id, barber.name as barber_name, barber.image_url,
      coalesce(appointments.service_revenue, 0)::numeric as service_revenue,
      coalesce(appointments.productive_minutes, 0)::numeric as productive_minutes,
      coalesce(schedule.available_minutes, 0)::numeric as available_minutes,
      coalesce(appointments.booked_minutes, 0)::numeric as booked_minutes,
      greatest(0, coalesce(schedule.available_minutes, 0) - coalesce(appointments.booked_minutes, 0))::numeric as idle_minutes
    from calendar_days calendar
    cross join selected_barbers barber
    left join schedule_available schedule
      on schedule.barber_id = barber.id and schedule.date = calendar.work_date
    left join appointment_daily appointments
      on appointments.barber_id = barber.id and appointments.work_date = calendar.work_date
  ),
  bucketed as (
    select case when p_granularity = 'day' then daily.work_date
                else date_trunc('month', daily.work_date::timestamp)::date end as bucket_start,
      daily.barber_id, daily.barber_name, daily.image_url,
      sum(daily.service_revenue)::numeric as service_revenue,
      sum(daily.productive_minutes)::numeric as productive_minutes,
      sum(daily.available_minutes)::numeric as available_minutes,
      sum(daily.booked_minutes)::numeric as booked_minutes,
      sum(daily.idle_minutes)::numeric as idle_minutes
    from daily_by_barber daily
    group by bucket_start, daily.barber_id, daily.barber_name, daily.image_url
  )
  select bucketed.bucket_start, bucketed.barber_id, bucketed.barber_name, bucketed.image_url,
    round(bucketed.service_revenue, 2), round(bucketed.productive_minutes, 2),
    round(bucketed.available_minutes, 2), round(bucketed.booked_minutes, 2), round(bucketed.idle_minutes, 2)
  from bucketed
  order by bucketed.bucket_start, bucketed.barber_name;
end;
$$;

revoke all on function public.get_barber_revenue_evolution(date, date, text, uuid) from public, anon;
grant execute on function public.get_barber_revenue_evolution(date, date, text, uuid) to authenticated, service_role;

comment on function public.get_barber_revenue_evolution(date, date, text, uuid) is
  'Read-only management aggregation of completed service revenue, programmed capacity, booked minutes, and idle chair opportunity by day or month.';
