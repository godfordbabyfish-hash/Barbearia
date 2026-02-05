-- Add client_id to product_sales
alter table public.product_sales
  add column if not exists client_id uuid;

-- Optional FK to profiles
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_sales_client_id_fkey'
  ) then
    alter table public.product_sales
      add constraint product_sales_client_id_fkey
      foreign key (client_id) references public.profiles(id) on delete set null;
  end if;
end $$;

update public.product_sales ps
set client_id = a.client_id
from (
  select barber_id, appointment_date, client_id
  from public.appointments
  where status in ('confirmed','completed')
) a
where ps.client_id is null
  and ps.barber_id = a.barber_id
  and ps.sale_date = a.appointment_date
  and (
    select count(distinct a2.client_id)
    from public.appointments a2
    where a2.barber_id = ps.barber_id
      and a2.appointment_date = ps.sale_date
      and a2.status in ('confirmed','completed')
  ) = 1;
create index if not exists idx_product_sales_client_id
  on public.product_sales (client_id);

-- RLS: allow authenticated users to read their own sales if client_id matches
alter table public.product_sales enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'product_sales'
      and policyname = 'product_sales_select_by_client'
  ) then
    create policy "product_sales_select_by_client"
      on public.product_sales
      for select
      to authenticated
      using (client_id = auth.uid());
  end if;
end $$;

-- Optional insert policy; keep business rules simple (client inserts their own sales only)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'product_sales'
      and policyname = 'product_sales_insert_by_client'
  ) then
    create policy "product_sales_insert_by_client"
      on public.product_sales
      for insert
      to authenticated
      with check (client_id = auth.uid());
  end if;
end $$;
