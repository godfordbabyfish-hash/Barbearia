-- Barbers may record a fit while another appointment is active. Once recorded,
-- that fit occupies its slot and must block new ordinary/online bookings.
alter table public.appointments
  add column if not exists is_fit boolean not null default false;

-- Preserve encaixes already created by the barber dashboard before this column.
update public.appointments
set is_fit = true
where booking_type = 'local'
  and notes ~ '^\{"fit":true(,|\})';

create or replace function public.prevent_overlapping_barber_appointments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new_duration_minutes integer := 30;
  v_existing_start time;
  v_existing_duration_minutes integer;
  v_actor uuid;
begin
  if tg_op = 'UPDATE' then
    if new.is_fit is distinct from old.is_fit then
      raise exception 'O tipo encaixe de um agendamento existente não pode ser alterado.'
        using errcode = '23514';
    end if;
  end if;

  -- Accept the existing dashboard payload until the frontend with is_fit ships.
  if tg_op = 'INSERT' and new.booking_type = 'local'
    and new.notes ~ '^\{"fit":true(,|\})' then
    new.is_fit := true;
  end if;

  if new.is_fit then
    if tg_op = 'INSERT' then
      v_actor := auth.uid();
      if new.booking_type is distinct from 'local'
        or v_actor is null
        or not (
          public.has_role(v_actor, 'admin'::public.app_role)
          or public.has_role(v_actor, 'gestor'::public.app_role)
          or exists (
            select 1 from public.barbers b
            where b.id = new.barber_id and b.user_id = v_actor
          )
        ) then
        raise exception 'Apenas a equipe pode registrar encaixes locais.'
          using errcode = '42501';
      end if;
    end if;
  end if;

  if new.barber_id is null
    or new.appointment_date is null
    or new.appointment_time is null
    or coalesce(new.status, '') not in ('pending', 'confirmed') then
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

  -- Encaixes podem sobrepor um compromisso que já existia, mas adquirem o
  -- mesmo lock antes de entrar. Assim, uma reserva comum iniciada depois do
  -- encaixe sempre o enxerga e é recusada, inclusive sob concorrência.
  if new.is_fit then
    return new;
  end if;

  select a.appointment_time::time, coalesce(s.duration, 30)
    into v_existing_start, v_existing_duration_minutes
  from public.appointments a
  left join public.services s on s.id = a.service_id
  where a.barber_id = new.barber_id
    and a.appointment_date = new.appointment_date
    and a.status in ('pending', 'confirmed')
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
        to_char(v_existing_start + make_interval(mins => v_existing_duration_minutes), 'HH24:MI')
      ),
      detail = 'Atendimentos pendentes ou confirmados, inclusive encaixes, ocupam a agenda; cancelados e concluidos liberam horarios.';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_overlapping_barber_appointments() from public, anon, authenticated;

-- Include is_fit in the trigger columns so an UPDATE cannot turn an existing
-- ordinary booking into a fit without passing the immutability check above.
drop trigger if exists trg_prevent_overlapping_barber_appointments on public.appointments;
create trigger trg_prevent_overlapping_barber_appointments
before insert or update of barber_id, appointment_date, appointment_time, service_id, status, is_fit
on public.appointments
for each row
execute function public.prevent_overlapping_barber_appointments();

-- The public availability includes fits so nobody can book over one.
create or replace function public.get_barber_busy_slots(p_barber_id uuid, p_date date)
returns table (appointment_time time without time zone, duration integer)
language sql
stable
security definer
set search_path = ''
as $$
  select a.appointment_time::time, coalesce(s.duration, 30)::integer
  from public.appointments a
  left join public.services s on s.id = a.service_id
  where a.barber_id = p_barber_id
    and a.appointment_date = p_date
    and a.status in ('pending', 'confirmed');
$$;

revoke all on function public.get_barber_busy_slots(uuid, date) from public;
grant execute on function public.get_barber_busy_slots(uuid, date) to anon, authenticated;
