create or replace function public.get_public_upcoming_queue()
returns table (
  appointment_id uuid,
  barber_id uuid,
  appointment_date date,
  appointment_time time without time zone,
  status text,
  booking_type text,
  client_display_name text,
  service_title text,
  duration integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id,
    a.barber_id,
    a.appointment_date,
    a.appointment_time::time,
    a.status,
    a.booking_type,
    split_part(trim(coalesce(nullif(a.client_name, ''), nullif(p.name, ''), 'Cliente')), ' ', 1),
    s.title,
    coalesce(s.duration, 30)::integer
  from public.appointments a
  left join public.profiles p on p.id = a.client_id
  left join public.services s on s.id = a.service_id
  where a.appointment_date > (now() at time zone 'America/Sao_Paulo')::date
    and a.status in ('pending', 'confirmed')
  order by a.appointment_date, a.appointment_time;
$$;

revoke all on function public.get_public_upcoming_queue() from public;
revoke all on function public.get_public_upcoming_queue() from anon, authenticated;
grant execute on function public.get_public_upcoming_queue() to authenticated;

comment on function public.get_public_upcoming_queue() is
  'Fila futura informativa. Expõe somente primeiro nome, serviço, data e horário; não retorna dados pessoais de contato.';
