-- Helper function: check if a user (uuid) has a given role (text)
create or replace function public.has_role(_role text, _user_id uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from public.user_roles ur
    where ur.user_id = _user_id
      and ur.role::text = _role
  );
$$;

-- Grant usage to authenticated users
grant execute on function public.has_role(text, uuid) to authenticated;

-- Policies for appointments
alter table public.appointments enable row level security;
create policy "appointments_delete_gestor" on public.appointments
for delete
using ( public.has_role('gestor', auth.uid()) );

alter table public.product_sales enable row level security;
create policy "product_sales_delete_gestor" on public.product_sales
for delete
using ( public.has_role('gestor', auth.uid()) );
