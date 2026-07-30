-- Step 3: remove unrestricted Data API access to appointments.
-- Public booking/queue screens use deliberately narrow RPCs below.

revoke all on table public.appointments from anon;
revoke all on table public.appointments from authenticated;
grant select, insert, update, delete on table public.appointments to authenticated;

drop policy if exists "Anyone can view all appointments" on public.appointments;
drop policy if exists "Anyone can insert appointments" on public.appointments;
drop policy if exists "Anyone can update appointments" on public.appointments;
drop policy if exists "Clients can view their own appointments" on public.appointments;
drop policy if exists "Clients can create appointments" on public.appointments;
drop policy if exists "Clients can update their own appointments" on public.appointments;
drop policy if exists "Barbers can view their appointments" on public.appointments;
drop policy if exists "Barbers can update their appointments" on public.appointments;
drop policy if exists "Admins can view all appointments" on public.appointments;
drop policy if exists "Admins can manage all appointments" on public.appointments;
drop policy if exists "Admin and manager read client appointments" on public.appointments;
drop policy if exists "appointments_delete_gestor" on public.appointments;
drop policy if exists "appointments_insert_actor_not_blocked_admin_gestor_override" on public.appointments;

create policy appointments_select_own_or_staff
on public.appointments
for select
to authenticated
using (
  client_id = (select auth.uid())
  or (select public.has_role((select auth.uid()), 'admin'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gestor'::public.app_role))
  or exists (
    select 1
    from public.barbers b
    where b.id = appointments.barber_id
      and b.user_id = (select auth.uid())
  )
);

create policy appointments_insert_client_or_staff
on public.appointments
for insert
to authenticated
with check (
  (
    client_id = (select auth.uid())
    and booking_type = 'online'
    and status in ('pending', 'confirmed')
    and coalesce(original_price, 0) = 0
    and coalesce(discount_amount, 0) = 0
    and coalesce(final_price, 0) = 0
    and referral_coupon_id is null
    and payment_method is null
    and photo_url is null
    and commission_basis is null
    and coalesce(reminder_sent, false) = false
  )
  or (select public.has_role((select auth.uid()), 'admin'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gestor'::public.app_role))
  or exists (
    select 1
    from public.barbers b
    where b.id = appointments.barber_id
      and b.user_id = (select auth.uid())
  )
);

create policy appointments_update_staff
on public.appointments
for update
to authenticated
using (
  (select public.has_role((select auth.uid()), 'admin'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gestor'::public.app_role))
  or exists (
    select 1 from public.barbers b
    where b.id = appointments.barber_id
      and b.user_id = (select auth.uid())
  )
)
with check (
  (select public.has_role((select auth.uid()), 'admin'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gestor'::public.app_role))
  or exists (
    select 1 from public.barbers b
    where b.id = appointments.barber_id
      and b.user_id = (select auth.uid())
  )
);

create policy appointments_delete_admin_or_manager
on public.appointments
for delete
to authenticated
using (
  (select public.has_role((select auth.uid()), 'admin'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gestor'::public.app_role))
);

create or replace function public.get_barber_busy_slots(
  p_barber_id uuid,
  p_date date
)
returns table (appointment_time time without time zone, duration integer)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.appointment_time::time, coalesce(s.duration, 30)::integer
  from public.appointments a
  left join public.services s on s.id = a.service_id
  where a.barber_id = p_barber_id
    and a.appointment_date = p_date
    and a.status <> 'cancelled';
$$;

create or replace function public.get_service_booking_counts()
returns table (service_id uuid, booking_count bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.service_id, count(*)::bigint
  from public.appointments a
  where a.status <> 'cancelled'
  group by a.service_id;
$$;

create or replace function public.get_public_daily_queue()
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
set search_path = public, pg_temp
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
  where a.appointment_date = (now() at time zone 'America/Sao_Paulo')::date
    and a.status not in ('completed', 'cancelled')
  order by a.appointment_time;
$$;

create or replace function public.cancel_own_appointment(
  p_appointment_id uuid,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  update public.appointments
  set status = 'cancelled',
      notes = '[Cancelado pelo cliente] ' || left(trim(coalesce(p_reason, '')), 500)
  where id = p_appointment_id
    and client_id = auth.uid()
    and status in ('pending', 'confirmed');

  return found;
end;
$$;

revoke all on function public.get_barber_busy_slots(uuid, date) from public;
revoke all on function public.get_service_booking_counts() from public;
revoke all on function public.get_public_daily_queue() from public;
revoke all on function public.cancel_own_appointment(uuid, text) from public;

grant execute on function public.get_barber_busy_slots(uuid, date) to anon, authenticated;
grant execute on function public.get_service_booking_counts() to anon, authenticated;
grant execute on function public.get_public_daily_queue() to anon, authenticated;
grant execute on function public.cancel_own_appointment(uuid, text) to authenticated;
