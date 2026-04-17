-- Bloqueio definitivo: impede agendamentos fora da programação do barbeiro
-- (escala mensal em barber_schedules tem prioridade sobre disponibilidade semanal)

create or replace function public.validate_appointment_barber_schedule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day_key text;
  v_day jsonb;
  v_availability jsonb;
  v_schedule_exists boolean := false;
  v_closed boolean := false;
  v_open time := time '09:00';
  v_close time := time '20:00';
  v_duration_min integer := 30;
  v_end_time time;
begin
  if new.barber_id is null or new.appointment_date is null or new.appointment_time is null then
    return new;
  end if;

  if new.status = 'cancelled' then
    return new;
  end if;

  select coalesce(s.duration, 30)
    into v_duration_min
  from public.services s
  where s.id = new.service_id;

  v_duration_min := coalesce(v_duration_min, 30);

  select
    true,
    coalesce(nullif(ms.open::text, '')::time, time '09:00'),
    coalesce(nullif(ms.close::text, '')::time, time '20:00'),
    coalesce(ms.closed, false)
  into v_schedule_exists, v_open, v_close, v_closed
  from public.barber_schedules ms
  where ms.barber_id = new.barber_id
    and ms.date = new.appointment_date
  limit 1;

  if not v_schedule_exists then
    v_day_key := case extract(dow from new.appointment_date)
      when 0 then 'sunday'
      when 1 then 'monday'
      when 2 then 'tuesday'
      when 3 then 'wednesday'
      when 4 then 'thursday'
      when 5 then 'friday'
      when 6 then 'saturday'
    end;

    select b.availability
      into v_availability
    from public.barbers b
    where b.id = new.barber_id;

    if v_availability is not null and v_availability ? v_day_key then
      v_day := v_availability -> v_day_key;
      v_closed := coalesce((v_day->>'closed')::boolean, false);
      v_open := coalesce(nullif(v_day->>'open', '')::time, v_open);
      v_close := coalesce(nullif(v_day->>'close', '')::time, v_close);
    end if;
  end if;

  if v_closed then
    raise exception 'Barbeiro indisponível nesta data';
  end if;

  v_end_time := (new.appointment_time + make_interval(mins => v_duration_min));

  if new.appointment_time < v_open then
    raise exception 'Horário fora da programação do barbeiro: abertura em %', to_char(v_open, 'HH24:MI');
  end if;

  if v_end_time > v_close then
    raise exception 'Horário fora da programação do barbeiro: fechamento em %', to_char(v_close, 'HH24:MI');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_appointment_barber_schedule on public.appointments;
create trigger trg_validate_appointment_barber_schedule
before insert or update of barber_id, appointment_date, appointment_time, service_id, status
on public.appointments
for each row
execute function public.validate_appointment_barber_schedule();
