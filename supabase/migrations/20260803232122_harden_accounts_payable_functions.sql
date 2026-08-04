create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.generate_due_recurring_expenses(p_until date default (current_date + 45))
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
  if (select auth.uid()) is not null and not (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'gestor')
  ) then raise exception 'Acesso negado'; end if;

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

revoke all on function private.generate_due_recurring_expenses(date) from public, anon;
grant execute on function private.generate_due_recurring_expenses(date) to authenticated, service_role;

create or replace function public.generate_due_recurring_expenses(p_until date default (current_date + 45))
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (
    public.has_role((select auth.uid()), 'admin')
    or public.has_role((select auth.uid()), 'gestor')
  ) then raise exception 'Acesso negado'; end if;
  return private.generate_due_recurring_expenses(p_until);
end;
$$;

alter function public.pay_operational_expense(uuid, text, text, timestamptz) security invoker;
alter function public.cancel_operational_expense(uuid, text) security invoker;

select cron.unschedule('generate-recurring-expenses-daily')
where exists (select 1 from cron.job where jobname = 'generate-recurring-expenses-daily');
select cron.schedule(
  'generate-recurring-expenses-daily',
  '15 3 * * *',
  $cron$select private.generate_due_recurring_expenses(current_date + 45);$cron$
);

drop function if exists public.generate_due_recurring_expenses_internal(date);
