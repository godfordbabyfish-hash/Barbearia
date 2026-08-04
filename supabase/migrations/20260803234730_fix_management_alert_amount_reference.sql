-- Qualify the expense amount because it shares a name with the function output column.
do $$
declare
  v_definition text;
begin
  select pg_get_functiondef(routine.oid)
  into v_definition
  from pg_proc routine
  join pg_namespace namespace on namespace.oid = routine.pronamespace
  where namespace.nspname = 'public'
    and routine.proname = 'get_management_alerts'
    and pg_get_function_identity_arguments(routine.oid) = 'p_include_handled boolean';

  if v_definition is null then
    raise exception 'Function public.get_management_alerts(boolean) was not found.';
  end if;

  v_definition := replace(
    v_definition,
    $replacement$to_char(sum(amount), 'FM999G999G990D00')$replacement$,
    $replacement$to_char(sum(overdue.amount), 'FM999G999G990D00')$replacement$
  );
  v_definition := replace(
    v_definition,
    $replacement$count(*), sum(amount), 'financial', 'Ver contas a pagar', max(updated_at)
    from overdue_expenses having count(*) > 0$replacement$,
    $replacement$count(*), sum(overdue.amount), 'financial', 'Ver contas a pagar', max(overdue.updated_at)
    from overdue_expenses overdue having count(*) > 0$replacement$
  );
  execute v_definition;
end;
$$;
