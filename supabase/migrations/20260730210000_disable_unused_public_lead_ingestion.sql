-- The legacy leads table is not used by the current application. Disable its
-- unauthenticated ingestion surface while preserving management read access.

drop policy if exists "Anyone can create leads" on public.leads;
drop policy if exists "Admins can view leads" on public.leads;

revoke all privileges on table public.leads from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.leads from authenticated;
grant select on table public.leads to authenticated;

create policy "Management can view leads"
on public.leads
for select
to authenticated
using (
  public.has_role((select auth.uid()), 'admin'::public.app_role)
  or public.has_role((select auth.uid()), 'gestor'::public.app_role)
);

comment on table public.leads is
  'Legacy contact table. Public ingestion disabled because the current application does not use this flow.';
