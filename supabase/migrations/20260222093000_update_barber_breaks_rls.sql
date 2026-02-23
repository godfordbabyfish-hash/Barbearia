alter table public.barber_breaks enable row level security;

drop policy if exists "barber_breaks_select_authenticated" on public.barber_breaks;
drop policy if exists "Barbers can view their own breaks" on public.barber_breaks;
drop policy if exists "Barbers can insert their own breaks" on public.barber_breaks;
drop policy if exists "Barbers can update their own breaks" on public.barber_breaks;
drop policy if exists "Barbers can delete their own breaks" on public.barber_breaks;
drop policy if exists "Admins can manage all breaks" on public.barber_breaks;
drop policy if exists "barber_breaks_insert_owner" on public.barber_breaks;
drop policy if exists "barber_breaks_update_owner" on public.barber_breaks;
drop policy if exists "barber_breaks_delete_owner" on public.barber_breaks;

create policy "barber_breaks_select_authenticated"
  on public.barber_breaks
  for select
  to authenticated
  using (true);

create policy "barber_breaks_insert_manage"
  on public.barber_breaks
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.barbers b
      where b.id = barber_breaks.barber_id
        and b.user_id = auth.uid()
    )
    or public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'gestor')
  );

create policy "barber_breaks_update_manage"
  on public.barber_breaks
  for update
  to authenticated
  using (
    exists (
      select 1 from public.barbers b
      where b.id = barber_breaks.barber_id
        and b.user_id = auth.uid()
    )
    or public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'gestor')
  )
  with check (
    exists (
      select 1 from public.barbers b
      where b.id = barber_breaks.barber_id
        and b.user_id = auth.uid()
    )
    or public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'gestor')
  );

create policy "barber_breaks_delete_manage"
  on public.barber_breaks
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.barbers b
      where b.id = barber_breaks.barber_id
        and b.user_id = auth.uid()
    )
    or public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'gestor')
  );
