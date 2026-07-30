alter table public.profiles
  add column if not exists contact_email text;

comment on column public.profiles.contact_email is
  'E-mail de contato do cliente. Para clientes com login por CPF, não substitui o e-mail técnico do Supabase Auth.';

drop policy if exists "staff_insert_any_avatar" on storage.objects;
create policy "staff_insert_any_avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    or public.has_role((select auth.uid()), 'gestor'::public.app_role)
  )
);
drop policy if exists "staff_update_any_avatar" on storage.objects;
create policy "staff_update_any_avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    or public.has_role((select auth.uid()), 'gestor'::public.app_role)
  )
)
with check (
  bucket_id = 'avatars'
  and (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    or public.has_role((select auth.uid()), 'gestor'::public.app_role)
  )
);
