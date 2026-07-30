drop policy if exists appointments_insert_client_or_staff on public.appointments;

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
    and not exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and coalesce(p.blocked, false) = true
    )
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
