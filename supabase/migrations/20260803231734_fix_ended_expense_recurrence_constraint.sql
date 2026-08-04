alter table public.expense_recurrence_rules
  drop constraint if exists expense_recurrence_end_after_next;

alter table public.expense_recurrence_rules
  add constraint expense_recurrence_end_after_next
  check (end_date is null or not active or end_date >= next_due_date);
