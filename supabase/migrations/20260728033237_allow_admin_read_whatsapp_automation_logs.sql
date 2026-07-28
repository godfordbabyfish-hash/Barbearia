grant select on public.referral_notification_logs to authenticated;
grant select on public.whatsapp_inactive_client_logs to authenticated;

drop policy if exists "Admin and manager read referral notification logs" on public.referral_notification_logs;
create policy "Admin and manager read referral notification logs"
on public.referral_notification_logs for select to authenticated
using (
  (select public.has_role((select auth.uid()), 'admin'))
  or (select public.has_role((select auth.uid()), 'gestor'))
);

drop policy if exists "Admin and manager read inactive client logs" on public.whatsapp_inactive_client_logs;
create policy "Admin and manager read inactive client logs"
on public.whatsapp_inactive_client_logs for select to authenticated
using (
  (select public.has_role((select auth.uid()), 'admin'))
  or (select public.has_role((select auth.uid()), 'gestor'))
);
