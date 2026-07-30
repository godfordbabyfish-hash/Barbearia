-- Keep the role helper usable by RLS policies without allowing callers to
-- enumerate another user's role through the public RPC endpoint.

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select case
    when _user_id is null then false
    when (select auth.role()) = 'service_role' then exists (
      select 1
      from public.user_roles target_role
      where target_role.user_id = _user_id
        and target_role.role = _role
    )
    when (select auth.uid()) = _user_id then exists (
      select 1
      from public.user_roles own_role
      where own_role.user_id = _user_id
        and own_role.role = _role
    )
    when exists (
      select 1
      from public.user_roles caller_role
      where caller_role.user_id = (select auth.uid())
        and caller_role.role in ('admin', 'gestor')
    ) then exists (
      select 1
      from public.user_roles target_role
      where target_role.user_id = _user_id
        and target_role.role = _role
    )
    else false
  end;
$function$;

revoke all on function public.has_role(uuid, public.app_role) from public;
grant execute on function public.has_role(uuid, public.app_role)
  to anon, authenticated, service_role;

comment on function public.has_role(uuid, public.app_role) is
  'RLS role helper. Callers may inspect only themselves; management and service_role may inspect other users.';
