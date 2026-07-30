-- Read-only access required by the client portfolio shown in the admin/manager users page.
-- No insert, update, delete or queue processing permission is granted here.

grant select on public.appointments to authenticated;
grant select on public.whatsapp_notifications_queue to authenticated;

drop policy if exists "Admin and manager read client appointments" on public.appointments;
create policy "Admin and manager read client appointments"
on public.appointments
for select
to authenticated
using (
  (select public.has_role((select auth.uid()), 'admin'))
  or (select public.has_role((select auth.uid()), 'gestor'))
);

drop policy if exists "Admin and manager read WhatsApp failures" on public.whatsapp_notifications_queue;
create policy "Admin and manager read WhatsApp failures"
on public.whatsapp_notifications_queue
for select
to authenticated
using (
  (select public.has_role((select auth.uid()), 'admin'))
  or (select public.has_role((select auth.uid()), 'gestor'))
);

create index if not exists whatsapp_queue_failed_client_phone_idx
on public.whatsapp_notifications_queue (client_phone, created_at desc)
where status = 'failed';
