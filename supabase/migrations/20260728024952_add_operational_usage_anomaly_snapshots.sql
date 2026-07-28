create table if not exists public.operational_usage_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null unique,
  appointments_created integer not null default 0 check (appointments_created >= 0),
  new_clients integer not null default 0 check (new_clients >= 0),
  whatsapp_pending integer not null default 0 check (whatsapp_pending >= 0),
  whatsapp_failed integer not null default 0 check (whatsapp_failed >= 0),
  completed_services integer not null default 0 check (completed_services >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists operational_usage_snapshots_date_idx
  on public.operational_usage_snapshots (snapshot_date desc);

alter table public.operational_usage_snapshots enable row level security;

drop policy if exists "Admin and gestor can read operational usage snapshots"
  on public.operational_usage_snapshots;
create policy "Admin and gestor can read operational usage snapshots"
  on public.operational_usage_snapshots
  for select
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'gestor'::public.app_role)
  );

revoke all on table public.operational_usage_snapshots from anon, authenticated;
grant select on table public.operational_usage_snapshots to authenticated;

comment on table public.operational_usage_snapshots is
  'Snapshots diários usados para comparar consumo operacional e detectar desvios acima da média.';
