-- Harden schedule validations to avoid cross-flow bypasses.
-- 1) Appointment validation now also enforces lunch/pause windows.
-- 2) Barber schedule updates are blocked when they would invalidate existing confirmed/pending appointments.

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
  v_has_lunch boolean := false;
  v_lunch_start time;
  v_lunch_end time;
  v_has_pause boolean := false;
  v_pause_start time;
  v_pause_end time;
  v_duration_min integer := 30;
  v_end_time time;
begin
  if new.barber_id is null or new.appointment_date is null or new.appointment_time is null then
    return new;
  end if;

  if coalesce(new.status, '') in ('cancelled', 'break') then
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
    coalesce(ms.closed, false),
    coalesce(ms.has_lunch, false),
    nullif(ms.lunch_start::text, '')::time,
    nullif(ms.lunch_end::text, '')::time,
    coalesce(ms.has_pause, false),
    nullif(ms.pause_start::text, '')::time,
    nullif(ms.pause_end::text, '')::time
  into
    v_schedule_exists,
    v_open,
    v_close,
    v_closed,
    v_has_lunch,
    v_lunch_start,
    v_lunch_end,
    v_has_pause,
    v_pause_start,
    v_pause_end
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
      v_has_lunch := coalesce((v_day->>'hasLunchBreak')::boolean, false);
      v_lunch_start := nullif(v_day->>'lunchStart', '')::time;
      v_lunch_end := nullif(v_day->>'lunchEnd', '')::time;
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

  if v_has_lunch and v_lunch_start is not null and v_lunch_end is not null then
    if new.appointment_time < v_lunch_end and v_end_time > v_lunch_start then
      raise exception 'Horário indisponível: intervalo de almoço (% - %)', to_char(v_lunch_start, 'HH24:MI'), to_char(v_lunch_end, 'HH24:MI');
    end if;
  end if;

  if v_has_pause and v_pause_start is not null and v_pause_end is not null then
    if new.appointment_time < v_pause_end and v_end_time > v_pause_start then
      raise exception 'Horário indisponível: intervalo de pausa (% - %)', to_char(v_pause_start, 'HH24:MI'), to_char(v_pause_end, 'HH24:MI');
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_barber_schedule_conflicts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conflict_count integer := 0;
  v_conflict_examples text;
begin
  if new.barber_id is null or new.date is null then
    return new;
  end if;

  if not coalesce(new.closed, false) then
    if new.open is null or new.close is null then
      raise exception 'Programação inválida: horário de abertura/fechamento é obrigatório.';
    end if;

    if new.open >= new.close then
      raise exception 'Programação inválida: abertura deve ser menor que fechamento.';
    end if;

    if coalesce(new.has_lunch, false) then
      if new.lunch_start is null or new.lunch_end is null then
        raise exception 'Programação inválida: preencha início e fim do almoço.';
      end if;

      if new.lunch_start >= new.lunch_end then
        raise exception 'Programação inválida: início do almoço deve ser menor que o fim.';
      end if;

      if new.lunch_start < new.open or new.lunch_end > new.close then
        raise exception 'Programação inválida: almoço deve estar dentro do horário de atendimento.';
      end if;
    end if;

    if coalesce(new.has_pause, false) then
      if new.pause_start is null or new.pause_end is null then
        raise exception 'Programação inválida: preencha início e fim da pausa.';
      end if;

      if new.pause_start >= new.pause_end then
        raise exception 'Programação inválida: início da pausa deve ser menor que o fim.';
      end if;

      if new.pause_start < new.open or new.pause_end > new.close then
        raise exception 'Programação inválida: pausa deve estar dentro do horário de atendimento.';
      end if;
    end if;
  end if;

  with candidate as (
    select
      a.id,
      coalesce(nullif(a.client_name, ''), p.name, 'Cliente') as client_name,
      coalesce(s.title, 'Serviço') as service_title,
      a.appointment_time::time as start_time,
      (a.appointment_time::time + make_interval(mins => coalesce(s.duration, 30))) as end_time
    from public.appointments a
    left join public.services s on s.id = a.service_id
    left join public.profiles p on p.id = a.client_id
    where a.barber_id = new.barber_id
      and a.appointment_date = new.date
      and a.status in ('pending', 'confirmed')
  ),
  conflicting as (
    select *
    from candidate c
    where
      coalesce(new.closed, false)
      or c.start_time < coalesce(new.open, time '09:00')
      or c.end_time > coalesce(new.close, time '20:00')
      or (
        coalesce(new.has_lunch, false)
        and new.lunch_start is not null
        and new.lunch_end is not null
        and c.start_time < new.lunch_end
        and c.end_time > new.lunch_start
      )
      or (
        coalesce(new.has_pause, false)
        and new.pause_start is not null
        and new.pause_end is not null
        and c.start_time < new.pause_end
        and c.end_time > new.pause_start
      )
  )
  select count(*)
    into v_conflict_count
  from conflicting;

  if v_conflict_count > 0 then
    with candidate as (
      select
        a.id,
        coalesce(nullif(a.client_name, ''), p.name, 'Cliente') as client_name,
        coalesce(s.title, 'Serviço') as service_title,
        a.appointment_time::time as start_time,
        (a.appointment_time::time + make_interval(mins => coalesce(s.duration, 30))) as end_time
      from public.appointments a
      left join public.services s on s.id = a.service_id
      left join public.profiles p on p.id = a.client_id
      where a.barber_id = new.barber_id
        and a.appointment_date = new.date
        and a.status in ('pending', 'confirmed')
    ),
    conflicting as (
      select *
      from candidate c
      where
        coalesce(new.closed, false)
        or c.start_time < coalesce(new.open, time '09:00')
        or c.end_time > coalesce(new.close, time '20:00')
        or (
          coalesce(new.has_lunch, false)
          and new.lunch_start is not null
          and new.lunch_end is not null
          and c.start_time < new.lunch_end
          and c.end_time > new.lunch_start
        )
        or (
          coalesce(new.has_pause, false)
          and new.pause_start is not null
          and new.pause_end is not null
          and c.start_time < new.pause_end
          and c.end_time > new.pause_start
        )
    )
    select string_agg(
      format('%s às %s (%s)', c.client_name, to_char(c.start_time, 'HH24:MI'), c.service_title),
      '; '
    )
      into v_conflict_examples
    from (
      select *
      from conflicting
      order by start_time
      limit 5
    ) c;

    raise exception 'Não é possível salvar a programação: % agendamento(s) confirmado(s) seriam impactados. %',
      v_conflict_count,
      coalesce('Exemplos: ' || v_conflict_examples, '');
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

drop trigger if exists trg_validate_barber_schedule_conflicts on public.barber_schedules;
create trigger trg_validate_barber_schedule_conflicts
before insert or update of barber_id, date, open, close, closed, has_lunch, lunch_start, lunch_end, has_pause, pause_start, pause_end
on public.barber_schedules
for each row
execute function public.validate_barber_schedule_conflicts();
