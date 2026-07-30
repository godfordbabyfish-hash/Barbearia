-- Prevent public bucket enumeration and restrict Storage mutations to the
-- authenticated users that perform them in the application.

-- Public buckets are already readable through known public object URLs.
-- Broad SELECT policies only expose the object index through the Storage API.
drop policy if exists "Todos podem ver avatares" on storage.objects;
drop policy if exists "Todos podem ver imagens do site" on storage.objects;
drop policy if exists "read appointment photos" on storage.objects;

-- Remove legacy mutation policies whose public/anon roles allowed untrusted
-- callers to modify application assets.
drop policy if exists "Admin pode fazer upload de imagens" on storage.objects;
drop policy if exists "Admin pode atualizar imagens" on storage.objects;
drop policy if exists "Admin pode deletar imagens" on storage.objects;
drop policy if exists "Allow barbeiros to upload photos 1aia92n_0" on storage.objects;
drop policy if exists "upload appointment photos" on storage.objects;
drop policy if exists "update appointment photos" on storage.objects;

-- Avatar upserts need SELECT in addition to INSERT/UPDATE. Owners only see
-- their folder in the object index; admin/gestor may manage any avatar.
create policy "avatar_owner_or_staff_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.has_role((select auth.uid()), 'admin'::public.app_role)
    or public.has_role((select auth.uid()), 'gestor'::public.app_role)
  )
);

-- Site assets are managed by admin/gestor. Barbers also upload product-sale
-- photos through this bucket, so their authenticated role is allowed to
-- insert and to satisfy the SELECT/UPDATE requirements of upsert.
create policy "site_images_staff_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'site-images'
  and (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    or public.has_role((select auth.uid()), 'gestor'::public.app_role)
    or (
      public.has_role((select auth.uid()), 'barbeiro'::public.app_role)
      and (storage.foldername(name))[1] = 'product-sales'
    )
  )
);

create policy "site_images_staff_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'site-images'
  and (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    or public.has_role((select auth.uid()), 'gestor'::public.app_role)
    or (
      public.has_role((select auth.uid()), 'barbeiro'::public.app_role)
      and (storage.foldername(name))[1] = 'product-sales'
    )
  )
);

create policy "site_images_staff_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'site-images'
  and (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    or public.has_role((select auth.uid()), 'gestor'::public.app_role)
    or (
      public.has_role((select auth.uid()), 'barbeiro'::public.app_role)
      and (storage.foldername(name))[1] = 'product-sales'
    )
  )
)
with check (
  bucket_id = 'site-images'
  and (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    or public.has_role((select auth.uid()), 'gestor'::public.app_role)
    or (
      public.has_role((select auth.uid()), 'barbeiro'::public.app_role)
      and (storage.foldername(name))[1] = 'product-sales'
    )
  )
);

create policy "site_images_management_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'site-images'
  and (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    or public.has_role((select auth.uid()), 'gestor'::public.app_role)
  )
);

-- Appointment photos are operational evidence and may only be managed by
-- authenticated barbers or management. Public URLs remain unchanged.
create policy "appointment_photos_staff_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'appointment-photos'
  and (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    or public.has_role((select auth.uid()), 'gestor'::public.app_role)
    or public.has_role((select auth.uid()), 'barbeiro'::public.app_role)
  )
);

create policy "appointment_photos_staff_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'appointment-photos'
  and (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    or public.has_role((select auth.uid()), 'gestor'::public.app_role)
    or public.has_role((select auth.uid()), 'barbeiro'::public.app_role)
  )
);

create policy "appointment_photos_staff_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'appointment-photos'
  and (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    or public.has_role((select auth.uid()), 'gestor'::public.app_role)
    or public.has_role((select auth.uid()), 'barbeiro'::public.app_role)
  )
)
with check (
  bucket_id = 'appointment-photos'
  and (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    or public.has_role((select auth.uid()), 'gestor'::public.app_role)
    or public.has_role((select auth.uid()), 'barbeiro'::public.app_role)
  )
);
