grant select, insert, update on table public.management_alert_states to authenticated;

create policy management_alert_states_management_insert
on public.management_alert_states for insert to authenticated
with check (
  (select public.has_role((select auth.uid()), 'admin'))
  or (select public.has_role((select auth.uid()), 'gestor'))
);

create policy management_alert_states_management_update
on public.management_alert_states for update to authenticated
using (
  (select public.has_role((select auth.uid()), 'admin'))
  or (select public.has_role((select auth.uid()), 'gestor'))
)
with check (
  (select public.has_role((select auth.uid()), 'admin'))
  or (select public.has_role((select auth.uid()), 'gestor'))
);

alter function public.get_management_alerts(boolean) security invoker;
alter function public.set_management_alert_state(text, text, text, timestamptz, text) security invoker;
