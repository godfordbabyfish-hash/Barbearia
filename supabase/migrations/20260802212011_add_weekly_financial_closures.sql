create table if not exists public.weekly_financial_closures (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete restrict,
  week_start date not null,
  week_end date not null,
  competence_year smallint not null,
  competence_month smallint not null,
  week_number smallint not null,
  snapshot jsonb not null,
  closed_by uuid not null references auth.users(id) on delete restrict,
  closed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint weekly_financial_closures_barber_week_key unique (barber_id, week_start),
  constraint weekly_financial_closures_monday_check check (extract(isodow from week_start) = 1),
  constraint weekly_financial_closures_range_check check (week_end = week_start + 6),
  constraint weekly_financial_closures_competence_check check (
    competence_year = extract(year from week_start)
    and competence_month = extract(month from week_start)
    and week_number between 1 and 6
  ),
  constraint weekly_financial_closures_snapshot_check check (jsonb_typeof(snapshot) = 'object')
);

create index if not exists weekly_financial_closures_week_idx
  on public.weekly_financial_closures (week_start desc);

create index if not exists weekly_financial_closures_barber_idx
  on public.weekly_financial_closures (barber_id, week_start desc);

alter table public.weekly_financial_closures enable row level security;

revoke all on table public.weekly_financial_closures from anon;
revoke all on table public.weekly_financial_closures from authenticated;
grant select, insert on table public.weekly_financial_closures to authenticated;
grant all on table public.weekly_financial_closures to service_role;

drop policy if exists weekly_financial_closures_select_staff
  on public.weekly_financial_closures;
create policy weekly_financial_closures_select_staff
on public.weekly_financial_closures
for select
to authenticated
using (
  (select public.has_role((select auth.uid()), 'admin'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gestor'::public.app_role))
  or exists (
    select 1
    from public.barbers b
    where b.id = weekly_financial_closures.barber_id
      and b.user_id = (select auth.uid())
  )
);

drop policy if exists weekly_financial_closures_insert_management
  on public.weekly_financial_closures;
create policy weekly_financial_closures_insert_management
on public.weekly_financial_closures
for insert
to authenticated
with check (
  (select public.has_role((select auth.uid()), 'admin'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gestor'::public.app_role))
);

create or replace function public.prevent_weekly_financial_closure_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Fechamentos semanais são imutáveis';
end;
$$;

revoke all on function public.prevent_weekly_financial_closure_changes() from public;

drop trigger if exists weekly_financial_closures_immutable
  on public.weekly_financial_closures;
create trigger weekly_financial_closures_immutable
before update or delete on public.weekly_financial_closures
for each row execute function public.prevent_weekly_financial_closure_changes();

comment on table public.weekly_financial_closures is
  'Snapshot imutável do fechamento financeiro semanal de cada barbeiro.';
