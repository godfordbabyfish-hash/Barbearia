create index if not exists expense_recurrence_rules_created_by_idx
  on public.expense_recurrence_rules (created_by);

create index if not exists operational_expenses_created_by_idx
  on public.operational_expenses (created_by);
