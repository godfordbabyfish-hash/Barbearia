-- Completed and cancelled appointments no longer occupy the live schedule.
-- Only confirmed appointments can block a new booking or a same-day fit-in.

drop index if exists public.appointments_active_barber_date_time_idx;

create index if not exists appointments_confirmed_barber_date_time_idx
  on public.appointments (barber_id, appointment_date, appointment_time)
  where status = 'confirmed';

create or replace function public.prevent_overlapping_barber_appointments()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_new_duration_minutes integer := 30;
  v_existing_start time;
  v_existing_duration_minutes integer;
begin
  if new.barber_id is null
    or new.appointment_date is null
    or new.appointment_time is null
    or coalesce(new.status, '') <> 'confirmed' then
    return new;
  end if;

  select coalesce(s.duration, 30)
    into v_new_duration_minutes
  from public.services s
  where s.id = new.service_id;

  v_new_duration_minutes := coalesce(v_new_duration_minutes, 30);

  perform pg_advisory_xact_lock(
    hashtext(new.barber_id::text || ':' || new.appointment_date::text)
  );

  select
    a.appointment_time::time,
    coalesce(s.duration, 30)
  into
    v_existing_start,
    v_existing_duration_minutes
  from public.appointments a
  left join public.services s on s.id = a.service_id
  where a.barber_id = new.barber_id
    and a.appointment_date = new.appointment_date
    and a.status = 'confirmed'
    and a.id is distinct from new.id
    and new.appointment_time::time
      < a.appointment_time::time + make_interval(mins => coalesce(s.duration, 30))
    and new.appointment_time::time + make_interval(mins => v_new_duration_minutes)
      > a.appointment_time::time
  order by a.appointment_time
  limit 1;

  if found then
    raise exception using
      errcode = '23P01',
      message = format(
        'Horario indisponivel: conflita com um atendimento ativo das %s as %s.',
        to_char(v_existing_start, 'HH24:MI'),
        to_char(
          v_existing_start + make_interval(mins => v_existing_duration_minutes),
          'HH24:MI'
        )
      ),
      detail = 'Somente atendimentos confirmados ocupam a agenda; cancelados e concluidos liberam o horario.';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_overlapping_barber_appointments() from public;
