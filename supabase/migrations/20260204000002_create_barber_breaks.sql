-- Dependencies
create extension if not exists pgcrypto;

-- Table: barber_breaks
create table if not exists public.barber_breaks (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  notes text,
  created_at timestamptz not null default now(),
  constraint barber_breaks_time_window check (start_time < end_time)
);

create index if not exists idx_barber_breaks_barber_date
  on public.barber_breaks (barber_id, date);

-- RLS
alter table public.barber_breaks enable row level security;

-- Read policy: any authenticated user can read breaks (needed for agenda e Fila)
create policy "barber_breaks_select_authenticated"
  on public.barber_breaks
  for select
  to authenticated
  using (true);

-- Write policies: only the barber owner (via barbers.user_id) or admin/gestor can manage
create policy "barber_breaks_insert_owner"
  on public.barber_breaks
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.barbers b
      where b.id = barber_breaks.barber_id
        and b.user_id = auth.uid()
    )
    or (current_setting('request.jwt.claims', true)::jsonb->>'role') in ('admin','gestor')
  );

create policy "barber_breaks_update_owner"
  on public.barber_breaks
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.barbers b
      where b.id = barber_breaks.barber_id
        and b.user_id = auth.uid()
    )
    or (current_setting('request.jwt.claims', true)::jsonb->>'role') in ('admin','gestor')
  )
  with check (
    exists (
      select 1
      from public.barbers b
      where b.id = barber_breaks.barber_id
        and b.user_id = auth.uid()
    )
    or (current_setting('request.jwt.claims', true)::jsonb->>'role') in ('admin','gestor')
  );

create policy "barber_breaks_delete_owner"
  on public.barber_breaks
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.barbers b
      where b.id = barber_breaks.barber_id
        and b.user_id = auth.uid()
    )
    or (current_setting('request.jwt.claims', true)::jsonb->>'role') in ('admin','gestor')
  );
