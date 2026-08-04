drop policy if exists "Admins and gestores can view operational expenses" on public.operational_expenses;
create policy "Admins and gestores can view operational expenses"
on public.operational_expenses for select to authenticated
using (
  (select public.has_role((select auth.uid()), 'admin'))
  or (select public.has_role((select auth.uid()), 'gestor'))
);

drop policy if exists "Admins and gestores can insert operational expenses" on public.operational_expenses;
create policy "Admins and gestores can insert operational expenses"
on public.operational_expenses for insert to authenticated
with check (
  (
    (select public.has_role((select auth.uid()), 'admin'))
    or (select public.has_role((select auth.uid()), 'gestor'))
  )
  and (created_by is null or created_by = (select auth.uid()))
);

drop policy if exists "Admins and gestores can update operational expenses" on public.operational_expenses;
create policy "Admins and gestores can update operational expenses"
on public.operational_expenses for update to authenticated
using (
  (select public.has_role((select auth.uid()), 'admin'))
  or (select public.has_role((select auth.uid()), 'gestor'))
)
with check (
  (select public.has_role((select auth.uid()), 'admin'))
  or (select public.has_role((select auth.uid()), 'gestor'))
);
