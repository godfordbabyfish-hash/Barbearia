-- Accounts payable and recurring operational expenses.
-- Existing `confirmed` expenses remain paid expenses for backward compatibility.

alter table public.operational_expenses
  add column if not exists due_date date,
  add column if not exists paid_at timestamptz,
  add column if not exists paid_by uuid references auth.users(id) on delete set null,
  add column if not exists supplier text,
  add column if not exists payment_method text,
  add column if not exists document_reference text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users(id) on delete set null,
  add column if not exists cancellation_reason text;

update public.operational_expenses
set due_date = coalesce(due_date, expense_date),
    paid_at = coalesce(paid_at, created_at)
where status = 'confirmed';

alter table public.operational_expenses
  alter column due_date set default current_date;

create table public.expense_recurrence_rules (
  id uuid primary key default gen_random_uuid(),
  description text not null check (length(trim(description)) > 0),
  amount numeric(12,2) not null check (amount > 0),
  category text not null default 'Outros',
  supplier text,
  notes text,
  frequency text not null check (frequency in ('weekly', 'monthly', 'yearly')),
  interval_count integer not null default 1 check (interval_count between 1 and 24),
  next_due_date date not null,
  end_date date,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expense_recurrence_end_after_next check (end_date is null or not active or end_date >= next_due_date)
);

alter table public.operational_expenses
  add column if not exists recurring_rule_id uuid references public.expense_recurrence_rules(id) on delete set null,
  add column if not exists recurrence_occurrence date;

create unique index operational_expenses_rule_occurrence_uidx
  on public.operational_expenses (recurring_rule_id, recurrence_occurrence)
  where recurring_rule_id is not null and recurrence_occurrence is not null;
create index operational_expenses_payables_idx
  on public.operational_expenses (status, due_date)
  where status = 'pending';
create index operational_expenses_paid_at_idx
  on public.operational_expenses (paid_at desc)
  where status = 'confirmed';
create index operational_expenses_paid_by_idx on public.operational_expenses (paid_by);
create index operational_expenses_cancelled_by_idx on public.operational_expenses (cancelled_by);
create index expense_recurrence_rules_generation_idx
  on public.expense_recurrence_rules (next_due_date)
  where active = true;
create index expense_recurrence_rules_created_by_idx
  on public.expense_recurrence_rules (created_by);
create index operational_expenses_created_by_idx
  on public.operational_expenses (created_by);

create table public.operational_expense_audit (
  id bigint generated always as identity primary key,
  expense_id uuid references public.operational_expenses(id) on delete set null,
  event_type text not null check (event_type in ('created', 'updated', 'paid', 'cancelled')),
  actor_id uuid references auth.users(id) on delete set null,
  event_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb
);

create index operational_expense_audit_expense_idx
  on public.operational_expense_audit (expense_id, event_at desc);
create index operational_expense_audit_actor_idx
  on public.operational_expense_audit (actor_id);

alter table public.expense_recurrence_rules enable row level security;
alter table public.operational_expense_audit enable row level security;

revoke all on public.expense_recurrence_rules from anon, authenticated;
revoke all on public.operational_expense_audit from anon, authenticated;
grant select, insert, update on public.expense_recurrence_rules to authenticated;
grant select on public.operational_expense_audit to authenticated;
grant all on public.expense_recurrence_rules, public.operational_expense_audit to service_role;

create policy expense_recurrence_management_select
on public.expense_recurrence_rules for select to authenticated
using ((select public.has_role((select auth.uid()), 'admin')) or (select public.has_role((select auth.uid()), 'gestor')));

create policy expense_recurrence_management_insert
on public.expense_recurrence_rules for insert to authenticated
with check (
  ((select public.has_role((select auth.uid()), 'admin')) or (select public.has_role((select auth.uid()), 'gestor')))
  and (created_by is null or created_by = (select auth.uid()))
);

create policy expense_recurrence_management_update
on public.expense_recurrence_rules for update to authenticated
using ((select public.has_role((select auth.uid()), 'admin')) or (select public.has_role((select auth.uid()), 'gestor')))
with check ((select public.has_role((select auth.uid()), 'admin')) or (select public.has_role((select auth.uid()), 'gestor')));

create policy operational_expense_audit_management_select
on public.operational_expense_audit for select to authenticated
using ((select public.has_role((select auth.uid()), 'admin')) or (select public.has_role((select auth.uid()), 'gestor')));

drop policy if exists "Admins and gestores can delete operational expenses" on public.operational_expenses;

create or replace function public.next_expense_due_date(p_due_date date, p_frequency text, p_interval integer)
returns date
language sql
immutable
set search_path = ''
as $$
  select case p_frequency
    when 'weekly' then p_due_date + (7 * p_interval)
    when 'monthly' then (p_due_date + make_interval(months => p_interval))::date
    when 'yearly' then (p_due_date + make_interval(years => p_interval))::date
    else null
  end;
$$;

create or replace function public.generate_due_recurring_expenses_internal(p_until date default (current_date + 45))
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rule public.expense_recurrence_rules;
  v_due date;
  v_created integer := 0;
begin
  for v_rule in
    select * from public.expense_recurrence_rules
    where active = true and next_due_date <= p_until
    order by next_due_date
    for update skip locked
  loop
    v_due := v_rule.next_due_date;
    while v_due <= p_until and (v_rule.end_date is null or v_due <= v_rule.end_date) loop
      insert into public.operational_expenses (
        description, amount, category, expense_date, due_date, notes, status,
        supplier, created_by, recurring_rule_id, recurrence_occurrence
      ) values (
        v_rule.description, v_rule.amount, v_rule.category, v_due, v_due, v_rule.notes,
        'pending', v_rule.supplier, v_rule.created_by, v_rule.id, v_due
      ) on conflict (recurring_rule_id, recurrence_occurrence)
        where recurring_rule_id is not null and recurrence_occurrence is not null
        do nothing;
      if found then v_created := v_created + 1; end if;
      v_due := public.next_expense_due_date(v_due, v_rule.frequency, v_rule.interval_count);
    end loop;

    update public.expense_recurrence_rules
    set next_due_date = v_due,
        active = case when end_date is not null and v_due > end_date then false else active end,
        updated_at = now()
    where id = v_rule.id;
  end loop;
  return v_created;
end;
$$;

create or replace function public.generate_due_recurring_expenses(p_until date default (current_date + 45))
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'gestor')
  ) then raise exception 'Acesso negado'; end if;
  return public.generate_due_recurring_expenses_internal(p_until);
end;
$$;

create or replace function public.pay_operational_expense(
  p_expense_id uuid,
  p_payment_method text default null,
  p_document_reference text default null,
  p_paid_at timestamptz default now()
)
returns public.operational_expenses
language plpgsql
security definer
set search_path = ''
as $$
declare v_expense public.operational_expenses;
begin
  if not (public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'gestor')) then
    raise exception 'Acesso negado';
  end if;
  update public.operational_expenses set
    status = 'confirmed', paid_at = p_paid_at, paid_by = (select auth.uid()),
    payment_method = nullif(trim(p_payment_method), ''),
    document_reference = nullif(trim(p_document_reference), ''), updated_at = now()
  where id = p_expense_id and status = 'pending'
  returning * into v_expense;
  if v_expense.id is null then raise exception 'Conta inexistente ou já processada'; end if;
  return v_expense;
end;
$$;

create or replace function public.cancel_operational_expense(p_expense_id uuid, p_reason text)
returns public.operational_expenses
language plpgsql
security definer
set search_path = ''
as $$
declare v_expense public.operational_expenses;
begin
  if not (public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'gestor')) then
    raise exception 'Acesso negado';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Informe o motivo do cancelamento'; end if;
  update public.operational_expenses set
    status = 'cancelled', cancelled_at = now(), cancelled_by = (select auth.uid()),
    cancellation_reason = trim(p_reason), updated_at = now()
  where id = p_expense_id and status = 'pending'
  returning * into v_expense;
  if v_expense.id is null then raise exception 'Conta inexistente ou já processada'; end if;
  return v_expense;
end;
$$;

create or replace function public.audit_operational_expense_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_event text;
begin
  if tg_op = 'INSERT' then v_event := 'created';
  elsif old.status = 'pending' and new.status = 'confirmed' then v_event := 'paid';
  elsif old.status = 'pending' and new.status = 'cancelled' then v_event := 'cancelled';
  else v_event := 'updated'; end if;
  insert into public.operational_expense_audit(expense_id, event_type, actor_id, old_data, new_data)
  values (new.id, v_event, (select auth.uid()), case when tg_op = 'UPDATE' then to_jsonb(old) end, to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists operational_expense_audit_trigger on public.operational_expenses;
create trigger operational_expense_audit_trigger
after insert or update on public.operational_expenses
for each row execute function public.audit_operational_expense_change();

create or replace function public.set_expense_recurrence_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger expense_recurrence_updated_at
before update on public.expense_recurrence_rules
for each row execute function public.set_expense_recurrence_updated_at();

revoke all on function public.next_expense_due_date(date, text, integer) from public, anon, authenticated;
revoke all on function public.generate_due_recurring_expenses_internal(date) from public, anon, authenticated;
revoke all on function public.generate_due_recurring_expenses(date) from public, anon;
revoke all on function public.pay_operational_expense(uuid, text, text, timestamptz) from public, anon;
revoke all on function public.cancel_operational_expense(uuid, text) from public, anon;
revoke all on function public.audit_operational_expense_change() from public, anon, authenticated;
revoke all on function public.set_expense_recurrence_updated_at() from public, anon, authenticated;
grant execute on function public.generate_due_recurring_expenses(date) to authenticated, service_role;
grant execute on function public.pay_operational_expense(uuid, text, text, timestamptz) to authenticated, service_role;
grant execute on function public.cancel_operational_expense(uuid, text) to authenticated, service_role;
grant execute on function public.generate_due_recurring_expenses_internal(date) to service_role;

select cron.unschedule('generate-recurring-expenses-daily')
where exists (select 1 from cron.job where jobname = 'generate-recurring-expenses-daily');
select cron.schedule(
  'generate-recurring-expenses-daily',
  '15 3 * * *',
  $cron$select public.generate_due_recurring_expenses_internal(current_date + 45);$cron$
);

comment on table public.expense_recurrence_rules is 'Rules that generate pending operational expenses without duplicates.';
comment on table public.operational_expense_audit is 'Immutable audit history for accounts payable actions.';
