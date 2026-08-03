-- Daily cash register and reconciliation for administrators/managers.

create table public.daily_cash_sessions (
  id uuid primary key default gen_random_uuid(),
  business_date date not null unique,
  status text not null default 'open' check (status in ('open', 'closed')),
  opening_balance numeric(12,2) not null default 0 check (opening_balance >= 0),
  expected_cash numeric(12,2),
  counted_cash numeric(12,2),
  cash_difference numeric(12,2),
  total_sales numeric(12,2),
  cash_sales numeric(12,2),
  pix_sales numeric(12,2),
  card_sales numeric(12,2),
  other_sales numeric(12,2),
  opening_notes text,
  closing_notes text,
  opened_by uuid not null references auth.users(id),
  closed_by uuid references auth.users(id),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  open_idempotency_key uuid not null unique,
  close_idempotency_key uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'open' and closed_at is null and closed_by is null)
    or
    (status = 'closed' and closed_at is not null and closed_by is not null and counted_cash is not null)
  )
);

create table public.daily_cash_movements (
  id uuid primary key default gen_random_uuid(),
  cash_session_id uuid not null references public.daily_cash_sessions(id) on delete restrict,
  movement_type text not null check (movement_type in ('reinforcement', 'withdrawal')),
  amount numeric(12,2) not null check (amount > 0),
  reason text not null check (length(trim(reason)) >= 3),
  created_by uuid not null references auth.users(id),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now()
);

create index daily_cash_sessions_status_date_idx
  on public.daily_cash_sessions (status, business_date desc);
create index daily_cash_movements_session_created_idx
  on public.daily_cash_movements (cash_session_id, created_at desc);

alter table public.daily_cash_sessions enable row level security;
alter table public.daily_cash_movements enable row level security;

revoke all on table public.daily_cash_sessions from anon, authenticated;
revoke all on table public.daily_cash_movements from anon, authenticated;
grant select on table public.daily_cash_sessions to authenticated;
grant select on table public.daily_cash_movements to authenticated;

create policy "Managers can view daily cash sessions"
on public.daily_cash_sessions for select
to authenticated
using (
  exists (
    select 1 from public.user_roles role_row
    where role_row.user_id = (select auth.uid())
      and role_row.role in ('admin', 'gestor')
  )
);

create policy "Managers can view daily cash movements"
on public.daily_cash_movements for select
to authenticated
using (
  exists (
    select 1 from public.user_roles role_row
    where role_row.user_id = (select auth.uid())
      and role_row.role in ('admin', 'gestor')
  )
);

create or replace function public.calculate_daily_cash_totals(p_business_date date)
returns jsonb
language sql
stable
set search_path = pg_catalog, public
as $$
  with service_payments as (
    select lower(trim(payment.payment_method)) as method, payment.amount::numeric as amount
    from public.appointment_payments payment
    join public.appointments appointment on appointment.id = payment.appointment_id
    where appointment.appointment_date = p_business_date
      and appointment.status = 'completed'
  ),
  legacy_service_payments as (
    select
      lower(trim(coalesce(appointment.payment_method, 'outros'))) as method,
      coalesce(appointment.final_price, appointment.original_price, service.price, 0)::numeric as amount
    from public.appointments appointment
    left join public.services service on service.id = appointment.service_id
    where appointment.appointment_date = p_business_date
      and appointment.status = 'completed'
      and not exists (
        select 1 from public.appointment_payments payment
        where payment.appointment_id = appointment.id
      )
  ),
  product_payments as (
    select lower(trim(coalesce(sale.payment_method, 'outros'))) as method, sale.total_price::numeric as amount
    from public.product_sales sale
    where sale.sale_date = p_business_date
      and sale.status = 'confirmed'
  ),
  all_payments as (
    select * from service_payments
    union all select * from legacy_service_payments
    union all select * from product_payments
  )
  select jsonb_build_object(
    'total_sales', coalesce(sum(amount), 0),
    'cash_sales', coalesce(sum(amount) filter (where method in ('dinheiro', 'cash')), 0),
    'pix_sales', coalesce(sum(amount) filter (where method = 'pix'), 0),
    'card_sales', coalesce(sum(amount) filter (where method ~ 'cart|credito|crédito|debito|débito'), 0),
    'other_sales', coalesce(sum(amount) filter (
      where method not in ('dinheiro', 'cash', 'pix')
        and method !~ 'cart|credito|crédito|debito|débito'
    ), 0)
  )
  from all_payments;
$$;

create or replace function public.open_daily_cash(
  p_business_date date,
  p_opening_balance numeric,
  p_opening_notes text,
  p_idempotency_key uuid
)
returns public.daily_cash_sessions
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.daily_cash_sessions;
begin
  if v_user_id is null or not exists (
    select 1 from public.user_roles role_row
    where role_row.user_id = v_user_id and role_row.role in ('admin', 'gestor')
  ) then
    raise exception 'Apenas administradores e gestores podem abrir o caixa.';
  end if;
  if p_business_date is null or p_opening_balance is null or p_opening_balance < 0 then
    raise exception 'Data e saldo inicial válido são obrigatórios.';
  end if;

  select * into v_session
  from public.daily_cash_sessions
  where open_idempotency_key = p_idempotency_key;
  if found then return v_session; end if;

  insert into public.daily_cash_sessions (
    business_date, opening_balance, opening_notes, opened_by, open_idempotency_key
  ) values (
    p_business_date, round(p_opening_balance, 2), nullif(trim(p_opening_notes), ''), v_user_id, p_idempotency_key
  )
  returning * into v_session;
  return v_session;
exception
  when unique_violation then
    select * into v_session from public.daily_cash_sessions where business_date = p_business_date;
    return v_session;
end;
$$;

create or replace function public.record_daily_cash_movement(
  p_cash_session_id uuid,
  p_movement_type text,
  p_amount numeric,
  p_reason text,
  p_idempotency_key uuid
)
returns public.daily_cash_movements
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_movement public.daily_cash_movements;
begin
  if v_user_id is null or not exists (
    select 1 from public.user_roles role_row
    where role_row.user_id = v_user_id and role_row.role in ('admin', 'gestor')
  ) then
    raise exception 'Apenas administradores e gestores podem movimentar o caixa.';
  end if;
  if p_movement_type not in ('reinforcement', 'withdrawal') or p_amount is null or p_amount <= 0 then
    raise exception 'Tipo e valor da movimentação são inválidos.';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Informe o motivo da movimentação.';
  end if;

  select * into v_movement from public.daily_cash_movements where idempotency_key = p_idempotency_key;
  if found then return v_movement; end if;

  perform 1 from public.daily_cash_sessions
  where id = p_cash_session_id and status = 'open'
  for update;
  if not found then raise exception 'O caixa não está aberto.'; end if;

  insert into public.daily_cash_movements (
    cash_session_id, movement_type, amount, reason, created_by, idempotency_key
  ) values (
    p_cash_session_id, p_movement_type, round(p_amount, 2), trim(p_reason), v_user_id, p_idempotency_key
  ) returning * into v_movement;
  return v_movement;
end;
$$;

create or replace function public.close_daily_cash(
  p_cash_session_id uuid,
  p_counted_cash numeric,
  p_closing_notes text,
  p_idempotency_key uuid
)
returns public.daily_cash_sessions
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.daily_cash_sessions;
  v_totals jsonb;
  v_reinforcements numeric := 0;
  v_withdrawals numeric := 0;
  v_expected numeric := 0;
begin
  if v_user_id is null or not exists (
    select 1 from public.user_roles role_row
    where role_row.user_id = v_user_id and role_row.role in ('admin', 'gestor')
  ) then
    raise exception 'Apenas administradores e gestores podem fechar o caixa.';
  end if;
  if p_counted_cash is null or p_counted_cash < 0 then
    raise exception 'Informe o valor contado no caixa.';
  end if;

  select * into v_session from public.daily_cash_sessions
  where id = p_cash_session_id for update;
  if not found then raise exception 'Caixa não encontrado.'; end if;
  if v_session.status = 'closed' then
    if v_session.close_idempotency_key = p_idempotency_key then return v_session; end if;
    raise exception 'Este caixa já foi fechado.';
  end if;

  v_totals := public.calculate_daily_cash_totals(v_session.business_date);
  select
    coalesce(sum(amount) filter (where movement_type = 'reinforcement'), 0),
    coalesce(sum(amount) filter (where movement_type = 'withdrawal'), 0)
  into v_reinforcements, v_withdrawals
  from public.daily_cash_movements where cash_session_id = v_session.id;

  v_expected := round(v_session.opening_balance + (v_totals->>'cash_sales')::numeric + v_reinforcements - v_withdrawals, 2);

  update public.daily_cash_sessions set
    status = 'closed',
    expected_cash = v_expected,
    counted_cash = round(p_counted_cash, 2),
    cash_difference = round(p_counted_cash - v_expected, 2),
    total_sales = (v_totals->>'total_sales')::numeric,
    cash_sales = (v_totals->>'cash_sales')::numeric,
    pix_sales = (v_totals->>'pix_sales')::numeric,
    card_sales = (v_totals->>'card_sales')::numeric,
    other_sales = (v_totals->>'other_sales')::numeric,
    closing_notes = nullif(trim(p_closing_notes), ''),
    closed_by = v_user_id,
    closed_at = now(),
    close_idempotency_key = p_idempotency_key,
    updated_at = now()
  where id = v_session.id
  returning * into v_session;
  return v_session;
end;
$$;

create or replace function public.get_daily_cash_summary(p_business_date date)
returns jsonb
language plpgsql
security definer
stable
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.daily_cash_sessions;
  v_totals jsonb;
  v_movements jsonb;
  v_reinforcements numeric := 0;
  v_withdrawals numeric := 0;
begin
  if v_user_id is null or not exists (
    select 1 from public.user_roles role_row
    where role_row.user_id = v_user_id and role_row.role in ('admin', 'gestor')
  ) then
    raise exception 'Acesso restrito à gestão.';
  end if;

  select * into v_session from public.daily_cash_sessions where business_date = p_business_date;
  v_totals := public.calculate_daily_cash_totals(p_business_date);
  if v_session.id is not null then
    select
      coalesce(jsonb_agg(to_jsonb(movement) order by movement.created_at desc), '[]'::jsonb),
      coalesce(sum(amount) filter (where movement_type = 'reinforcement'), 0),
      coalesce(sum(amount) filter (where movement_type = 'withdrawal'), 0)
    into v_movements, v_reinforcements, v_withdrawals
    from public.daily_cash_movements movement where movement.cash_session_id = v_session.id;
  else
    v_movements := '[]'::jsonb;
  end if;

  return jsonb_build_object(
    'session', case when v_session.id is null then null else to_jsonb(v_session) end,
    'movements', v_movements,
    'live_totals', v_totals,
    'reinforcements', v_reinforcements,
    'withdrawals', v_withdrawals,
    'live_expected_cash', coalesce(v_session.opening_balance, 0) + (v_totals->>'cash_sales')::numeric + v_reinforcements - v_withdrawals
  );
end;
$$;

revoke all on function public.calculate_daily_cash_totals(date) from public, anon, authenticated;
revoke all on function public.open_daily_cash(date, numeric, text, uuid) from public, anon;
revoke all on function public.record_daily_cash_movement(uuid, text, numeric, text, uuid) from public, anon;
revoke all on function public.close_daily_cash(uuid, numeric, text, uuid) from public, anon;
revoke all on function public.get_daily_cash_summary(date) from public, anon;

grant execute on function public.open_daily_cash(date, numeric, text, uuid) to authenticated, service_role;
grant execute on function public.record_daily_cash_movement(uuid, text, numeric, text, uuid) to authenticated, service_role;
grant execute on function public.close_daily_cash(uuid, numeric, text, uuid) to authenticated, service_role;
grant execute on function public.get_daily_cash_summary(date) to authenticated, service_role;

comment on table public.daily_cash_sessions is 'Abertura, conferência e fechamento auditável do caixa diário da barbearia.';
comment on table public.daily_cash_movements is 'Reforços e sangrias realizados durante uma sessão de caixa aberta.';
