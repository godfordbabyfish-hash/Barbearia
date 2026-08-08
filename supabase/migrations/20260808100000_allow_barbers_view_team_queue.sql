-- Barbeiros precisam enxergar a agenda operacional da equipe na tela de fila.
-- A permissão adicional é somente SELECT; UPDATE/INSERT continuam limitados
-- ao próprio barbeiro pelas políticas específicas já existentes.
drop policy if exists appointments_select_own_or_staff on public.appointments;

create policy appointments_select_own_or_staff
on public.appointments
for select
to authenticated
using (
  client_id = (select auth.uid())
  or (select public.has_role((select auth.uid()), 'admin'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gestor'::public.app_role))
  or (select public.has_role((select auth.uid()), 'barbeiro'::public.app_role))
);

comment on policy appointments_select_own_or_staff on public.appointments is
  'Clientes veem os próprios registros; equipe administrativa e barbeiros veem a agenda da equipe. Escrita permanece protegida por políticas separadas.';
