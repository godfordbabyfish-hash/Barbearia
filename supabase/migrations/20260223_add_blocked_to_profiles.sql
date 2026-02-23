alter table public.profiles
  add column if not exists blocked boolean default false;

alter table public.profiles enable row level security;

drop policy if exists "profiles_update_blocked_admin_gestor" on public.profiles;
create policy "profiles_update_blocked_admin_gestor"
on public.profiles
for update
using (
  public.has_role('admin', auth.uid())
  or public.has_role('gestor', auth.uid())
)
with check (
  public.has_role('admin', auth.uid())
  or public.has_role('gestor', auth.uid())
);
