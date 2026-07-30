-- Restrict profile personal data to the owner and authorized staff.
drop policy if exists profiles_select_all on public.profiles;
drop policy if exists profiles_select_own_or_staff on public.profiles;

create policy profiles_select_own_or_staff
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'gestor'::public.app_role)
  or public.has_role(auth.uid(), 'barbeiro'::public.app_role)
);

-- Public referral landing only receives the referrer's display name.
create or replace function public.get_referrer_display_name(p_code text)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.name
  from public.profiles p
  where p.referral_code = lower(trim(p_code))
    and length(trim(p_code)) between 6 and 64
  limit 1;
$$;

revoke all on function public.get_referrer_display_name(text) from public;
grant execute on function public.get_referrer_display_name(text) to anon, authenticated;
