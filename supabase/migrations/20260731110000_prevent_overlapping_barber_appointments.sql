-- Keep the configured duration as the source of truth and reject overlapping
-- appointments regardless of whether they come from the client, barber, or admin flow.

do $$
declare
  v_updated_count integer;
begin
  update public.services
  set duration = 45
  where lower(trim(title)) = lower('Corte + Barba (Sobrancelha gratuito e opcional)');

  get diagnostics v_updated_count = row_count;

  if v_updated_count <> 1 then
    raise exception 'Expected exactly one Corte + Barba service, found %.', v_updated_count;
  end if;
end;
$$;

-- The overlap trigger filters non-cancelled appointments by barber, date and time.
create index if not exists appointments_active_barber_date_time_idx
  on public.appointments (barber_id, appointment_date, appointment_time)
  where status <> 'cancelled';

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
    or coalesce(new.status, '') = 'cancelled' then
    return new;
  end if;

  select coalesce(s.duration, 30)
    into v_new_duration_minutes
  from public.services s
  where s.id = new.service_id;

  v_new_duration_minutes := coalesce(v_new_duration_minutes, 30);

  -- Serializes all appointment writes for the same barber/day. Without it,
  -- two requests could both pass the lookup before either row is committed.
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
    and a.status <> 'cancelled'
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
        'Horario indisponivel: conflita com um atendimento das %s as %s.',
        to_char(v_existing_start, 'HH24:MI'),
        to_char(
          v_existing_start + make_interval(mins => v_existing_duration_minutes),
          'HH24:MI'
        )
      ),
      detail = 'A duracao do servico e os cancelamentos sao considerados automaticamente.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_overlapping_barber_appointments on public.appointments;

create trigger trg_prevent_overlapping_barber_appointments
before insert or update of barber_id, appointment_date, appointment_time, service_id, status
on public.appointments
for each row
execute function public.prevent_overlapping_barber_appointments();

revoke all on function public.prevent_overlapping_barber_appointments() from public;
