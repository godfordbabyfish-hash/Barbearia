-- Impedir que usuários bloqueados criem agendamentos
-- Admin/Gestor continuam podendo criar, mesmo se o cliente estiver bloqueado

drop policy if exists "appointments_insert_actor_not_blocked_admin_gestor_override" on public.appointments;
create policy "appointments_insert_actor_not_blocked_admin_gestor_override"
on public.appointments
for insert
with check (
  public.has_role('admin', auth.uid())
  or public.has_role('gestor', auth.uid())
  or not exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.blocked, false) = true
  )
);
