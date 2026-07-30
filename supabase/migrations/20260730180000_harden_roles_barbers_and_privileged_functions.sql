-- Step 4: prevent role self-escalation and protect privileged maintenance APIs.

-- user_roles: users may read their own role; staff may manage roles.
revoke all on table public.user_roles from anon;
revoke all on table public.user_roles from authenticated;
grant select, insert, update, delete on table public.user_roles to authenticated;

drop policy if exists user_roles_insert_own on public.user_roles;
drop policy if exists user_roles_select_all on public.user_roles;
drop policy if exists user_roles_select_own on public.user_roles;
drop policy if exists user_roles_select_own_or_staff on public.user_roles;
drop policy if exists user_roles_manage_admin_or_manager on public.user_roles;

create policy user_roles_select_own_or_staff
on public.user_roles
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.has_role((select auth.uid()), 'admin'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gestor'::public.app_role))
);

create policy user_roles_manage_admin_or_manager
on public.user_roles
for all
to authenticated
using (
  (select public.has_role((select auth.uid()), 'admin'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gestor'::public.app_role))
)
with check (
  (select public.has_role((select auth.uid()), 'admin'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gestor'::public.app_role))
);

-- barbers: public reads visible records; only owner/staff may mutate.
revoke all on table public.barbers from anon;
revoke all on table public.barbers from authenticated;
grant select on table public.barbers to anon;
grant select, insert, update, delete on table public.barbers to authenticated;

drop policy if exists "Authenticated users can manage barbers" on public.barbers;
drop policy if exists "Barbers can view their own data" on public.barbers;
drop policy if exists "Everyone can view visible barbers" on public.barbers;
drop policy if exists "Barbers can update their own data" on public.barbers;
drop policy if exists barbers_select_visible on public.barbers;
drop policy if exists barbers_select_own_or_staff on public.barbers;
drop policy if exists barbers_update_own_or_staff on public.barbers;
drop policy if exists barbers_insert_staff on public.barbers;
drop policy if exists barbers_delete_staff on public.barbers;

create policy barbers_select_visible
on public.barbers
for select
to anon, authenticated
using (visible = true);

create policy barbers_select_own_or_staff
on public.barbers
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.has_role((select auth.uid()), 'admin'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gestor'::public.app_role))
);

create policy barbers_update_own_or_staff
on public.barbers
for update
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.has_role((select auth.uid()), 'admin'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gestor'::public.app_role))
)
with check (
  user_id = (select auth.uid())
  or (select public.has_role((select auth.uid()), 'admin'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gestor'::public.app_role))
);

create policy barbers_insert_staff
on public.barbers
for insert
to authenticated
with check (
  (select public.has_role((select auth.uid()), 'admin'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gestor'::public.app_role))
);

create policy barbers_delete_staff
on public.barbers
for delete
to authenticated
using (
  (select public.has_role((select auth.uid()), 'admin'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gestor'::public.app_role))
);

create or replace function public.delete_barber_advance_admin(advance_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'gestor'::public.app_role)
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  delete from public.barber_advances where id = advance_id;

  if not found then
    return json_build_object('success', false, 'error', 'Vale não encontrado');
  end if;

  return json_build_object('success', true, 'message', 'Vale removido com sucesso');
end;
$$;

alter function public.limpar_fila_whatsapp_antiga() set search_path = public, pg_temp;
alter function public.limpar_logs_relatorio_whatsapp_antigos() set search_path = public, pg_temp;

revoke all on function public.delete_barber_advance_admin(uuid) from public, anon, authenticated;
grant execute on function public.delete_barber_advance_admin(uuid) to authenticated, service_role;

revoke all on function public.limpar_fila_whatsapp_antiga() from public, anon, authenticated;
revoke all on function public.limpar_logs_relatorio_whatsapp_antigos() from public, anon, authenticated;
grant execute on function public.limpar_fila_whatsapp_antiga() to service_role;
grant execute on function public.limpar_logs_relatorio_whatsapp_antigos() to service_role;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.validate_appointment_barber_schedule() from public, anon, authenticated;

revoke all on function public.set_sync_supabase_usage_schedule(text) from public, anon;
grant execute on function public.set_sync_supabase_usage_schedule(text) to authenticated, service_role;

revoke all on function public.cancel_own_appointment(uuid, text) from anon;
